package auth

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestPasswordHashRoundTrip(t *testing.T) {
	hash, err := hashPassword("correct horse")
	if err != nil {
		t.Fatal(err)
	}

	if !verifyPassword("correct horse", hash) {
		t.Fatal("expected correct password to verify")
	}
	if verifyPassword("wrong horse", hash) {
		t.Fatal("expected wrong password to fail")
	}
	if verifyPassword("correct horse", "not-a-hash") {
		t.Fatal("expected malformed hash to fail")
	}
}

func TestTokenIssueAndVerify(t *testing.T) {
	signer := tokenSigner{secret: []byte("test-secret")}
	now := time.Now()

	token, err := signer.issue(42, now)
	if err != nil {
		t.Fatal(err)
	}

	userID, err := signer.verify(token, now.Add(time.Hour))
	if err != nil || userID != 42 {
		t.Fatalf("verify = %d, %v; want 42, nil", userID, err)
	}

	if _, err := signer.verify(token, now.Add(tokenLifetime+time.Second)); err == nil {
		t.Fatal("expected expired token to fail")
	}

	other := tokenSigner{secret: []byte("other-secret")}
	if _, err := other.verify(token, now); err == nil {
		t.Fatal("expected token signed with another secret to fail")
	}

	if _, err := signer.verify(token+"x", now); err == nil {
		t.Fatal("expected tampered token to fail")
	}
}

func TestNormalizeMobile(t *testing.T) {
	for input, want := range map[string]string{
		"9876543210":        "9876543210",
		"+91 98765-43210":   "9876543210",
		"919876543210":      "9876543210",
		"09876543210":       "9876543210",
		" 98765 43210 ":     "9876543210",
		"not a number":      "",
		"12345":             "12345",
		"+1 (415) 555 2671": "14155552671",
	} {
		if got := normalizeMobile(input); got != want {
			t.Errorf("normalizeMobile(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestRequireRoleRejectsRequestsWithoutAValidSession(t *testing.T) {
	handler := NewHandler(slog.New(slog.NewTextHandler(io.Discard, nil)), nil, "test-secret", "")
	reached := false
	protected := handler.RequireRole(RoleAdmin, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reached = true
	}))

	valid, _ := handler.tokens.issue(1, time.Now())
	expired, _ := handler.tokens.issue(1, time.Now().Add(-2*tokenLifetime))
	forged, _ := tokenSigner{secret: []byte("someone-elses-secret")}.issue(1, time.Now())

	for name, tc := range map[string]struct {
		header string
		want   int
	}{
		"no header":        {"", http.StatusUnauthorized},
		"not a bearer":     {"Basic abc", http.StatusUnauthorized},
		"garbage token":    {"Bearer abc.def", http.StatusUnauthorized},
		"expired token":    {"Bearer " + expired, http.StatusUnauthorized},
		"forged signature": {"Bearer " + forged, http.StatusUnauthorized},
		"valid but no db":  {"Bearer " + valid, http.StatusServiceUnavailable},
	} {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		if tc.header != "" {
			req.Header.Set("Authorization", tc.header)
		}
		rec := httptest.NewRecorder()

		protected.ServeHTTP(rec, req)

		if rec.Code != tc.want {
			t.Errorf("%s: status %d, want %d", name, rec.Code, tc.want)
		}
	}

	if reached {
		t.Fatal("the protected handler must never run without a valid admin session")
	}
}
