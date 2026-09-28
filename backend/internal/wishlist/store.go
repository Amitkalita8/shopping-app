// Package wishlist persists each signed-in customer's saved products in the database.
package wishlist

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

// List returns the slugs of the signed-in user's saved products, most recently saved first.
func (s *Store) List(ctx context.Context, userID int64) ([]string, error) {
	return listSlugs(ctx, s.pool, userID)
}

// Add saves a product for the signed-in user. Saving something already saved is a no-op.
func (s *Store) Add(ctx context.Context, userID int64, productSlug string) ([]string, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var productID int64
	err = tx.QueryRow(ctx, `SELECT id FROM products WHERE slug = $1 AND is_active = TRUE`, productSlug).Scan(&productID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrProductNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("find product: %w", err)
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO wishlist_items (user_id, product_id, created_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (user_id, product_id) DO NOTHING
	`, userID, productID)
	if err != nil {
		return nil, fmt.Errorf("insert wishlist item: %w", err)
	}

	slugs, err := listSlugs(ctx, tx, userID)
	if err != nil {
		return nil, err
	}

	return slugs, tx.Commit(ctx)
}

// Remove drops a product from the signed-in user's wishlist. Removing something not saved is a no-op.
func (s *Store) Remove(ctx context.Context, userID int64, productSlug string) ([]string, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `
		DELETE FROM wishlist_items w
		USING products p
		WHERE w.product_id = p.id AND w.user_id = $1 AND p.slug = $2
	`, userID, productSlug)
	if err != nil {
		return nil, fmt.Errorf("remove wishlist item: %w", err)
	}

	slugs, err := listSlugs(ctx, tx, userID)
	if err != nil {
		return nil, err
	}

	return slugs, tx.Commit(ctx)
}

// querier is satisfied by both *pgxpool.Pool and pgx.Tx.
type querier interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

func listSlugs(ctx context.Context, q querier, userID int64) ([]string, error) {
	rows, err := q.Query(ctx, `
		SELECT p.slug
		FROM wishlist_items w
		JOIN products p ON p.id = w.product_id
		WHERE w.user_id = $1
		ORDER BY w.created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("list wishlist items: %w", err)
	}
	defer rows.Close()

	slugs := []string{}
	for rows.Next() {
		var slug string
		if err := rows.Scan(&slug); err != nil {
			return nil, fmt.Errorf("scan wishlist item: %w", err)
		}
		slugs = append(slugs, slug)
	}

	return slugs, rows.Err()
}
