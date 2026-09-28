package httpapi

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"shopping-app/backend/internal/address"
	"shopping-app/backend/internal/admin"
	"shopping-app/backend/internal/auth"
	"shopping-app/backend/internal/cart"
	"shopping-app/backend/internal/config"
	"shopping-app/backend/internal/health"
	"shopping-app/backend/internal/orders"
	"shopping-app/backend/internal/storefront"
	"shopping-app/backend/internal/wishlist"
)

const serviceName = "shopping-app-backend"

type homeResponse struct {
	Message string `json:"message"`
	Service string `json:"service"`
}

func NewRouter(logger *slog.Logger, cfg config.Config) http.Handler {
	mux := http.NewServeMux()

	var adminStore *admin.Store
	var authStore *auth.Store
	var storefrontStore *storefront.Store
	var cartStore *cart.Store
	var wishlistStore *wishlist.Store
	var addressStore *address.Store
	var ordersStore *orders.Store
	if cfg.DatabaseURL != "" {
		store, err := admin.NewStore(context.Background(), cfg.DatabaseURL)
		if err != nil {
			logger.Error("failed to initialize admin store", "error", err.Error())
		} else {
			adminStore = store
		}

		accounts, err := auth.NewStore(context.Background(), cfg.DatabaseURL)
		if err != nil {
			logger.Error("failed to initialize auth store", "error", err.Error())
		} else {
			authStore = accounts
		}

		shop, err := storefront.NewStore(context.Background(), cfg.DatabaseURL)
		if err != nil {
			logger.Error("failed to initialize storefront store", "error", err.Error())
		} else {
			storefrontStore = shop
		}

		bags, err := cart.NewStore(context.Background(), cfg.DatabaseURL)
		if err != nil {
			logger.Error("failed to initialize cart store", "error", err.Error())
		} else {
			cartStore = bags
		}

		saved, err := wishlist.NewStore(context.Background(), cfg.DatabaseURL)
		if err != nil {
			logger.Error("failed to initialize wishlist store", "error", err.Error())
		} else {
			wishlistStore = saved
		}

		addresses, err := address.NewStore(context.Background(), cfg.DatabaseURL)
		if err != nil {
			logger.Error("failed to initialize address store", "error", err.Error())
		} else {
			addressStore = addresses
		}

		checkout, err := orders.NewStore(context.Background(), cfg.DatabaseURL)
		if err != nil {
			logger.Error("failed to initialize orders store", "error", err.Error())
		} else {
			ordersStore = checkout
		}
	}

	authSecret := cfg.AuthSecret
	if authSecret == "" {
		authSecret = randomSecret()
		logger.Warn("AUTH_SECRET is not set; using a temporary secret, so logins reset on every restart")
	}
	if cfg.GoogleClientID == "" {
		logger.Warn("GOOGLE_CLIENT_ID is not set; Google login is disabled")
	}
	if cfg.RazorpayKeyID == "" || cfg.RazorpayKeySecret == "" {
		logger.Warn("RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET are not set; online payment is disabled, cash on delivery still works")
	}
	authHandler := auth.NewHandler(logger, authStore, authSecret, cfg.GoogleClientID)
	authHandler.Routes(mux)
	storefront.NewHandler(logger, storefrontStore).Routes(mux)
	cart.NewHandler(logger, cartStore, authHandler).Routes(mux)
	wishlist.NewHandler(logger, wishlistStore, authHandler).Routes(mux)
	address.NewHandler(logger, addressStore, authHandler).Routes(mux)
	orders.NewHandler(logger, ordersStore, authHandler, cfg.RazorpayKeyID, cfg.RazorpayKeySecret).Routes(mux)

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
	// The admin API exposes every customer and can rewrite prices, so it is limited to admin users.
	mux.Handle("/api/v1/admin/bootstrap", authHandler.RequireRole(auth.RoleAdmin, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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
	})))

	return corsMiddleware(cfg.FrontendOrigin, loggingMiddleware(logger, mux))
}

func randomSecret() string {
	buf := make([]byte, 32)
	_, _ = rand.Read(buf)
	return hex.EncodeToString(buf)
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

// corsMiddleware lets the configured frontends call the API. allowedOrigins is one address or a
// comma-separated list, and only the page's own address is echoed back, as browsers require.
func corsMiddleware(allowedOrigins string, next http.Handler) http.Handler {
	allowed := map[string]bool{}
	for _, origin := range strings.Split(allowedOrigins, ",") {
		if origin = strings.TrimRight(strings.TrimSpace(origin), "/"); origin != "" {
			allowed[origin] = true
		}
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Add("Vary", "Origin")
		if origin := r.Header.Get("Origin"); allowed[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
