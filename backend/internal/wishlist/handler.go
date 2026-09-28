package wishlist

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"shopping-app/backend/internal/auth"
)

const maxBodyBytes = 1 << 20

type Handler struct {
	logger *slog.Logger
	store  *Store
	auth   *auth.Handler
}

// NewHandler builds the wishlist endpoints. store may be nil, in which case they answer 503.
func NewHandler(logger *slog.Logger, store *Store, authHandler *auth.Handler) *Handler {
	return &Handler{logger: logger, store: store, auth: authHandler}
}

func (h *Handler) Routes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/wishlist", h.auth.RequireAuth(h.list))
	mux.HandleFunc("POST /api/v1/wishlist", h.auth.RequireAuth(h.add))
	mux.HandleFunc("DELETE /api/v1/wishlist/{productId}", h.auth.RequireAuth(h.remove))
}

type itemsResponse struct {
	Items []string `json:"items"`
}

type addRequest struct {
	ProductID string `json:"productId"`
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request, user auth.User) {
	if !h.requireStore(w) {
		return
	}

	items, err := h.store.List(r.Context(), user.ID)
	if err != nil {
		h.fail(w, "list wishlist", err)
		return
	}

	writeJSON(w, http.StatusOK, itemsResponse{Items: items})
}

func (h *Handler) add(w http.ResponseWriter, r *http.Request, user auth.User) {
	if !h.requireStore(w) {
		return
	}

	var body addRequest
	if !decodeBody(w, r, &body) {
		return
	}

	productID := strings.TrimSpace(body.ProductID)
	if productID == "" {
		writeError(w, http.StatusBadRequest, "productId is required.")
		return
	}

	items, err := h.store.Add(r.Context(), user.ID, productID)
	h.respondWithItems(w, "add wishlist item", items, err)
}

func (h *Handler) remove(w http.ResponseWriter, r *http.Request, user auth.User) {
	if !h.requireStore(w) {
		return
	}

	productID := r.PathValue("productId")
	items, err := h.store.Remove(r.Context(), user.ID, productID)
	h.respondWithItems(w, "remove wishlist item", items, err)
}

func (h *Handler) respondWithItems(w http.ResponseWriter, action string, items []string, err error) {
	if err != nil {
		if errors.Is(err, ErrProductNotFound) {
			writeError(w, http.StatusNotFound, "That product could not be found.")
			return
		}

		h.fail(w, action, err)
		return
	}

	writeJSON(w, http.StatusOK, itemsResponse{Items: items})
}

func (h *Handler) requireStore(w http.ResponseWriter) bool {
	if h.store == nil {
		writeError(w, http.StatusServiceUnavailable, "The wishlist is temporarily unavailable.")
		return false
	}

	return true
}

func (h *Handler) fail(w http.ResponseWriter, action string, err error) {
	h.logger.Error("wishlist request failed", "action", action, "error", err.Error())
	writeError(w, http.StatusInternalServerError, "Something went wrong. Please try again.")
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
