package httpapi

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"shopping-app/backend/internal/config"
)

func TestNewRouterServesHealth(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	router := NewRouter(logger, config.Config{FrontendOrigin: "http://localhost:3000"})

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	if got := rec.Header().Get("Content-Type"); !strings.Contains(got, "application/json") {
		t.Fatalf("expected JSON content type, got %q", got)
	}

	body := rec.Body.String()
	if !strings.Contains(body, `"status":"ok"`) {
		t.Fatalf("expected health response body, got %q", body)
	}
}

func TestStorefrontEndpointsNeedTheDatabase(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	router := NewRouter(logger, config.Config{FrontendOrigin: "http://localhost:3000"})

	for _, path := range []string{
		"/api/v1/storefront",
		"/api/v1/categories",
		"/api/v1/products",
		"/api/v1/products/banarasi-saree",
	} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusServiceUnavailable {
			t.Errorf("GET %s: expected status %d without a database, got %d", path, http.StatusServiceUnavailable, rec.Code)
		}
	}
}

func TestStorefrontEndpointsRejectWrites(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	router := NewRouter(logger, config.Config{FrontendOrigin: "http://localhost:3000"})

	req := httptest.NewRequest(http.MethodPost, "/api/v1/storefront", nil)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected status %d, got %d", http.StatusMethodNotAllowed, rec.Code)
	}
}

func TestCORSAllowsEveryConfiguredFrontendAndNoOthers(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	router := NewRouter(logger, config.Config{
		FrontendOrigin: "https://amitkalita8.github.io, https://shopping-app-bay-five.vercel.app/",
	})

	for origin, want := range map[string]string{
		"https://amitkalita8.github.io":            "https://amitkalita8.github.io",
		"https://shopping-app-bay-five.vercel.app": "https://shopping-app-bay-five.vercel.app",
		"https://evil.example.com":                 "",
		"":                                         "",
	} {
		req := httptest.NewRequest(http.MethodGet, "/health", nil)
		if origin != "" {
			req.Header.Set("Origin", origin)
		}
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)

		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != want {
			t.Errorf("Origin %q: Access-Control-Allow-Origin = %q, want %q", origin, got, want)
		}
		if !strings.Contains(rec.Header().Get("Vary"), "Origin") {
			t.Errorf("Origin %q: responses must carry Vary: Origin so caches keep origins apart", origin)
		}
	}
}

func TestCORSPreflightIsAnsweredWithoutReachingTheRoute(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	router := NewRouter(logger, config.Config{FrontendOrigin: "http://localhost:3000"})

	req := httptest.NewRequest(http.MethodOptions, "/api/v1/auth/login", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent || rec.Header().Get("Access-Control-Allow-Origin") != "http://localhost:3000" {
		t.Fatalf("preflight: status %d, allow-origin %q", rec.Code, rec.Header().Get("Access-Control-Allow-Origin"))
	}
}

func TestAdminAPIRequiresASession(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	router := NewRouter(logger, config.Config{FrontendOrigin: "http://localhost:3000"})

	for _, method := range []string{http.MethodGet, http.MethodPut} {
		req := httptest.NewRequest(method, "/api/v1/admin/bootstrap", nil)
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Errorf("%s /api/v1/admin/bootstrap without a session: status %d, want %d", method, rec.Code, http.StatusUnauthorized)
		}
	}
}

func TestCartAndWishlistRequireASession(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	router := NewRouter(logger, config.Config{FrontendOrigin: "http://localhost:3000"})

	requests := []struct {
		method string
		path   string
	}{
		{http.MethodGet, "/api/v1/cart"},
		{http.MethodPost, "/api/v1/cart/items"},
		{http.MethodPut, "/api/v1/cart/items/banarasi-saree"},
		{http.MethodDelete, "/api/v1/cart/items/banarasi-saree"},
		{http.MethodGet, "/api/v1/wishlist"},
		{http.MethodPost, "/api/v1/wishlist"},
		{http.MethodDelete, "/api/v1/wishlist/banarasi-saree"},
	}

	for _, request := range requests {
		req := httptest.NewRequest(request.method, request.path, nil)
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Errorf("%s %s without a session: status %d, want %d", request.method, request.path, rec.Code, http.StatusUnauthorized)
		}
	}
}

func TestCheckoutAndAddressRequireASession(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	router := NewRouter(logger, config.Config{FrontendOrigin: "http://localhost:3000"})

	requests := []struct {
		method string
		path   string
	}{
		{http.MethodGet, "/api/v1/account/addresses"},
		{http.MethodPost, "/api/v1/account/addresses"},
		{http.MethodPut, "/api/v1/account/addresses/1"},
		{http.MethodDelete, "/api/v1/account/addresses/1"},
		{http.MethodPut, "/api/v1/account/addresses/1/default"},
		{http.MethodPost, "/api/v1/checkout"},
		{http.MethodPost, "/api/v1/checkout/verify"},
		{http.MethodGet, "/api/v1/orders"},
		{http.MethodGet, "/api/v1/orders/1"},
		{http.MethodPut, "/api/v1/auth/profile"},
		{http.MethodDelete, "/api/v1/auth/account"},
	}

	for _, request := range requests {
		req := httptest.NewRequest(request.method, request.path, nil)
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Errorf("%s %s without a session: status %d, want %d", request.method, request.path, rec.Code, http.StatusUnauthorized)
		}
	}
}

func TestDBAdminPageIsServedAndItsDataNeedsAnAdmin(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	router := NewRouter(logger, config.Config{FrontendOrigin: "http://localhost:3000", AuthSecret: "test-secret"})

	req := httptest.NewRequest(http.MethodGet, "/db-admin", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !strings.Contains(rec.Header().Get("Content-Type"), "text/html") {
		t.Fatalf("GET /db-admin: status %d, content type %q", rec.Code, rec.Header().Get("Content-Type"))
	}
	if rec.Header().Get("X-Frame-Options") != "DENY" {
		t.Error("the admin page must not be embeddable in other sites")
	}

	for _, tc := range []struct{ method, path string }{
		{http.MethodGet, "/api/v1/admin/db/tables"},
		{http.MethodGet, "/api/v1/admin/db/tables/users"},
		{http.MethodGet, "/api/v1/admin/db/tables/users/columns"},
		{http.MethodPost, "/api/v1/admin/db/query"},
	} {
		req := httptest.NewRequest(tc.method, tc.path, strings.NewReader(`{"sql":"SELECT 1"}`))
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("%s %s without a login: status %d, want %d", tc.method, tc.path, rec.Code, http.StatusUnauthorized)
		}
	}
}

func TestCORSAllowsAnyLocalPortOnlyWhenLocalhostIsConfigured(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	check := func(configured, origin string) string {
		router := NewRouter(logger, config.Config{FrontendOrigin: configured})
		req := httptest.NewRequest(http.MethodGet, "/health", nil)
		req.Header.Set("Origin", origin)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		return rec.Header().Get("Access-Control-Allow-Origin")
	}

	local := "http://localhost:3000,https://shop.example.com"
	for origin, want := range map[string]string{
		"http://localhost:3001":     "http://localhost:3001",
		"http://127.0.0.1:3002":     "http://127.0.0.1:3002",
		"https://shop.example.com":  "https://shop.example.com",
		"http://localhost.evil.com": "",
		"https://evil.example.com":  "",
	} {
		if got := check(local, origin); got != want {
			t.Errorf("configured %q, Origin %q: got %q, want %q", local, origin, got, want)
		}
	}

	if got := check("https://shop.example.com", "http://localhost:3001"); got != "" {
		t.Errorf("a hosted-only config must not allow localhost, got %q", got)
	}
}
