package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const googleTokenInfoURL = "https://oauth2.googleapis.com/tokeninfo"

var errInvalidGoogleToken = errors.New("invalid google credential")

type googleProfile struct {
	Subject       string
	Email         string
	EmailVerified bool
	Name          string
	Picture       string
}

type googleVerifier struct {
	clientID string
	client   *http.Client
}

func newGoogleVerifier(clientID string) googleVerifier {
	return googleVerifier{clientID: clientID, client: &http.Client{Timeout: 8 * time.Second}}
}

// verify validates a Google Identity Services ID token through Google's tokeninfo
// endpoint, which checks the signature and expiry, then checks audience and issuer.
func (g googleVerifier) verify(ctx context.Context, idToken string) (googleProfile, error) {
	if g.clientID == "" {
		return googleProfile{}, errors.New("google login is not configured")
	}

	endpoint := googleTokenInfoURL + "?id_token=" + url.QueryEscape(idToken)
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return googleProfile{}, err
	}

	response, err := g.client.Do(request)
	if err != nil {
		return googleProfile{}, fmt.Errorf("call google tokeninfo: %w", err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		return googleProfile{}, errInvalidGoogleToken
	}

	var claims struct {
		Issuer        string `json:"iss"`
		Audience      string `json:"aud"`
		Subject       string `json:"sub"`
		Email         string `json:"email"`
		EmailVerified string `json:"email_verified"`
		Name          string `json:"name"`
		Picture       string `json:"picture"`
	}
	if err := json.NewDecoder(response.Body).Decode(&claims); err != nil {
		return googleProfile{}, fmt.Errorf("decode google tokeninfo: %w", err)
	}

	if claims.Audience != g.clientID ||
		(claims.Issuer != "accounts.google.com" && claims.Issuer != "https://accounts.google.com") ||
		claims.Subject == "" || claims.Email == "" {
		return googleProfile{}, errInvalidGoogleToken
	}

	return googleProfile{
		Subject:       claims.Subject,
		Email:         strings.ToLower(strings.TrimSpace(claims.Email)),
		EmailVerified: claims.EmailVerified == "true",
		Name:          claims.Name,
		Picture:       claims.Picture,
	}, nil
}
