// Package orders turns a signed-in customer's cart into an order: it validates there is an
// address and items to ship, records the order and its lines, and tracks payment through either
// Razorpay or cash on delivery.
package orders

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	PaymentMethodRazorpay = "razorpay"
	PaymentMethodCOD      = "cod"

	// CODCharge is the handling fee added when a customer pays cash on delivery.
	CODCharge = 20.0
)

var (
	ErrCartEmpty        = errors.New("cart is empty")
	ErrAddressRequired  = errors.New("delivery address is required")
	ErrAddressNotFound  = errors.New("delivery address not found")
	ErrOrderNotFound    = errors.New("order not found")
	ErrInvalidSignature = errors.New("payment signature is invalid")
)

type Store struct {
	pool *pgxpool.Pool
}

type Item struct {
	ProductID string  `json:"productId"`
	Title     string  `json:"title"`
	Quantity  int     `json:"quantity"`
	UnitPrice float64 `json:"unitPrice"`
}

type Order struct {
	ID            int64   `json:"id"`
	OrderNumber   string  `json:"orderNumber"`
	Items         []Item  `json:"items"`
	Subtotal      float64 `json:"subtotal"`
	CODCharge     float64 `json:"codCharge"`
	Total         float64 `json:"total"`
	PaymentMethod string  `json:"paymentMethod"`
	PaymentStatus string  `json:"paymentStatus"`
	OrderStatus   string  `json:"orderStatus"`
	CreatedAt     string  `json:"createdAt"`
}

func NewStore(ctx context.Context, databaseURL string) (*Store, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("create pg pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping pg: %w", err)
	}

	return &Store{pool: pool}, nil
}

func (s *Store) Close() {
	if s == nil || s.pool == nil {
		return
	}

	s.pool.Close()
}

type cartLine struct {
	ProductID int64
	Slug      string
	Title     string
	Quantity  int
	UnitPrice float64
}

// Checkout turns the user's active cart into an order. paymentMethod is PaymentMethodRazorpay or
// PaymentMethodCOD. addressID picks which of the user's saved addresses to ship to; 0 falls back
// to their default. A cash-on-delivery order is confirmed immediately; a Razorpay order starts
// pending and is confirmed once the handler verifies the payment — unless instantlyPaid is set,
// which the handler uses to simulate an immediate successful payment while no real gateway is
// configured, so online payment has something to demo before real keys are added.
func (s *Store) Checkout(ctx context.Context, userID, addressID int64, paymentMethod string, instantlyPaid bool) (Order, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Order{}, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	lines, cartID, err := loadCart(ctx, tx, userID)
	if err != nil {
		return Order{}, err
	}
	if len(lines) == 0 {
		return Order{}, ErrCartEmpty
	}

	resolvedAddressID, err := resolveAddress(ctx, tx, userID, addressID)
	if err != nil {
		return Order{}, err
	}
	addressID = resolvedAddressID

	subtotal := 0.0
	for _, line := range lines {
		subtotal += line.UnitPrice * float64(line.Quantity)
	}

	codCharge := 0.0
	if paymentMethod == PaymentMethodCOD {
		codCharge = CODCharge
	}
	total := subtotal + codCharge

	orderStatus := "pending"
	paymentStatus := "pending"
	switch {
	case paymentMethod == PaymentMethodCOD:
		orderStatus = "confirmed"
	case instantlyPaid:
		orderStatus = "confirmed"
		paymentStatus = "paid"
	}

	orderNumber, err := generateOrderNumber()
	if err != nil {
		return Order{}, fmt.Errorf("generate order number: %w", err)
	}

	var orderID int64
	err = tx.QueryRow(ctx, `
		INSERT INTO orders (
			order_number, user_id, billing_address_id, shipping_address_id,
			subtotal, discount_amount, shipping_amount, tax_amount, total_amount,
			payment_status, order_status, fulfillment_status, created_at, updated_at
		)
		VALUES ($1, $2, $3, $3, $4, 0, $5, 0, $6, $7, $8, 'unfulfilled', NOW(), NOW())
		RETURNING id
	`, orderNumber, userID, addressID, subtotal, codCharge, total, paymentStatus, orderStatus).Scan(&orderID)
	if err != nil {
		return Order{}, fmt.Errorf("insert order: %w", err)
	}

	for _, line := range lines {
		_, err = tx.Exec(ctx, `
			INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, tax_amount, total_price)
			VALUES ($1, $2, $3, $4, $5, 0, $6)
		`, orderID, line.ProductID, line.Title, line.Quantity, line.UnitPrice, line.UnitPrice*float64(line.Quantity))
		if err != nil {
			return Order{}, fmt.Errorf("insert order item: %w", err)
		}
	}

	var paidAt *time.Time
	var gatewayResponse any
	if instantlyPaid {
		now := time.Now()
		paidAt = &now
		gatewayResponse = map[string]any{"simulated": true}
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO payments (order_id, payment_method, amount, currency, payment_status, paid_at, gateway_response)
		VALUES ($1, $2, $3, 'INR', $4, $5, $6)
	`, orderID, paymentMethod, total, paymentStatus, paidAt, gatewayResponse)
	if err != nil {
		return Order{}, fmt.Errorf("insert payment: %w", err)
	}

	if _, err := tx.Exec(ctx, `DELETE FROM carts_items WHERE cart_id = $1`, cartID); err != nil {
		return Order{}, fmt.Errorf("clear cart: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return Order{}, fmt.Errorf("commit tx: %w", err)
	}

	items := make([]Item, len(lines))
	for i, line := range lines {
		items[i] = Item{ProductID: line.Slug, Title: line.Title, Quantity: line.Quantity, UnitPrice: line.UnitPrice}
	}

	return Order{
		ID:            orderID,
		OrderNumber:   orderNumber,
		Items:         items,
		Subtotal:      subtotal,
		CODCharge:     codCharge,
		Total:         total,
		PaymentMethod: paymentMethod,
		PaymentStatus: paymentStatus,
		OrderStatus:   orderStatus,
	}, nil
}

// resolveAddress checks that a chosen address belongs to the user, or, when none was chosen,
// finds their default. Either way it returns the address id Checkout should bill and ship to.
func resolveAddress(ctx context.Context, tx pgx.Tx, userID, addressID int64) (int64, error) {
	if addressID != 0 {
		var found int64
		err := tx.QueryRow(ctx, `SELECT id FROM user_addresses WHERE id = $1 AND user_id = $2`, addressID, userID).Scan(&found)
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, ErrAddressNotFound
		}
		if err != nil {
			return 0, fmt.Errorf("find chosen address: %w", err)
		}

		return found, nil
	}

	var defaultID int64
	err := tx.QueryRow(ctx, `SELECT id FROM user_addresses WHERE user_id = $1 AND is_default = TRUE`, userID).Scan(&defaultID)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrAddressRequired
	}
	if err != nil {
		return 0, fmt.Errorf("find default address: %w", err)
	}

	return defaultID, nil
}

func loadCart(ctx context.Context, tx pgx.Tx, userID int64) ([]cartLine, int64, error) {
	var cartID int64
	err := tx.QueryRow(ctx, `SELECT id FROM carts WHERE user_id = $1 AND status = 'active'`, userID).Scan(&cartID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, 0, nil
	}
	if err != nil {
		return nil, 0, fmt.Errorf("find cart: %w", err)
	}

	rows, err := tx.Query(ctx, `
		SELECT p.id, p.slug, p.name, ci.quantity, ci.unit_price
		FROM carts_items ci
		JOIN products p ON p.id = ci.product_id
		WHERE ci.cart_id = $1
		ORDER BY ci.created_at
	`, cartID)
	if err != nil {
		return nil, 0, fmt.Errorf("load cart items: %w", err)
	}
	defer rows.Close()

	var lines []cartLine
	for rows.Next() {
		var line cartLine
		if err := rows.Scan(&line.ProductID, &line.Slug, &line.Title, &line.Quantity, &line.UnitPrice); err != nil {
			return nil, 0, fmt.Errorf("scan cart item: %w", err)
		}
		lines = append(lines, line)
	}

	return lines, cartID, rows.Err()
}

// SaveRazorpayOrderID records the remote Razorpay order behind a pending order, so verification
// can later confirm the two match.
func (s *Store) SaveRazorpayOrderID(ctx context.Context, orderID int64, razorpayOrderID string) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE payments SET gateway_response = jsonb_build_object('razorpay_order_id', $2::text)
		WHERE order_id = $1
	`, orderID, razorpayOrderID)
	if err != nil {
		return fmt.Errorf("save razorpay order id: %w", err)
	}

	return nil
}

// MarkPaid confirms a Razorpay payment once its signature has been verified.
func (s *Store) MarkPaid(ctx context.Context, userID, orderID int64, razorpayPaymentID string) (Order, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Order{}, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `
		UPDATE orders SET payment_status = 'paid', order_status = 'confirmed', updated_at = NOW()
		WHERE id = $1 AND user_id = $2
	`, orderID, userID)
	if err != nil {
		return Order{}, fmt.Errorf("update order: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return Order{}, ErrOrderNotFound
	}

	_, err = tx.Exec(ctx, `
		UPDATE payments
		SET payment_status = 'paid', transaction_id = $2, paid_at = NOW(),
			gateway_response = COALESCE(gateway_response, '{}'::jsonb) || jsonb_build_object('razorpay_payment_id', $2::text)
		WHERE order_id = $1
	`, orderID, razorpayPaymentID)
	if err != nil {
		return Order{}, fmt.Errorf("update payment: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return Order{}, fmt.Errorf("commit tx: %w", err)
	}

	return s.GetByID(ctx, userID, orderID)
}

// MarkPaymentFailed records that a Razorpay payment could not be confirmed, so the order does not
// sit silently "pending" forever.
func (s *Store) MarkPaymentFailed(ctx context.Context, userID, orderID int64) error {
	tag, err := s.pool.Exec(ctx, `
		UPDATE orders SET payment_status = 'failed', order_status = 'payment_failed', updated_at = NOW()
		WHERE id = $1 AND user_id = $2
	`, orderID, userID)
	if err != nil {
		return fmt.Errorf("update order: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrOrderNotFound
	}

	if _, err := s.pool.Exec(ctx, `UPDATE payments SET payment_status = 'failed' WHERE order_id = $1`, orderID); err != nil {
		return fmt.Errorf("update payment: %w", err)
	}

	return nil
}

// GetByID returns an order and its lines, scoped to the requesting user so no one can look up
// someone else's order by guessing an id.
func (s *Store) GetByID(ctx context.Context, userID, orderID int64) (Order, error) {
	var order Order
	var createdAt time.Time
	err := s.pool.QueryRow(ctx, `
		SELECT id, order_number, COALESCE(subtotal,0), COALESCE(shipping_amount,0), COALESCE(total_amount,0),
			COALESCE(payment_status,''), COALESCE(order_status,''), created_at
		FROM orders
		WHERE id = $1 AND user_id = $2
	`, orderID, userID).Scan(
		&order.ID, &order.OrderNumber, &order.Subtotal, &order.CODCharge, &order.Total,
		&order.PaymentStatus, &order.OrderStatus, &createdAt,
	)
	order.CreatedAt = createdAt.Format(time.RFC3339)
	if errors.Is(err, pgx.ErrNoRows) {
		return Order{}, ErrOrderNotFound
	}
	if err != nil {
		return Order{}, fmt.Errorf("find order: %w", err)
	}

	rows, err := s.pool.Query(ctx, `
		SELECT COALESCE(p.slug, ''), oi.product_name, oi.quantity, oi.unit_price
		FROM order_items oi
		LEFT JOIN products p ON p.id = oi.product_id
		WHERE oi.order_id = $1
	`, orderID)
	if err != nil {
		return Order{}, fmt.Errorf("load order items: %w", err)
	}
	defer rows.Close()

	items := []Item{}
	for rows.Next() {
		var item Item
		if err := rows.Scan(&item.ProductID, &item.Title, &item.Quantity, &item.UnitPrice); err != nil {
			return Order{}, fmt.Errorf("scan order item: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return Order{}, err
	}
	order.Items = items

	var paymentMethod string
	if err := s.pool.QueryRow(ctx, `SELECT payment_method FROM payments WHERE order_id = $1`, orderID).Scan(&paymentMethod); err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return Order{}, fmt.Errorf("load payment method: %w", err)
	}
	order.PaymentMethod = paymentMethod

	return order, nil
}

// ListByUser returns every order the user has placed, most recent first, each with its lines.
func (s *Store) ListByUser(ctx context.Context, userID int64) ([]Order, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT o.id, o.order_number, COALESCE(o.subtotal,0), COALESCE(o.shipping_amount,0), COALESCE(o.total_amount,0),
			COALESCE(o.payment_status,''), COALESCE(o.order_status,''), o.created_at, COALESCE(p.payment_method, '')
		FROM orders o
		LEFT JOIN payments p ON p.order_id = o.id
		WHERE o.user_id = $1
		ORDER BY o.created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("list orders: %w", err)
	}
	defer rows.Close()

	orders := []Order{}
	orderIndex := map[int64]int{}
	for rows.Next() {
		var order Order
		var createdAt time.Time
		if err := rows.Scan(
			&order.ID, &order.OrderNumber, &order.Subtotal, &order.CODCharge, &order.Total,
			&order.PaymentStatus, &order.OrderStatus, &createdAt, &order.PaymentMethod,
		); err != nil {
			return nil, fmt.Errorf("scan order: %w", err)
		}
		order.CreatedAt = createdAt.Format(time.RFC3339)
		order.Items = []Item{}
		orderIndex[order.ID] = len(orders)
		orders = append(orders, order)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(orders) == 0 {
		return orders, nil
	}

	itemRows, err := s.pool.Query(ctx, `
		SELECT oi.order_id, COALESCE(p.slug, ''), oi.product_name, oi.quantity, oi.unit_price
		FROM order_items oi
		LEFT JOIN products p ON p.id = oi.product_id
		JOIN orders o ON o.id = oi.order_id
		WHERE o.user_id = $1
		ORDER BY oi.id
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("list order items: %w", err)
	}
	defer itemRows.Close()

	for itemRows.Next() {
		var orderID int64
		var item Item
		if err := itemRows.Scan(&orderID, &item.ProductID, &item.Title, &item.Quantity, &item.UnitPrice); err != nil {
			return nil, fmt.Errorf("scan order item: %w", err)
		}

		if index, ok := orderIndex[orderID]; ok {
			orders[index].Items = append(orders[index].Items, item)
		}
	}

	return orders, itemRows.Err()
}

func generateOrderNumber() (string, error) {
	buf := make([]byte, 6)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}

	return "ORD" + hex.EncodeToString(buf), nil
}
