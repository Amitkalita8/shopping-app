// Package address persists each customer's delivery addresses. A normal (email/password)
// registration collects one up front; a Google sign-in does not, so checkout asks for one there.
// A customer may save several and pick which to ship an order to.
package address

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrNotFound means the address does not exist, or does not belong to the requesting user.
var ErrNotFound = errors.New("address not found")

type Store struct {
	pool *pgxpool.Pool
}

type Address struct {
	ID           int64  `json:"id"`
	FullName     string `json:"fullName"`
	Mobile       string `json:"mobile"`
	AddressLine1 string `json:"addressLine1"`
	City         string `json:"city"`
	State        string `json:"state"`
	Pincode      string `json:"pincode"`
	Country      string `json:"country"`
	IsDefault    bool   `json:"isDefault"`
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

const addressColumns = `
	id,
	COALESCE(full_name, ''),
	COALESCE(mobile, ''),
	COALESCE(address_line1, ''),
	COALESCE(city, ''),
	COALESCE(state, ''),
	COALESCE(pincode, ''),
	COALESCE(country, 'India'),
	is_default`

// List returns every address the user has saved, default first, then most recently added.
func (s *Store) List(ctx context.Context, userID int64) ([]Address, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT `+addressColumns+`
		FROM user_addresses
		WHERE user_id = $1
		ORDER BY is_default DESC, created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("list addresses: %w", err)
	}
	defer rows.Close()

	addresses := []Address{}
	for rows.Next() {
		address, err := scanAddress(rows)
		if err != nil {
			return nil, fmt.Errorf("scan address: %w", err)
		}
		addresses = append(addresses, address)
	}

	return addresses, rows.Err()
}

// Get returns one address, scoped to the requesting user so no one can look up another
// shopper's address by guessing an id.
func (s *Store) Get(ctx context.Context, userID, addressID int64) (Address, error) {
	address, err := scanAddress(s.pool.QueryRow(ctx, `
		SELECT `+addressColumns+`
		FROM user_addresses
		WHERE id = $1 AND user_id = $2
	`, addressID, userID))
	if errors.Is(err, pgx.ErrNoRows) {
		return Address{}, ErrNotFound
	}
	if err != nil {
		return Address{}, fmt.Errorf("scan address: %w", err)
	}

	return address, nil
}

// GetDefault returns the user's default delivery address, or ErrNotFound when they have none yet.
func (s *Store) GetDefault(ctx context.Context, userID int64) (Address, error) {
	address, err := scanAddress(s.pool.QueryRow(ctx, `
		SELECT `+addressColumns+`
		FROM user_addresses
		WHERE user_id = $1 AND is_default = TRUE
	`, userID))
	if errors.Is(err, pgx.ErrNoRows) {
		return Address{}, ErrNotFound
	}
	if err != nil {
		return Address{}, fmt.Errorf("scan address: %w", err)
	}

	return address, nil
}

// Create saves a new address for the user. The first address a user saves becomes their default
// automatically; later ones are added alongside it until explicitly made the default.
func (s *Store) Create(ctx context.Context, userID int64, in Address) (Address, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Address{}, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var existing int
	if err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM user_addresses WHERE user_id = $1`, userID).Scan(&existing); err != nil {
		return Address{}, fmt.Errorf("count addresses: %w", err)
	}

	var id int64
	err = tx.QueryRow(ctx, `
		INSERT INTO user_addresses (
			user_id, full_name, mobile, address_line1, city, state, pincode,
			country, is_default, address_type, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, 'India', $8, 'home', NOW(), NOW())
		RETURNING id
	`, userID, in.FullName, in.Mobile, in.AddressLine1, in.City, in.State, in.Pincode, existing == 0).Scan(&id)
	if err != nil {
		return Address{}, fmt.Errorf("insert address: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return Address{}, fmt.Errorf("commit tx: %w", err)
	}

	return s.Get(ctx, userID, id)
}

// Update replaces the details of one of the user's addresses.
func (s *Store) Update(ctx context.Context, userID, addressID int64, in Address) (Address, error) {
	tag, err := s.pool.Exec(ctx, `
		UPDATE user_addresses
		SET full_name = $3, mobile = $4, address_line1 = $5, city = $6, state = $7, pincode = $8, updated_at = NOW()
		WHERE id = $1 AND user_id = $2
	`, addressID, userID, in.FullName, in.Mobile, in.AddressLine1, in.City, in.State, in.Pincode)
	if err != nil {
		return Address{}, fmt.Errorf("update address: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return Address{}, ErrNotFound
	}

	return s.Get(ctx, userID, addressID)
}

// SetDefault makes one address the user's default, replacing whichever one held that spot.
func (s *Store) SetDefault(ctx context.Context, userID, addressID int64) (Address, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Address{}, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1 AND is_default = TRUE`, userID); err != nil {
		return Address{}, fmt.Errorf("clear default: %w", err)
	}

	tag, err := tx.Exec(ctx, `
		UPDATE user_addresses SET is_default = TRUE, updated_at = NOW()
		WHERE id = $1 AND user_id = $2
	`, addressID, userID)
	if err != nil {
		return Address{}, fmt.Errorf("set default: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return Address{}, ErrNotFound
	}

	if err := tx.Commit(ctx); err != nil {
		return Address{}, fmt.Errorf("commit tx: %w", err)
	}

	return s.Get(ctx, userID, addressID)
}

// Delete removes an address. If it was the default and other addresses remain, the most recently
// added one becomes the new default, so checkout always has one to fall back to.
func (s *Store) Delete(ctx context.Context, userID, addressID int64) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var wasDefault bool
	err = tx.QueryRow(ctx, `
		DELETE FROM user_addresses WHERE id = $1 AND user_id = $2 RETURNING is_default
	`, addressID, userID).Scan(&wasDefault)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return fmt.Errorf("delete address: %w", err)
	}

	if wasDefault {
		if _, err := tx.Exec(ctx, `
			UPDATE user_addresses SET is_default = TRUE
			WHERE id = (
				SELECT id FROM user_addresses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1
			)
		`, userID); err != nil {
			return fmt.Errorf("promote next default: %w", err)
		}
	}

	return tx.Commit(ctx)
}

func scanAddress(row pgx.Row) (Address, error) {
	var a Address
	err := row.Scan(&a.ID, &a.FullName, &a.Mobile, &a.AddressLine1, &a.City, &a.State, &a.Pincode, &a.Country, &a.IsDefault)
	return a, err
}
