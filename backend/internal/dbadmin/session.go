package dbadmin

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	sessionLifetime = 12 * time.Hour
	tokenPrefix     = "dbadmin"
	// Failed logins allowed from one address within failureWindow before it must wait.
	maxFailures   = 5
	failureWindow = 15 * time.Minute
)

// Credentials is the username and password for the database browser, from DB_ADMIN_USER and
// DB_ADMIN_PASSWORD. An empty password turns that login off.
type Credentials struct {
	User     string
	Password string
}

// sessions issues and checks the browser's login tokens. A token is signed with a key made from
// the server secret and the credentials, so changing the password signs everyone out.
type sessions struct {
	creds Credentials
	key   []byte
	now   func() time.Time

	mu       sync.Mutex
	failures map[string][]time.Time
}

func newSessions(creds Credentials, secret string) *sessions {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte("db-admin\x00" + creds.User + "\x00" + creds.Password))
	return &sessions{creds: creds, key: mac.Sum(nil), now: time.Now, failures: map[string][]time.Time{}}
}

func (s *sessions) enabled() bool {
	return s.creds.Password != ""
}

// check compares in constant time, so the response time does not reveal how much was right.
func (s *sessions) check(user, password string) bool {
	if !s.enabled() {
		return false
	}
	userOK := subtle.ConstantTimeCompare([]byte(user), []byte(s.creds.User)) == 1
	passOK := subtle.ConstantTimeCompare([]byte(password), []byte(s.creds.Password)) == 1
	return userOK && passOK
}

func (s *sessions) sign(payload string) string {
	mac := hmac.New(sha256.New, s.key)
	mac.Write([]byte(payload))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func (s *sessions) issue() (string, time.Time) {
	expires := s.now().Add(sessionLifetime)
	payload := tokenPrefix + "." + strconv.FormatInt(expires.Unix(), 10)
	return payload + "." + s.sign(payload), expires
}

func (s *sessions) valid(token string) bool {
	if !s.enabled() {
		return false
	}
	parts := strings.Split(token, ".")
	if len(parts) != 3 || parts[0] != tokenPrefix {
		return false
	}
	expires, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil || s.now().Unix() >= expires {
		return false
	}
	want := s.sign(parts[0] + "." + parts[1])
	return hmac.Equal([]byte(parts[2]), []byte(want))
}

// blocked reports whether this address has failed too often recently.
func (s *sessions) blocked(addr string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return len(s.recent(addr)) >= maxFailures
}

func (s *sessions) fail(addr string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.failures[addr] = append(s.recent(addr), s.now())
}

func (s *sessions) succeed(addr string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.failures, addr)
}

// recent drops failures older than the window. Callers hold mu.
func (s *sessions) recent(addr string) []time.Time {
	cutoff := s.now().Add(-failureWindow)
	kept := s.failures[addr][:0]
	for _, at := range s.failures[addr] {
		if at.After(cutoff) {
			kept = append(kept, at)
		}
	}
	if len(kept) == 0 {
		delete(s.failures, addr)
		return nil
	}
	s.failures[addr] = kept
	return kept
}
