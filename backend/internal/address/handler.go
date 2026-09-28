package address

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"shopping-app/backend/internal/auth"
)

const maxBodyBytes = 1 << 20

var pincodePattern = regexp.MustCompile(`^[0-9]{6}$`)

type Handler struct {
	logger *slog.Logger
	store  *Store
	auth   *auth.Handler
}

// NewHandler builds the address endpoints. store may be nil, in which case they answer 503.
func NewHandler(logger *slog.Logger, store *Store, authHandler *auth.Handler) *Handler {
	return &Handler{logger: logger, store: store, auth: authHandler}
}

func (h *Handler) Routes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/account/addresses", h.auth.RequireAuth(h.list))
	mux.HandleFunc("POST /api/v1/account/addresses", h.auth.RequireAuth(h.create))
	mux.HandleFunc("PUT /api/v1/account/addresses/{id}", h.auth.RequireAuth(h.update))
	mux.HandleFunc("DELETE /api/v1/account/addresses/{id}", h.auth.RequireAuth(h.delete))
	mux.HandleFunc("PUT /api/v1/account/addresses/{id}/default", h.auth.RequireAuth(h.setDefault))
}

type itemsResponse struct {
	Items []Address `json:"items"`
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request, user auth.User) {
	if !h.requireStore(w) {
		return
	}

	addresses, err := h.store.List(r.Context(), user.ID)
	if err != nil {
		h.fail(w, "list addresses", err)
		return
	}

	writeJSON(w, http.StatusOK, itemsResponse{Items: addresses})
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request, user auth.User) {
	if !h.requireStore(w) {
		return
	}

	var body Address
	if !decodeBody(w, r, &body) {
		return
	}

	body = normalize(body)
	if message := validate(body); message != "" {
		writeError(w, http.StatusBadRequest, message)
		return
	}

	saved, err := h.store.Create(r.Context(), user.ID, body)
	if err != nil {
		h.fail(w, "create address", err)
		return
	}

	writeJSON(w, http.StatusCreated, saved)
}

func (h *Handler) update(w http.ResponseWriter, r *http.Request, user auth.User) {
	if !h.requireStore(w) {
		return
	}

	addressID, ok := h.parseID(w, r)
	if !ok {
		return
	}

	var body Address
	if !decodeBody(w, r, &body) {
		return
	}

	body = normalize(body)
	if message := validate(body); message != "" {
		writeError(w, http.StatusBadRequest, message)
		return
	}

	saved, err := h.store.Update(r.Context(), user.ID, addressID, body)
	if err != nil {
		h.writeStoreError(w, "update address", err)
		return
	}

	writeJSON(w, http.StatusOK, saved)
}

func (h *Handler) delete(w http.ResponseWriter, r *http.Request, user auth.User) {
	if !h.requireStore(w) {
		return
	}

	addressID, ok := h.parseID(w, r)
	if !ok {
		return
	}

	if err := h.store.Delete(r.Context(), user.ID, addressID); err != nil {
		h.writeStoreError(w, "delete address", err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) setDefault(w http.ResponseWriter, r *http.Request, user auth.User) {
	if !h.requireStore(w) {
		return
	}

	addressID, ok := h.parseID(w, r)
	if !ok {
		return
	}

	saved, err := h.store.SetDefault(r.Context(), user.ID, addressID)
	if err != nil {
		h.writeStoreError(w, "set default address", err)
		return
	}

	writeJSON(w, http.StatusOK, saved)
}

func (h *Handler) parseID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid address id.")
		return 0, false
	}

	return id, true
}

func normalize(in Address) Address {
	in.FullName = strings.TrimSpace(in.FullName)
	in.Mobile = strings.TrimSpace(in.Mobile)
	in.AddressLine1 = strings.TrimSpace(in.AddressLine1)
	in.City = strings.TrimSpace(in.City)
	in.State = strings.TrimSpace(in.State)
	in.Pincode = strings.TrimSpace(in.Pincode)

	return in
}

func validate(in Address) string {
	switch {
	case in.FullName == "":
		return "Enter your full name."
	case len(in.Mobile) != 10:
		return "Enter a valid 10 digit mobile number."
	case in.AddressLine1 == "" || in.State == "" || in.City == "":
		return "Enter your delivery address, state and city."
	case !pincodePattern.MatchString(in.Pincode):
		return "Enter a valid 6 digit pincode."
	}

	return ""
}

func (h *Handler) writeStoreError(w http.ResponseWriter, action string, err error) {
	if errors.Is(err, ErrNotFound) {
		writeError(w, http.StatusNotFound, "That address could not be found.")
		return
	}

	h.fail(w, action, err)
}

func (h *Handler) requireStore(w http.ResponseWriter) bool {
	if h.store == nil {
		writeError(w, http.StatusServiceUnavailable, "Addresses are temporarily unavailable.")
		return false
	}

	return true
}

func (h *Handler) fail(w http.ResponseWriter, action string, err error) {
	h.logger.Error("address request failed", "action", action, "error", err.Error())
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
