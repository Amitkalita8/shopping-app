// Package cart persists each signed-in customer's shopping bag in the database, so it survives
// across devices and sessions instead of living only in the browser tab.
package cart

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrProductNotFound means the slug does not match an active product.
var ErrProductNotFound = errors.New("product not found")

type Store struct {
	pool *pgxpool.Pool
}

// Item is one line in a cart, keyed by the product's slug the way the storefront API identifies products.
type Item struct {
	ProductID string  `json:"productId"`
	Quantity  int     `json:"quantity"`
	UnitPrice float64 `json:"unitPrice"`
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

// List returns the signed-in user's cart items, oldest first.
func (s *Store) List(ctx context.Context, userID int64) ([]Item, error) {
	return listItems(ctx, s.pool, userID)
}

// AddItem adds quantity of a product to the user's active cart, creating the cart on first use and
// increasing the existing line's quantity when the product is already in it.
func (s *Store) AddItem(ctx context.Context, userID int64, productSlug string, quantity int) ([]Item, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var productID int64
	var price float64
	err = tx.QueryRow(ctx, `
		SELECT id, COALESCE(price, 0) FROM products WHERE slug = $1 AND is_active = TRUE
	`, productSlug).Scan(&productID, &price)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrProductNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("find product: %w", err)
	}

	cartID, err := getOrCreateActiveCart(ctx, tx, userID)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO carts_items (cart_id, product_id, quantity, unit_price, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NOW(), NOW())
		ON CONFLICT (cart_id, product_id)
		DO UPDATE SET
			quantity = carts_items.quantity + EXCLUDED.quantity,
			unit_price = EXCLUDED.unit_price,
			updated_at = NOW()
	`, cartID, productID, quantity, price)
	if err != nil {
		return nil, fmt.Errorf("upsert cart item: %w", err)
	}

	if _, err := tx.Exec(ctx, `UPDATE carts SET updated_at = NOW() WHERE id = $1`, cartID); err != nil {
		return nil, fmt.Errorf("touch cart: %w", err)
	}

	items, err := listItems(ctx, tx, userID)
	if err != nil {
		return nil, err
	}

	return items, tx.Commit(ctx)
}

// SetQuantity sets a line's quantity, removing it once quantity drops to zero or below.
func (s *Store) SetQuantity(ctx context.Context, userID int64, productSlug string, quantity int) ([]Item, error) {
	if quantity <= 0 {
		return s.RemoveItem(ctx, userID, productSlug)
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `
		UPDATE carts_items ci
		SET quantity = $3, updated_at = NOW()
		FROM carts c, products p
		WHERE ci.cart_id = c.id AND ci.product_id = p.id
		  AND c.user_id = $1 AND c.status = 'active' AND p.slug = $2
	`, userID, productSlug, quantity)
	if err != nil {
		return nil, fmt.Errorf("update cart item quantity: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrProductNotFound
	}

	items, err := listItems(ctx, tx, userID)
	if err != nil {
		return nil, err
	}

	return items, tx.Commit(ctx)
}

// RemoveItem removes a product from the user's cart. Removing something that is not there is a no-op.
func (s *Store) RemoveItem(ctx context.Context, userID int64, productSlug string) ([]Item, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `
		DELETE FROM carts_items ci
		USING carts c, products p
		WHERE ci.cart_id = c.id AND ci.product_id = p.id
		  AND c.user_id = $1 AND c.status = 'active' AND p.slug = $2
	`, userID, productSlug)
	if err != nil {
		return nil, fmt.Errorf("remove cart item: %w", err)
	}

	items, err := listItems(ctx, tx, userID)
	if err != nil {
		return nil, err
	}

	return items, tx.Commit(ctx)
}

func getOrCreateActiveCart(ctx context.Context, tx pgx.Tx, userID int64) (int64, error) {
	var cartID int64
	err := tx.QueryRow(ctx, `SELECT id FROM carts WHERE user_id = $1 AND status = 'active'`, userID).Scan(&cartID)
	if err == nil {
		return cartID, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return 0, fmt.Errorf("find cart: %w", err)
	}

	err = tx.QueryRow(ctx, `
		INSERT INTO carts (user_id, status, created_at, updated_at)
		VALUES ($1, 'active', NOW(), NOW())
		RETURNING id
	`, userID).Scan(&cartID)
	if err != nil {
		return 0, fmt.Errorf("create cart: %w", err)
	}

	return cartID, nil
}

// querier is satisfied by both *pgxpool.Pool and pgx.Tx, so listItems reads the same way whether
// it runs standalone or as the last step of a mutation's transaction.
type querier interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

func listItems(ctx context.Context, q querier, userID int64) ([]Item, error) {
	rows, err := q.Query(ctx, `
		SELECT p.slug, ci.quantity, ci.unit_price
		FROM carts c
		JOIN carts_items ci ON ci.cart_id = c.id
		JOIN products p ON p.id = ci.product_id
		WHERE c.user_id = $1 AND c.status = 'active'
		ORDER BY ci.created_at
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("list cart items: %w", err)
	}
	defer rows.Close()

	items := []Item{}
	for rows.Next() {
		var item Item
		if err := rows.Scan(&item.ProductID, &item.Quantity, &item.UnitPrice); err != nil {
			return nil, fmt.Errorf("scan cart item: %w", err)
		}
		items = append(items, item)
	}

	return items, rows.Err()
}
