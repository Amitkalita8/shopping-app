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
