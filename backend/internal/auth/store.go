package auth

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	AuthTypeNormal = "normal"
	AuthTypeGoogle = "google"
	AuthTypeBoth   = "both"

	roleCustomer = "customer"

	// RoleAdmin is the users.role value that may use the admin API. Set it in the database:
	//   UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
	RoleAdmin = "admin"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrGoogleOnly         = errors.New("account uses google sign-in")
	ErrInactive           = errors.New("account is inactive")
	ErrEmailTaken         = errors.New("email already registered")
	ErrMobileTaken        = errors.New("mobile already registered")
	ErrEmailNotVerified   = errors.New("google email is not verified")
	ErrUserNotFound       = errors.New("user not found")
)

type Store struct {
	pool *pgxpool.Pool
}

type User struct {
	ID        int64  `json:"id"`
	FullName  string `json:"fullName"`
	Email     string `json:"email"`
	Mobile    string `json:"mobile"`
	AuthType  string `json:"authType"`
	AvatarURL string `json:"avatarUrl"`
	Role      string `json:"role"`
}

type RegisterInput struct {
	FullName string
	Mobile   string
	Email    string
	Password string
	Address  string
	State    string
	City     string
	Pincode  string
	GST      string
}

const userColumns = `
	id,
	COALESCE(full_name, ''),
	COALESCE(email, ''),
	COALESCE(mobile, ''),
	COALESCE(password_hash, ''),
	COALESCE(auth_type, 'normal'),
	COALESCE(avatar_url, ''),
	COALESCE(role, 'customer'),
	COALESCE(is_active, TRUE)`

// userRecord is a users row including the password hash, which never leaves this package.
type userRecord struct {
	User
	passwordHash string
	isActive     bool
}

func scanUser(row pgx.Row) (userRecord, error) {
	var record userRecord
	err := row.Scan(
		&record.ID,
		&record.FullName,
		&record.Email,
		&record.Mobile,
		&record.passwordHash,
		&record.AuthType,
		&record.AvatarURL,
		&record.Role,
		&record.isActive,
	)
	return record, err
}

func NewStore(ctx context.Context, databaseURL string) (*Store, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("create pg pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping pg: %w", err)
	}

	return &Store{pool: pool}, nil
}

func (s *Store) Close() {
	if s == nil || s.pool == nil {
		return
	}

	s.pool.Close()
}

func (s *Store) FindByID(ctx context.Context, id int64) (User, error) {
	record, err := scanUser(s.pool.QueryRow(ctx, `SELECT `+userColumns+` FROM users WHERE id = $1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrUserNotFound
	}
	if err != nil {
		return User{}, fmt.Errorf("find user: %w", err)
	}
	if !record.isActive {
		return User{}, ErrInactive
	}

	return record.User, nil
}

// Register creates a normal (email + password) account together with its default address.
func (s *Store) Register(ctx context.Context, input RegisterInput, passwordHash string) (User, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return User{}, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	existing, err := scanUser(tx.QueryRow(ctx, `SELECT `+userColumns+` FROM users WHERE LOWER(email) = $1`, input.Email))
	switch {
	case err == nil && existing.passwordHash == "":
		return User{}, ErrGoogleOnly
	case err == nil:
		return User{}, ErrEmailTaken
	case !errors.Is(err, pgx.ErrNoRows):
		return User{}, fmt.Errorf("check email: %w", err)
	}

	var userID int64
	err = tx.QueryRow(ctx, `
		INSERT INTO users (
			full_name, mobile, email, password_hash, role, is_active,
			email_verified, mobile_verified, auth_type, gst_number, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, TRUE, FALSE, FALSE, $6, NULLIF($7, ''), NOW(), NOW())
		RETURNING id
	`, input.FullName, input.Mobile, input.Email, passwordHash, roleCustomer, AuthTypeNormal, input.GST).Scan(&userID)
	if err != nil {
		return User{}, mapUniqueViolation(err, "insert user")
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO user_addresses (
			user_id, full_name, mobile, address_line1, city, state, pincode,
			country, is_default, address_type, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, 'India', TRUE, 'home', NOW(), NOW())
	`, userID, input.FullName, input.Mobile, input.Address, input.City, input.State, input.Pincode)
	if err != nil {
		return User{}, fmt.Errorf("insert address: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return User{}, fmt.Errorf("commit tx: %w", err)
	}

	return User{
		ID:       userID,
		FullName: input.FullName,
		Email:    input.Email,
		Mobile:   input.Mobile,
		AuthType: AuthTypeNormal,
		Role:     roleCustomer,
	}, nil
}

// Authenticate checks an email-or-mobile identity and password.
func (s *Store) Authenticate(ctx context.Context, identity, password string) (User, error) {
	record, err := scanUser(s.pool.QueryRow(ctx, `
		SELECT `+userColumns+`
		FROM users
		WHERE LOWER(email) = $1 OR mobile = $1
		LIMIT 1
	`, identity))
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrInvalidCredentials
	}
	if err != nil {
		return User{}, fmt.Errorf("find user: %w", err)
	}

	if record.passwordHash == "" {
		return User{}, ErrGoogleOnly
	}
	if !verifyPassword(password, record.passwordHash) {
		return User{}, ErrInvalidCredentials
	}
	if !record.isActive {
		return User{}, ErrInactive
	}

	return record.User, nil
}

// LoginWithGoogle signs in, or creates, the account for a verified Google profile.
// An existing account with the same email is linked instead of duplicated, so a
// customer reaches the same account with either password or Google.
func (s *Store) LoginWithGoogle(ctx context.Context, profile googleProfile) (User, error) {
	if !profile.EmailVerified {
		return User{}, ErrEmailNotVerified
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return User{}, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	record, err := scanUser(tx.QueryRow(ctx, `
		SELECT `+userColumns+`
		FROM users
		WHERE google_id = $1 OR LOWER(email) = $2
		ORDER BY (google_id = $1) DESC NULLS LAST
		LIMIT 1
		FOR UPDATE
	`, profile.Subject, profile.Email))

	switch {
	case errors.Is(err, pgx.ErrNoRows):
		record, err = s.createGoogleUser(ctx, tx, profile)
		if err != nil {
			return User{}, err
		}
	case err != nil:
		return User{}, fmt.Errorf("find google user: %w", err)
	default:
		if !record.isActive {
			return User{}, ErrInactive
		}

		authType := AuthTypeGoogle
		if record.passwordHash != "" {
			authType = AuthTypeBoth
		}

		_, err = tx.Exec(ctx, `
			UPDATE users
			SET
				google_id = $2,
				auth_type = $3,
				email_verified = TRUE,
				avatar_url = COALESCE(NULLIF(avatar_url, ''), $4),
				updated_at = NOW()
			WHERE id = $1
		`, record.ID, profile.Subject, authType, profile.Picture)
		if err != nil {
			return User{}, mapUniqueViolation(err, "link google account")
		}

		record.AuthType = authType
		if record.AvatarURL == "" {
			record.AvatarURL = profile.Picture
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return User{}, fmt.Errorf("commit tx: %w", err)
	}

	return record.User, nil
}

func (s *Store) createGoogleUser(ctx context.Context, tx pgx.Tx, profile googleProfile) (userRecord, error) {
	name := profile.Name
	if name == "" {
		name = profile.Email
	}

	var userID int64
	err := tx.QueryRow(ctx, `
		INSERT INTO users (
			full_name, email, role, is_active, email_verified, mobile_verified,
			auth_type, google_id, avatar_url, created_at, updated_at
		)
		VALUES ($1, $2, $3, TRUE, TRUE, FALSE, $4, $5, NULLIF($6, ''), NOW(), NOW())
		RETURNING id
	`, name, profile.Email, roleCustomer, AuthTypeGoogle, profile.Subject, profile.Picture).Scan(&userID)
	if err != nil {
		return userRecord{}, mapUniqueViolation(err, "insert google user")
	}

	return userRecord{
		User: User{
			ID:        userID,
			FullName:  name,
			Email:     profile.Email,
			AuthType:  AuthTypeGoogle,
			AvatarURL: profile.Picture,
			Role:      roleCustomer,
		},
		isActive: true,
	}, nil
}

func mapUniqueViolation(err error, action string) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		switch pgErr.ConstraintName {
		case "users_mobile_key":
			return ErrMobileTaken
		case "users_email_lower_key", "users_google_id_key":
			return ErrEmailTaken
		}
	}

	return fmt.Errorf("%s: %w", action, err)
}
