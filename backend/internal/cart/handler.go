package cart

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

// NewHandler builds the cart endpoints. store may be nil, in which case they answer 503.
func NewHandler(logger *slog.Logger, store *Store, authHandler *auth.Handler) *Handler {
	return &Handler{logger: logger, store: store, auth: authHandler}
}

func (h *Handler) Routes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/cart", h.auth.RequireAuth(h.list))
	mux.HandleFunc("POST /api/v1/cart/items", h.auth.RequireAuth(h.addItem))
	mux.HandleFunc("PUT /api/v1/cart/items/{productId}", h.auth.RequireAuth(h.updateItem))
	mux.HandleFunc("DELETE /api/v1/cart/items/{productId}", h.auth.RequireAuth(h.removeItem))
}

type itemsResponse struct {
	Items []Item `json:"items"`
}

type addItemRequest struct {
	ProductID string `json:"productId"`
	Quantity  int    `json:"quantity"`
}

type quantityRequest struct {
	Quantity int `json:"quantity"`
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request, user auth.User) {
	if !h.requireStore(w) {
		return
	}

	items, err := h.store.List(r.Context(), user.ID)
	if err != nil {
		h.fail(w, "list cart", err)
		return
	}

	writeJSON(w, http.StatusOK, itemsResponse{Items: items})
}

func (h *Handler) addItem(w http.ResponseWriter, r *http.Request, user auth.User) {
	if !h.requireStore(w) {
		return
	}

	var body addItemRequest
	if !decodeBody(w, r, &body) {
		return
	}

	productID := strings.TrimSpace(body.ProductID)
	if productID == "" {
		writeError(w, http.StatusBadRequest, "productId is required.")
		return
	}

	quantity := body.Quantity
	if quantity == 0 {
		quantity = 1
	}
	if quantity < 0 {
		writeError(w, http.StatusBadRequest, "quantity must be positive.")
		return
	}

	items, err := h.store.AddItem(r.Context(), user.ID, productID, quantity)
	h.respondWithItems(w, "add cart item", items, err)
}

func (h *Handler) updateItem(w http.ResponseWriter, r *http.Request, user auth.User) {
	if !h.requireStore(w) {
		return
	}

	var body quantityRequest
	if !decodeBody(w, r, &body) {
		return
	}

	productID := r.PathValue("productId")
	items, err := h.store.SetQuantity(r.Context(), user.ID, productID, body.Quantity)
	h.respondWithItems(w, "update cart item", items, err)
}

func (h *Handler) removeItem(w http.ResponseWriter, r *http.Request, user auth.User) {
	if !h.requireStore(w) {
		return
	}

	productID := r.PathValue("productId")
	items, err := h.store.RemoveItem(r.Context(), user.ID, productID)
	h.respondWithItems(w, "remove cart item", items, err)
}

func (h *Handler) respondWithItems(w http.ResponseWriter, action string, items []Item, err error) {
	if err != nil {
		if errors.Is(err, ErrProductNotFound) {
			writeError(w, http.StatusNotFound, "That product could not be found in your cart.")
			return
		}

		h.fail(w, action, err)
		return
	}

	writeJSON(w, http.StatusOK, itemsResponse{Items: items})
}

func (h *Handler) requireStore(w http.ResponseWriter) bool {
	if h.store == nil {
		writeError(w, http.StatusServiceUnavailable, "The cart is temporarily unavailable.")
		return false
	}

	return true
}

func (h *Handler) fail(w http.ResponseWriter, action string, err error) {
	h.logger.Error("cart request failed", "action", action, "error", err.Error())
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
