package httpapi

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"shopping-app/backend/internal/admin"
	"shopping-app/backend/internal/catalog"
	"shopping-app/backend/internal/config"
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

func NewRouter(logger *slog.Logger, cfg config.Config) http.Handler {
	mux := http.NewServeMux()

	var adminStore *admin.Store
	if cfg.DatabaseURL != "" {
		store, err := admin.NewStore(context.Background(), cfg.DatabaseURL)
		if err != nil {
			logger.Error("failed to initialize admin store", "error", err.Error())
		} else {
			adminStore = store
		}
	}

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
	mux.HandleFunc("/api/v1/admin/bootstrap", func(w http.ResponseWriter, r *http.Request) {
		if adminStore == nil {
			http.Error(w, "database is not configured", http.StatusServiceUnavailable)
			return
		}

		switch r.Method {
		case http.MethodGet:
			state, err := adminStore.LoadState(r.Context())
			if err != nil {
				logger.Error("load admin state failed", "error", err.Error())
				http.Error(w, "failed to load admin state", http.StatusInternalServerError)
				return
			}

			writeJSON(w, http.StatusOK, state)
		case http.MethodPut:
			var state admin.State
			if err := json.NewDecoder(r.Body).Decode(&state); err != nil {
				http.Error(w, "invalid json body", http.StatusBadRequest)
				return
			}

			if err := adminStore.SaveState(r.Context(), state); err != nil {
				logger.Error("save admin state failed", "error", err.Error())
				http.Error(w, "failed to save admin state", http.StatusInternalServerError)
				return
			}

			writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
		default:
			w.Header().Set("Allow", "GET, PUT")
			http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
		}
	})

	return corsMiddleware(cfg.FrontendOrigin, loggingMiddleware(logger, mux))
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

func writeJSON(w http.ResponseWriter, statusCode int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(payload)
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

func corsMiddleware(frontendOrigin string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", frontendOrigin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
