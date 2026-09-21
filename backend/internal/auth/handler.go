package auth

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/mail"
	"regexp"
	"strings"
	"time"
	"unicode"
)

const maxBodyBytes = 1 << 20

var pincodePattern = regexp.MustCompile(`^[0-9]{6}$`)

type Handler struct {
	logger *slog.Logger
	store  *Store
	tokens tokenSigner
	google googleVerifier
}

// NewHandler builds the auth endpoints. store may be nil, in which case they answer 503.
func NewHandler(logger *slog.Logger, store *Store, secret, googleClientID string) *Handler {
	return &Handler{
		logger: logger,
		store:  store,
		tokens: tokenSigner{secret: []byte(secret)},
		google: newGoogleVerifier(googleClientID),
	}
}

func (h *Handler) Routes(mux *http.ServeMux) {
	mux.HandleFunc("/api/v1/auth/register", h.method(http.MethodPost, h.register))
	mux.HandleFunc("/api/v1/auth/login", h.method(http.MethodPost, h.login))
	mux.HandleFunc("/api/v1/auth/google", h.method(http.MethodPost, h.googleLogin))
	mux.HandleFunc("/api/v1/auth/me", h.method(http.MethodGet, h.me))
}

type sessionResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type registerRequest struct {
	FullName string `json:"fullName"`
	Mobile   string `json:"mobile"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Address  string `json:"address"`
	State    string `json:"state"`
	City     string `json:"city"`
	Pincode  string `json:"pincode"`
	GST      string `json:"gst"`
}

type loginRequest struct {
	Identity string `json:"identity"`
	Password string `json:"password"`
}

type googleRequest struct {
	Credential string `json:"credential"`
}

func (h *Handler) register(w http.ResponseWriter, r *http.Request) {
	var body registerRequest
	if !decodeBody(w, r, &body) {
		return
	}

	input := RegisterInput{
		FullName: strings.TrimSpace(body.FullName),
		Mobile:   normalizeMobile(body.Mobile),
		Email:    normalizeEmail(body.Email),
		Password: body.Password,
		Address:  strings.TrimSpace(body.Address),
		State:    strings.TrimSpace(body.State),
		City:     strings.TrimSpace(body.City),
		Pincode:  strings.TrimSpace(body.Pincode),
		GST:      strings.ToUpper(strings.TrimSpace(body.GST)),
	}

	if message := validateRegistration(input); message != "" {
		writeError(w, http.StatusBadRequest, message)
		return
	}

	passwordHash, err := hashPassword(input.Password)
	if err != nil {
		h.fail(w, "hash password", err)
		return
	}

	user, err := h.store.Register(r.Context(), input, passwordHash)
	if err != nil {
		h.writeStoreError(w, "register", err)
		return
	}

	h.writeSession(w, http.StatusCreated, user)
}

func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	var body loginRequest
	if !decodeBody(w, r, &body) {
		return
	}

	identity := strings.TrimSpace(body.Identity)
	if strings.Contains(identity, "@") {
		identity = normalizeEmail(identity)
	} else {
		identity = normalizeMobile(identity)
	}

	if identity == "" || body.Password == "" {
		writeError(w, http.StatusBadRequest, "Enter your email or mobile and password.")
		return
	}

	user, err := h.store.Authenticate(r.Context(), identity, body.Password)
	if err != nil {
		h.writeStoreError(w, "login", err)
		return
	}

	h.writeSession(w, http.StatusOK, user)
}

func (h *Handler) googleLogin(w http.ResponseWriter, r *http.Request) {
	var body googleRequest
	if !decodeBody(w, r, &body) {
		return
	}

	if strings.TrimSpace(body.Credential) == "" {
		writeError(w, http.StatusBadRequest, "Missing Google credential.")
		return
	}

	profile, err := h.google.verify(r.Context(), body.Credential)
	if err != nil {
		if errors.Is(err, errInvalidGoogleToken) {
			writeError(w, http.StatusUnauthorized, "Google sign-in could not be verified. Please try again.")
			return
		}

		h.fail(w, "verify google credential", err)
		return
	}

	user, err := h.store.LoginWithGoogle(r.Context(), profile)
	if err != nil {
		h.writeStoreError(w, "google login", err)
		return
	}

	h.writeSession(w, http.StatusOK, user)
}

func (h *Handler) me(w http.ResponseWriter, r *http.Request) {
	token, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
	if !ok {
		writeError(w, http.StatusUnauthorized, "Please sign in.")
		return
	}

	userID, err := h.tokens.verify(strings.TrimSpace(token), time.Now())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Your session has expired. Please sign in again.")
		return
	}

	user, err := h.store.FindByID(r.Context(), userID)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) || errors.Is(err, ErrInactive) {
			writeError(w, http.StatusUnauthorized, "Your session has expired. Please sign in again.")
			return
		}

		h.fail(w, "load session user", err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]User{"user": user})
}

// method rejects other HTTP methods and requests made while the database is not configured.
func (h *Handler) method(allowed string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != allowed {
			w.Header().Set("Allow", allowed)
			http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
			return
		}

		if h.store == nil {
			writeError(w, http.StatusServiceUnavailable, "Accounts are temporarily unavailable.")
			return
		}

		next(w, r)
	}
}

func (h *Handler) writeSession(w http.ResponseWriter, status int, user User) {
	token, err := h.tokens.issue(user.ID, time.Now())
	if err != nil {
		h.fail(w, "issue token", err)
		return
	}

	writeJSON(w, status, sessionResponse{Token: token, User: user})
}

func (h *Handler) writeStoreError(w http.ResponseWriter, action string, err error) {
	switch {
	case errors.Is(err, ErrInvalidCredentials):
		writeError(w, http.StatusUnauthorized, "Incorrect email/mobile or password.")
	case errors.Is(err, ErrGoogleOnly):
		writeError(w, http.StatusConflict, "This account was created with Google. Please use Continue with Google.")
	case errors.Is(err, ErrInactive):
		writeError(w, http.StatusForbidden, "This account is inactive. Please contact support.")
	case errors.Is(err, ErrEmailTaken):
		writeError(w, http.StatusConflict, "An account with this email already exists. Please log in.")
	case errors.Is(err, ErrMobileTaken):
		writeError(w, http.StatusConflict, "An account with this mobile number already exists. Please log in.")
	case errors.Is(err, ErrEmailNotVerified):
		writeError(w, http.StatusUnauthorized, "Your Google email is not verified.")
	default:
		h.fail(w, action, err)
	}
}

func (h *Handler) fail(w http.ResponseWriter, action string, err error) {
	h.logger.Error("auth request failed", "action", action, "error", err.Error())
	writeError(w, http.StatusInternalServerError, "Something went wrong. Please try again.")
}

func validateRegistration(in RegisterInput) string {
	switch {
	case in.FullName == "":
		return "Enter your full name."
	case len(in.Mobile) != 10:
		return "Enter a valid 10 digit mobile number."
	case !validEmail(in.Email):
		return "Enter a valid email address."
	case in.Address == "" || in.State == "" || in.City == "":
		return "Enter your delivery address, state and city."
	case !pincodePattern.MatchString(in.Pincode):
		return "Enter a valid 6 digit pincode."
	case len(in.Password) < 8:
		return "Password must be at least 8 characters."
	case len(in.Password) > 128:
		return "Password must be at most 128 characters."
	case in.GST != "" && len(in.GST) != 15:
		return "GST number must be 15 characters."
	}

	return ""
}

func validEmail(email string) bool {
	address, err := mail.ParseAddress(email)
	return err == nil && address.Address == email
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

// normalizeMobile keeps the last 10 digits of an Indian number, so
// "+91 98765-43210", "09876543210" and "9876543210" all match.
func normalizeMobile(mobile string) string {
	var digits strings.Builder
	for _, char := range mobile {
		if unicode.IsDigit(char) {
			digits.WriteRune(char)
		}
	}

	number := digits.String()
	if len(number) > 10 && (strings.HasPrefix(number, "91") || strings.HasPrefix(number, "0")) {
		number = number[len(number)-10:]
	}

	return number
}

func decodeBody(w http.ResponseWriter, r *http.Request, target any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	if err := json.NewDecoder(r.Body).Decode(target); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body.")
		return false
	}

	return true
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
