package orders

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const razorpayOrdersURL = "https://api.razorpay.com/v1/orders"

// razorpayClient talks to Razorpay's Orders API and checks the signature it returns after a
// payment. It works with the REST API directly rather than an SDK, since the surface used here
// (create an order, verify one HMAC) is small.
type razorpayClient struct {
	keyID      string
	keySecret  string
	httpClient *http.Client
}

func newRazorpayClient(keyID, keySecret string) *razorpayClient {
	return &razorpayClient{keyID: keyID, keySecret: keySecret, httpClient: &http.Client{Timeout: 15 * time.Second}}
}

// enabled reports whether Razorpay credentials are configured. Without them, online payment is
// disabled and the storefront falls back to cash on delivery, the same way Google login is
// disabled when GOOGLE_CLIENT_ID is unset.
func (c *razorpayClient) enabled() bool {
	return c != nil && c.keyID != "" && c.keySecret != ""
}

// createOrder opens a Razorpay order for amountPaise (rupees * 100, as Razorpay requires) and
// returns its id, which the frontend hands to Razorpay's Checkout widget.
func (c *razorpayClient) createOrder(ctx context.Context, amountPaise int64, receipt string) (string, error) {
	body, err := json.Marshal(map[string]any{
		"amount":          amountPaise,
		"currency":        "INR",
		"receipt":         receipt,
		"payment_capture": 1,
	})
	if err != nil {
		return "", fmt.Errorf("encode razorpay order request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, razorpayOrdersURL, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("build razorpay order request: %w", err)
	}
	req.SetBasicAuth(c.keyID, c.keySecret)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("call razorpay: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("razorpay order create failed: status %d: %s", resp.StatusCode, string(respBody))
	}

	var parsed struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return "", fmt.Errorf("decode razorpay order response: %w", err)
	}
	if parsed.ID == "" {
		return "", fmt.Errorf("razorpay order response had no id")
	}

	return parsed.ID, nil
}

// verifySignature checks the HMAC-SHA256 Razorpay signs "{order_id}|{payment_id}" with, proving
// the payment confirmation actually came from Razorpay and was not forged by the browser.
func (c *razorpayClient) verifySignature(razorpayOrderID, razorpayPaymentID, signature string) bool {
	mac := hmac.New(sha256.New, []byte(c.keySecret))
	mac.Write([]byte(razorpayOrderID + "|" + razorpayPaymentID))
	expected := hex.EncodeToString(mac.Sum(nil))

	return hmac.Equal([]byte(expected), []byte(signature))
}
