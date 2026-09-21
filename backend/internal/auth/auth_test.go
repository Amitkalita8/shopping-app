package auth

import (
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
