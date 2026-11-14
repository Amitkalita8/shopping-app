package dbadmin

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"shopping-app/backend/internal/auth"
)

func TestSessionsCheckIssueAndExpire(t *testing.T) {
	s := newSessions(Credentials{User: "root", Password: "Ak123456."}, "server-secret")
	clock := time.Date(2026, 11, 14, 10, 0, 0, 0, time.UTC)
	s.now = func() time.Time { return clock }

	if !s.check("root", "Ak123456.") {
		t.Fatal("the right username and password must be accepted")
	}
	for _, tc := range [][2]string{{"root", "Ak123456"}, {"Root", "Ak123456."}, {"admin", "Ak123456."}, {"", ""}} {
		if s.check(tc[0], tc[1]) {
			t.Errorf("check(%q, %q) must fail", tc[0], tc[1])
		}
	}

	token, _ := s.issue()
	if !s.valid(token) {
		t.Fatal("a fresh token must be valid")
	}
	if s.valid(token+"x") || s.valid("dbadmin.9999999999.forged") || s.valid("") {
		t.Error("altered or forged tokens must be rejected")
	}

	changed := newSessions(Credentials{User: "root", Password: "new-password"}, "server-secret")
	changed.now = s.now
	if changed.valid(token) {
		t.Error("changing the password must sign existing sessions out")
	}

	clock = clock.Add(sessionLifetime + time.Second)
	if s.valid(token) {
		t.Error("tokens must expire")
	}
}

func TestSessionsDisabledWithoutPassword(t *testing.T) {
	s := newSessions(Credentials{User: "root"}, "secret")
	if s.enabled() || s.check("root", "") {
		t.Fatal("an empty password must turn the login off")
	}
}

func TestLoginEndpointAndLockout(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	authHandler := auth.NewHandler(logger, nil, "secret", "")
	h := NewHandler(logger, nil, authHandler, Credentials{User: "root", Password: "Ak123456."}, "secret")
	mux := http.NewServeMux()
	h.Routes(mux)

	login := func(body string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/db/login", strings.NewReader(body))
		req.RemoteAddr = "203.0.113.7:5000"
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		return rec
	}

	rec := login(`{"username":"root","password":"Ak123456."}`)
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"token":"dbadmin.`) {
		t.Fatalf("good login: status %d body %s", rec.Code, rec.Body)
	}

	// The token opens the data endpoints (503 here only because the test has no database).
	token := strings.Split(strings.Split(rec.Body.String(), `"token":"`)[1], `"`)[0]
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/db/tables", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	data := httptest.NewRecorder()
	mux.ServeHTTP(data, req)
	if data.Code != http.StatusServiceUnavailable {
		t.Fatalf("with a valid token the request must reach the store, got %d", data.Code)
	}

	for i := 0; i < maxFailures; i++ {
		if rec := login(`{"username":"root","password":"wrong"}`); rec.Code != http.StatusUnauthorized {
			t.Fatalf("wrong password %d: status %d", i, rec.Code)
		}
	}
	if rec := login(`{"username":"root","password":"Ak123456."}`); rec.Code != http.StatusTooManyRequests {
		t.Fatalf("after %d failures the address must wait, got %d", maxFailures, rec.Code)
	}
}
