package storefront

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

type Handler struct {
	logger *slog.Logger
	store  *Store
}

// NewHandler builds the public endpoints. store may be nil, in which case they answer 503.
func NewHandler(logger *slog.Logger, store *Store) *Handler {
	return &Handler{logger: logger, store: store}
}

func (h *Handler) Routes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/storefront", h.serve(h.bundle))
	mux.HandleFunc("GET /api/v1/categories", h.serve(h.categories))
	mux.HandleFunc("GET /api/v1/products", h.serve(h.products))
	mux.HandleFunc("GET /api/v1/products/{slug}", h.serve(h.product))
}

type bundleFunc func(w http.ResponseWriter, r *http.Request, bundle Bundle)

// serve loads the current content once and hands it to the endpoint.
func (h *Handler) serve(next bundleFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if h.store == nil {
			writeError(w, http.StatusServiceUnavailable, "database is not configured")
			return
		}

		bundle, err := h.store.Load(r.Context())
		if err != nil {
			h.logger.Error("load storefront failed", "error", err.Error())
			writeError(w, http.StatusInternalServerError, "failed to load storefront")
			return
		}

		next(w, r, bundle)
	}
}

func (h *Handler) bundle(w http.ResponseWriter, _ *http.Request, bundle Bundle) {
	writeJSON(w, http.StatusOK, bundle)
}

func (h *Handler) categories(w http.ResponseWriter, _ *http.Request, bundle Bundle) {
	writeJSON(w, http.StatusOK, map[string]any{"items": bundle.Categories})
}

// products lists active products, or only those in one collection with ?collection=traditional/sarees.
func (h *Handler) products(w http.ResponseWriter, r *http.Request, bundle Bundle) {
	items := bundle.Products

	if collection := r.URL.Query().Get("collection"); collection != "" {
		items = productsInCollection(bundle, "/collections/"+collection)
	}

	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) product(w http.ResponseWriter, r *http.Request, bundle Bundle) {
	slug := r.PathValue("slug")

	for _, product := range bundle.Products {
		if product.ID == slug {
			writeJSON(w, http.StatusOK, product)
			return
		}
	}

	writeError(w, http.StatusNotFound, "product not found")
}

func productsInCollection(bundle Bundle, path string) []Product {
	items := []Product{}

	for _, collection := range bundle.Collections {
		if collection.Path != path {
			continue
		}

		byID := map[string]Product{}
		for _, product := range bundle.Products {
			byID[product.ID] = product
		}
		for _, id := range collection.ProductIDs {
			items = append(items, byID[id])
		}
	}

	return items
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
