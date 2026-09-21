package storefront

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

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

// Load reads all storefront content in one read-only transaction, so a page never mixes
// data from before and after an admin save.
func (s *Store) Load(ctx context.Context) (Bundle, error) {
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly})
	if err != nil {
		return Bundle{}, fmt.Errorf("begin read tx: %w", err)
	}
	defer tx.Rollback(ctx)

	in := snapshot{Settings: map[string]string{}}

	if err := readSettings(ctx, tx, in.Settings); err != nil {
		return Bundle{}, err
	}
	if in.Categories, err = readCategories(ctx, tx); err != nil {
		return Bundle{}, err
	}
	if in.Products, err = readProducts(ctx, tx); err != nil {
		return Bundle{}, err
	}
	if in.Images, err = readImages(ctx, tx); err != nil {
		return Bundle{}, err
	}
	if in.Home, err = readHome(ctx, tx); err != nil {
		return Bundle{}, err
	}
	if in.Pages, err = readPages(ctx, tx); err != nil {
		return Bundle{}, err
	}

	return assemble(in), nil
}

func readSettings(ctx context.Context, tx pgx.Tx, into map[string]string) error {
	rows, err := tx.Query(ctx, `SELECT setting_key, COALESCE(setting_value, '') FROM site_settings`)
	if err != nil {
		return fmt.Errorf("load settings: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			return fmt.Errorf("scan setting: %w", err)
		}
		into[key] = value
	}

	return rows.Err()
}

func readCategories(ctx context.Context, tx pgx.Tx) ([]categoryRow, error) {
	rows, err := tx.Query(ctx, `
		SELECT id, parent_id, slug, name, COALESCE(menu_label, ''), COALESCE(description, '')
		FROM categories
		WHERE is_active = TRUE
		ORDER BY COALESCE(sort_order, 0), name
	`)
	if err != nil {
		return nil, fmt.Errorf("load categories: %w", err)
	}
	defer rows.Close()

	var result []categoryRow
	for rows.Next() {
		var row categoryRow
		if err := rows.Scan(&row.ID, &row.ParentID, &row.Slug, &row.Name, &row.MenuLabel, &row.Description); err != nil {
			return nil, fmt.Errorf("scan category: %w", err)
		}
		result = append(result, row)
	}

	return result, rows.Err()
}

func readProducts(ctx context.Context, tx pgx.Tx) ([]productRow, error) {
	rows, err := tx.Query(ctx, `
		SELECT
			id, category_id, slug, name,
			COALESCE(price, 0), COALESCE(compare_price, 0),
			COALESCE(badge, ''), COALESCE(color, ''), COALESCE(theme, ''),
			COALESCE(description, ''), COALESCE(fabric_details, ''), COALESCE(shipping_details, '')
		FROM products
		WHERE is_active = TRUE AND slug IS NOT NULL
		ORDER BY sort_order, id
	`)
	if err != nil {
		return nil, fmt.Errorf("load products: %w", err)
	}
	defer rows.Close()

	var result []productRow
	for rows.Next() {
		var row productRow
		if err := rows.Scan(
			&row.ID, &row.CategoryID, &row.Slug, &row.Title,
			&row.Price, &row.CompareAt,
			&row.Badge, &row.Color, &row.Theme,
			&row.About, &row.Fabric, &row.Shipping,
		); err != nil {
			return nil, fmt.Errorf("scan product: %w", err)
		}
		result = append(result, row)
	}

	return result, rows.Err()
}

func readImages(ctx context.Context, tx pgx.Tx) ([]imageRow, error) {
	rows, err := tx.Query(ctx, `
		SELECT product_id, image_url, COALESCE(alt_text, '')
		FROM product_images
		WHERE image_url IS NOT NULL AND image_url <> ''
		ORDER BY product_id, is_primary DESC NULLS LAST, sort_order NULLS LAST, id
	`)
	if err != nil {
		return nil, fmt.Errorf("load product images: %w", err)
	}
	defer rows.Close()

	var result []imageRow
	for rows.Next() {
		var row imageRow
		if err := rows.Scan(&row.ProductID, &row.URL, &row.Alt); err != nil {
			return nil, fmt.Errorf("scan product image: %w", err)
		}
		result = append(result, row)
	}

	return result, rows.Err()
}

func readHome(ctx context.Context, tx pgx.Tx) ([]homeRow, error) {
	rows, err := tx.Query(ctx, `
		SELECT s.id, s.title, COALESCE(s.path, ''), s.layout, COALESCE(p.slug, '')
		FROM home_sections s
		LEFT JOIN home_section_products hp ON hp.section_id = s.id
		LEFT JOIN products p ON p.id = hp.product_id AND p.is_active = TRUE
		WHERE s.is_active = TRUE
		ORDER BY s.sort_order, s.id, hp.sort_order
	`)
	if err != nil {
		return nil, fmt.Errorf("load home sections: %w", err)
	}
	defer rows.Close()

	var result []homeRow
	for rows.Next() {
		var row homeRow
		if err := rows.Scan(&row.SectionID, &row.Title, &row.Path, &row.Layout, &row.ProductSlug); err != nil {
			return nil, fmt.Errorf("scan home section: %w", err)
		}
		result = append(result, row)
	}

	return result, rows.Err()
}

func readPages(ctx context.Context, tx pgx.Tx) ([]pageRow, error) {
	rows, err := tx.Query(ctx, `
		SELECT slug, COALESCE(title, ''), COALESCE(content, '')
		FROM cms_pages
		WHERE is_active = TRUE AND slug IN ('return-exchange-policy', 'terms-conditions')
	`)
	if err != nil {
		return nil, fmt.Errorf("load cms pages: %w", err)
	}
	defer rows.Close()

	var result []pageRow
	for rows.Next() {
		var row pageRow
		if err := rows.Scan(&row.Slug, &row.Title, &row.Content); err != nil {
			return nil, fmt.Errorf("scan cms page: %w", err)
		}
		result = append(result, row)
	}

	return result, rows.Err()
}
