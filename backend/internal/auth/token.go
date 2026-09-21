package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

const tokenLifetime = 7 * 24 * time.Hour

var errInvalidToken = errors.New("invalid or expired token")

type tokenClaims struct {
	UserID    int64 `json:"uid"`
	ExpiresAt int64 `json:"exp"`
}

type tokenSigner struct {
	secret []byte
}

// issue returns "<base64url(claims)>.<base64url(hmac-sha256)>".
func (t tokenSigner) issue(userID int64, now time.Time) (string, error) {
	payload, err := json.Marshal(tokenClaims{UserID: userID, ExpiresAt: now.Add(tokenLifetime).Unix()})
	if err != nil {
		return "", err
	}

	body := base64.RawURLEncoding.EncodeToString(payload)
	return body + "." + t.sign(body), nil
}

func (t tokenSigner) verify(token string, now time.Time) (int64, error) {
	body, signature, ok := strings.Cut(token, ".")
	if !ok || !hmac.Equal([]byte(signature), []byte(t.sign(body))) {
		return 0, errInvalidToken
	}

	payload, err := base64.RawURLEncoding.DecodeString(body)
	if err != nil {
		return 0, errInvalidToken
	}

	var claims tokenClaims
	if err := json.Unmarshal(payload, &claims); err != nil || claims.UserID == 0 || now.Unix() >= claims.ExpiresAt {
		return 0, errInvalidToken
	}

	return claims.UserID, nil
}

func (t tokenSigner) sign(body string) string {
	mac := hmac.New(sha256.New, t.secret)
	mac.Write([]byte(body))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}
