package dbadmin

import (
	"context"
	_ "embed"
	"encoding/json"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5/pgconn"

	"shopping-app/backend/internal/auth"
)

//go:embed page.html
var page []byte

// maxQueryBytes limits the body of a SQL tab request.
const maxQueryBytes = 64 << 10

type Handler struct {
	logger   *slog.Logger
	store    *Store
	auth     *auth.Handler
	sessions *sessions
}

// NewHandler wires the browser. secret signs its login tokens (the server's AUTH_SECRET).
func NewHandler(logger *slog.Logger, store *Store, authHandler *auth.Handler, creds Credentials, secret string) *Handler {
	return &Handler{logger: logger, store: store, auth: authHandler, sessions: newSessions(creds, secret)}
}

// Routes serves the page to anyone (it is only a sign-in form until the browser holds a token)
// and the data endpoints only to the DB_ADMIN_USER login or a shop account whose role is admin.
func (h *Handler) Routes(mux *http.ServeMux) {
	mux.HandleFunc("GET /db-admin", h.page)
	mux.HandleFunc("GET /db-admin/", h.page)
	mux.HandleFunc("POST /api/v1/admin/db/login", h.login)
	mux.Handle("GET /api/v1/admin/db/tables", h.admin(h.tables))
	mux.Handle("GET /api/v1/admin/db/tables/{table}", h.admin(h.browse))
	mux.Handle("GET /api/v1/admin/db/tables/{table}/columns", h.admin(h.columns))
	mux.Handle("POST /api/v1/admin/db/query", h.admin(h.query))
}

func (h *Handler) admin(next http.HandlerFunc) http.Handler {
	withStore := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if h.store == nil {
			writeError(w, http.StatusServiceUnavailable, "The database is not configured.")
			return
		}
		next(w, r)
	})
	shopAdmin := h.auth.RequireRole(auth.RoleAdmin, withStore)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token, _ := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
		if h.sessions.valid(token) {
			withStore(w, r)
			return
		}
		shopAdmin.ServeHTTP(w, r)
	})
}

func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	if !h.sessions.enabled() {
		writeError(w, http.StatusServiceUnavailable, "This login is turned off. Set DB_ADMIN_PASSWORD on the server.")
		return
	}

	addr := clientAddr(r)
	if h.sessions.blocked(addr) {
		writeError(w, http.StatusTooManyRequests, "Too many failed attempts. Try again in 15 minutes.")
		return
	}

	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Enter a username and password.")
		return
	}

	if !h.sessions.check(strings.TrimSpace(body.Username), body.Password) {
		h.sessions.fail(addr)
		h.logger.Warn("db admin login failed", "addr", addr)
		writeError(w, http.StatusUnauthorized, "Incorrect username or password.")
		return
	}

	h.sessions.succeed(addr)
	token, expires := h.sessions.issue()
	writeJSON(w, http.StatusOK, map[string]any{
		"token":     token,
		"user":      map[string]string{"username": h.sessions.creds.User},
		"expiresAt": expires.UTC().Format("2006-01-02T15:04:05Z"),
	})
}

// clientAddr names the caller for counting failed logins. Behind a proxy such as Render's, the
// last X-Forwarded-For entry is the one the proxy added, so a client cannot choose it.
func clientAddr(r *http.Request) string {
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		parts := strings.Split(forwarded, ",")
		return strings.TrimSpace(parts[len(parts)-1])
	}
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		return host
	}
	return r.RemoteAddr
}

func (h *Handler) page(w http.ResponseWriter, r *http.Request) {
	header := w.Header()
	header.Set("Content-Type", "text/html; charset=utf-8")
	header.Set("Cache-Control", "no-store")
	header.Set("X-Frame-Options", "DENY")
	header.Set("X-Content-Type-Options", "nosniff")
	header.Set("Referrer-Policy", "no-referrer")
	header.Set("Content-Security-Policy",
		"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
	_, _ = w.Write(page)
}

func (h *Handler) tables(w http.ResponseWriter, r *http.Request) {
	tables, err := h.store.Tables(r.Context())
	if err != nil {
		h.fail(w, "list tables", err)
		return
	}
	if tables == nil {
		tables = []Table{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"tables": tables})
}

func (h *Handler) columns(w http.ResponseWriter, r *http.Request) {
	columns, err := h.store.Columns(r.Context(), r.PathValue("table"))
	if err != nil {
		h.fail(w, "describe table", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"table": r.PathValue("table"), "columns": columns})
}

func (h *Handler) browse(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	perPage, err := strconv.Atoi(q.Get("perPage"))
	if err != nil {
		perPage = 25
	}

	result, err := h.store.Browse(r.Context(), r.PathValue("table"), BrowseOptions{
		Page:    page,
		PerPage: perPage,
		Sort:    q.Get("sort"),
		Desc:    q.Get("dir") == "desc",
		Search:  q.Get("search"),
	})
	if err != nil {
		h.fail(w, "browse table", err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) query(w http.ResponseWriter, r *http.Request) {
	var body struct {
		SQL string `json:"sql"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxQueryBytes)).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Send the query as JSON: {\"sql\": \"...\"}.")
		return
	}
	if strings.TrimSpace(body.SQL) == "" {
		writeError(w, http.StatusBadRequest, "Enter a query.")
		return
	}

	result, err := h.store.Query(r.Context(), body.SQL)
	if err != nil {
		h.fail(w, "run query", err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

// fail turns errors into messages an admin can act on. Database errors (bad SQL, read-only
// violations, timeouts) are shown as Postgres reports them; anything else is logged and hidden.
func (h *Handler) fail(w http.ResponseWriter, action string, err error) {
	var pgErr *pgconn.PgError
	switch {
	case errors.Is(err, ErrTableNotFound):
		writeError(w, http.StatusNotFound, "That table does not exist.")
	case errors.As(err, &pgErr):
		message := pgErr.Message
		switch pgErr.Code {
		case "25006":
			message = "This page is read-only, so only queries that read data can run."
		case "57014":
			message = "The query took longer than " + queryTimeout + " and was stopped."
		}
		writeError(w, http.StatusBadRequest, message)
	case errors.Is(err, context.Canceled):
		// The browser went away; nobody is waiting for an answer.
	default:
		h.logger.Error("db admin failed", "action", action, "error", err.Error())
		writeError(w, http.StatusInternalServerError, "The database could not be read. Try again in a moment.")
	}
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
