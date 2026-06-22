package httpapi

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"shopping-app/backend/internal/catalog"
	"shopping-app/backend/internal/health"
)

const serviceName = "shopping-app-backend"

type homeResponse struct {
	Message string `json:"message"`
	Service string `json:"service"`
}

type productListResponse struct {
	Category string            `json:"category"`
	Items    []catalog.Product `json:"items"`
}

func NewRouter(logger *slog.Logger) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", http.MethodGet)
			http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)

		_ = json.NewEncoder(w).Encode(homeResponse{
			Message: "Shopping App backend is running.",
			Service: serviceName,
		})
	})

	mux.Handle("/health", health.Handler(serviceName))
	mux.Handle("/api/v1/health", health.Handler(serviceName))
	mux.HandleFunc("/api/v1/products/men/t-shirts", menTShirtsHandler)

	return loggingMiddleware(logger, mux)
}

func menTShirtsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	_ = json.NewEncoder(w).Encode(productListResponse{
		Category: "men-t-shirts",
		Items:    catalog.MenTShirts(),
	})
}

func loggingMiddleware(logger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		startedAt := time.Now()
		next.ServeHTTP(w, r)

		logger.Info(
			"http request",
			"method", r.Method,
			"path", r.URL.Path,
			"duration", time.Since(startedAt).String(),
		)
	})
}
