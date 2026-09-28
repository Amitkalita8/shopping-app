package orders

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"shopping-app/backend/internal/auth"
)

const maxBodyBytes = 1 << 20

type Handler struct {
	logger   *slog.Logger
	store    *Store
	auth     *auth.Handler
	razorpay *razorpayClient
}

// NewHandler builds the checkout endpoints. store may be nil, in which case they answer 503.
// razorpayKeyID/razorpayKeySecret may be blank, in which case online payment is disabled and only
// cash on delivery is offered.
func NewHandler(logger *slog.Logger, store *Store, authHandler *auth.Handler, razorpayKeyID, razorpayKeySecret string) *Handler {
	return &Handler{logger: logger, store: store, auth: authHandler, razorpay: newRazorpayClient(razorpayKeyID, razorpayKeySecret)}
}

func (h *Handler) Routes(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/v1/checkout", h.auth.RequireAuth(h.checkout))
	mux.HandleFunc("POST /api/v1/checkout/verify", h.auth.RequireAuth(h.verify))
	mux.HandleFunc("GET /api/v1/orders", h.auth.RequireAuth(h.listOrders))
	mux.HandleFunc("GET /api/v1/orders/{id}", h.auth.RequireAuth(h.getOrder))
}

type checkoutRequest struct {
	PaymentMethod string `json:"paymentMethod"`
	AddressID     int64  `json:"addressId"`
}

type checkoutResponse struct {
	Order           Order  `json:"order"`
	RazorpayOrderID string `json:"razorpayOrderId,omitempty"`
	RazorpayKeyID   string `json:"razorpayKeyId,omitempty"`
	AmountPaise     int64  `json:"amountPaise,omitempty"`
}

type verifyRequest struct {
	OrderID           int64  `json:"orderId"`
	RazorpayOrderID   string `json:"razorpayOrderId"`
	RazorpayPaymentID string `json:"razorpayPaymentId"`
	RazorpaySignature string `json:"razorpaySignature"`
}

func (h *Handler) checkout(w http.ResponseWriter, r *http.Request, user auth.User) {
	if !h.requireStore(w) {
		return
	}

	var body checkoutRequest
	if !decodeBody(w, r, &body) {
		return
	}

	if body.PaymentMethod != PaymentMethodRazorpay && body.PaymentMethod != PaymentMethodCOD {
		writeError(w, http.StatusBadRequest, "Choose a valid payment method.")
		return
	}

	// Without Razorpay credentials configured, online payment is simulated as an instant success
	// rather than blocked, so the option is usable end to end until real keys are added.
	instantlyPaid := body.PaymentMethod == PaymentMethodRazorpay && !h.razorpay.enabled()

	order, err := h.store.Checkout(r.Context(), user.ID, body.AddressID, body.PaymentMethod, instantlyPaid)
	if err != nil {
		h.writeCheckoutError(w, err)
		return
	}

	if body.PaymentMethod == PaymentMethodCOD || instantlyPaid {
		writeJSON(w, http.StatusOK, checkoutResponse{Order: order})
		return
	}

	amountPaise := int64(order.Total*100 + 0.5)
	razorpayOrderID, err := h.razorpay.createOrder(r.Context(), amountPaise, order.OrderNumber)
	if err != nil {
		_ = h.store.MarkPaymentFailed(r.Context(), user.ID, order.ID)
		h.logger.Error("razorpay order create failed", "error", err.Error(), "orderId", order.ID)
		writeError(w, http.StatusBadGateway, "Could not start the online payment. Please try again or choose cash on delivery.")
		return
	}

	if err := h.store.SaveRazorpayOrderID(r.Context(), order.ID, razorpayOrderID); err != nil {
		h.fail(w, "save razorpay order id", err)
		return
	}

	writeJSON(w, http.StatusOK, checkoutResponse{
		Order:           order,
		RazorpayOrderID: razorpayOrderID,
		RazorpayKeyID:   h.razorpay.keyID,
		AmountPaise:     amountPaise,
	})
}

func (h *Handler) verify(w http.ResponseWriter, r *http.Request, user auth.User) {
	if !h.requireStore(w) {
		return
	}

	var body verifyRequest
	if !decodeBody(w, r, &body) {
		return
	}

	if body.OrderID == 0 || body.RazorpayOrderID == "" || body.RazorpayPaymentID == "" || body.RazorpaySignature == "" {
		writeError(w, http.StatusBadRequest, "Missing payment details.")
		return
	}

	if !h.razorpay.enabled() || !h.razorpay.verifySignature(body.RazorpayOrderID, body.RazorpayPaymentID, body.RazorpaySignature) {
		_ = h.store.MarkPaymentFailed(r.Context(), user.ID, body.OrderID)
		writeError(w, http.StatusBadRequest, "Payment could not be verified.")
		return
	}

	order, err := h.store.MarkPaid(r.Context(), user.ID, body.OrderID, body.RazorpayPaymentID)
	if err != nil {
		if errors.Is(err, ErrOrderNotFound) {
			writeError(w, http.StatusNotFound, "Order not found.")
			return
		}

		h.fail(w, "mark order paid", err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]Order{"order": order})
}

func (h *Handler) listOrders(w http.ResponseWriter, r *http.Request, user auth.User) {
	if !h.requireStore(w) {
		return
	}

	orders, err := h.store.ListByUser(r.Context(), user.ID)
	if err != nil {
		h.fail(w, "list orders", err)
		return
	}

	writeJSON(w, http.StatusOK, map[string][]Order{"items": orders})
}

func (h *Handler) getOrder(w http.ResponseWriter, r *http.Request, user auth.User) {
	if !h.requireStore(w) {
		return
	}

	orderID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid order id.")
		return
	}

	order, err := h.store.GetByID(r.Context(), user.ID, orderID)
	if err != nil {
		if errors.Is(err, ErrOrderNotFound) {
			writeError(w, http.StatusNotFound, "Order not found.")
			return
		}

		h.fail(w, "load order", err)
		return
	}

	writeJSON(w, http.StatusOK, order)
}

func (h *Handler) writeCheckoutError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrCartEmpty):
		writeError(w, http.StatusBadRequest, "Your cart is empty.")
	case errors.Is(err, ErrAddressRequired):
		writeJSON(w, http.StatusConflict, map[string]string{
			"error": "Add a delivery address before checking out.",
			"code":  "address_required",
		})
	case errors.Is(err, ErrAddressNotFound):
		writeError(w, http.StatusBadRequest, "That address could not be found.")
	default:
		h.fail(w, "checkout", err)
	}
}

func (h *Handler) requireStore(w http.ResponseWriter) bool {
	if h.store == nil {
		writeError(w, http.StatusServiceUnavailable, "Checkout is temporarily unavailable.")
		return false
	}

	return true
}

func (h *Handler) fail(w http.ResponseWriter, action string, err error) {
	h.logger.Error("checkout request failed", "action", action, "error", err.Error())
	writeError(w, http.StatusInternalServerError, "Something went wrong. Please try again.")
}

func decodeBody(w http.ResponseWriter, r *http.Request, target any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	if err := json.NewDecoder(r.Body).Decode(target); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body.")
		return false
	}

	return true
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
