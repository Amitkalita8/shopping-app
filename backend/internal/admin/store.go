package admin

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	pool *pgxpool.Pool
}

type State struct {
	Settings    Settings      `json:"settings"`
	Content     Content       `json:"content"`
	Collections []Collection  `json:"collections"`
	Products    []Product     `json:"products"`
	Orders      []Order       `json:"orders"`
	Customers   []Customer    `json:"customers"`
	Policies    Policies      `json:"policies"`
}

type Settings struct {
	StoreName      string `json:"storeName"`
	SupportEmail   string `json:"supportEmail"`
	SupportPhone   string `json:"supportPhone"`
	SupportAddress string `json:"supportAddress"`
	CurrencyCode   string `json:"currencyCode"`
}

type Content struct {
	Announcement   string          `json:"announcement"`
	Hero           Hero            `json:"hero"`
	SpotlightCards []SpotlightCard `json:"spotlightCards"`
	Navigation     []Navigation    `json:"navigation"`
}

type Hero struct {
	Eyebrow        string `json:"eyebrow"`
	Title          string `json:"title"`
	Copy           string `json:"copy"`
	PrimaryLabel   string `json:"primaryLabel"`
	PrimaryPath    string `json:"primaryPath"`
	SecondaryLabel string `json:"secondaryLabel"`
	SecondaryPath  string `json:"secondaryPath"`
}

type SpotlightCard struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Copy  string `json:"copy"`
}

type Navigation struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	Path  string `json:"path"`
}

type Collection struct {
	ID          string   `json:"id"`
	Label       string   `json:"label"`
	Breadcrumb  string   `json:"breadcrumb"`
	Path        string   `json:"path"`
	Description string   `json:"description"`
	ProductIDs  []string `json:"productIds"`
	SortOptions []string `json:"sortOptions"`
}

type Product struct {
	ID         string  `json:"id"`
	Title      string  `json:"title"`
	Category   string  `json:"category"`
	Path       string  `json:"path"`
	Price      float64 `json:"price"`
	CompareAt  float64 `json:"compareAt"`
	Badge      string  `json:"badge"`
	Color      string  `json:"color"`
	Theme      string  `json:"theme"`
	Status     string  `json:"status"`
	Inventory  int     `json:"inventory"`
	SKU        string  `json:"sku"`
	ImageRef   string  `json:"imageRef"`
	GstRate    float64 `json:"gstRate"`
}

type Order struct {
	ID                string  `json:"id"`
	CustomerName      string  `json:"customerName"`
	CustomerEmail     string  `json:"customerEmail"`
	Items             string  `json:"items"`
	Total             float64 `json:"total"`
	PaymentStatus     string  `json:"paymentStatus"`
	FulfillmentStatus string  `json:"fulfillmentStatus"`
	TrackingNumber    string  `json:"trackingNumber"`
	CreatedAt         string  `json:"createdAt"`
	Notes             string  `json:"notes"`
}

type Customer struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Email       string  `json:"email"`
	Mobile      string  `json:"mobile"`
	City        string  `json:"city"`
	Tier        string  `json:"tier"`
	OrdersCount int     `json:"ordersCount"`
	TotalSpend  float64 `json:"totalSpend"`
	Status      string  `json:"status"`
}

type Policies struct {
	Returns string `json:"returns"`
	Terms   string `json:"terms"`
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

func (s *Store) LoadState(ctx context.Context) (State, error) {
	state := defaultState()

	if err := s.loadSettings(ctx, &state); err != nil {
		return State{}, err
	}
	if err := s.loadContent(ctx, &state); err != nil {
		return State{}, err
	}
	if err := s.loadPolicies(ctx, &state); err != nil {
		return State{}, err
	}
	if err := s.loadCollections(ctx, &state); err != nil {
		return State{}, err
	}
	if err := s.loadProducts(ctx, &state); err != nil {
		return State{}, err
	}
	if err := s.loadOrders(ctx, &state); err != nil {
		return State{}, err
	}
	if err := s.loadCustomers(ctx, &state); err != nil {
		return State{}, err
	}

	return state, nil
}

func (s *Store) SaveState(ctx context.Context, state State) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := upsertSetting(ctx, tx, "store_name", state.Settings.StoreName); err != nil {
		return err
	}
	if err := upsertSetting(ctx, tx, "support_email", state.Settings.SupportEmail); err != nil {
		return err
	}
	if err := upsertSetting(ctx, tx, "support_phone", state.Settings.SupportPhone); err != nil {
		return err
	}
	if err := upsertSetting(ctx, tx, "support_address", state.Settings.SupportAddress); err != nil {
		return err
	}
	if err := upsertSetting(ctx, tx, "currency_code", state.Settings.CurrencyCode); err != nil {
		return err
	}
	if err := upsertSetting(ctx, tx, "announcement", state.Content.Announcement); err != nil {
		return err
	}

	if err := upsertJSONSetting(ctx, tx, "hero_content_json", state.Content.Hero); err != nil {
		return err
	}
	if err := upsertJSONSetting(ctx, tx, "spotlight_cards_json", state.Content.SpotlightCards); err != nil {
		return err
	}
	if err := upsertJSONSetting(ctx, tx, "navigation_json", state.Content.Navigation); err != nil {
		return err
	}
	if err := s.saveCollections(ctx, tx, state.Collections); err != nil {
		return err
	}

	if err := upsertCMSPage(ctx, tx, "return-exchange-policy", "Return & Exchange Policy", state.Policies.Returns); err != nil {
		return err
	}
	if err := upsertCMSPage(ctx, tx, "terms-conditions", "Terms & Conditions", state.Policies.Terms); err != nil {
		return err
	}

	if err := s.saveProducts(ctx, tx, state.Products); err != nil {
		return err
	}
	if err := s.saveOrders(ctx, tx, state.Orders); err != nil {
		return err
	}
	if err := s.saveCustomers(ctx, tx, state.Customers); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}

	return nil
}

func defaultState() State {
	return State{
		Settings: Settings{
			StoreName:    "Atelier PS Vogue",
			CurrencyCode: "INR",
		},
		Content: Content{
			SpotlightCards: []SpotlightCard{},
			Navigation:     []Navigation{},
			Hero: Hero{
				PrimaryPath:   "/collections/traditional/sarees",
				SecondaryPath: "/collections/mens-collection/t-shirt",
			},
		},
		Collections: []Collection{},
		Products:    []Product{},
		Orders:      []Order{},
		Customers:   []Customer{},
	}
}

func (s *Store) loadSettings(ctx context.Context, state *State) error {
	rows, err := s.pool.Query(ctx, `
		SELECT setting_key, setting_value
		FROM site_settings
		WHERE setting_key IN ('store_name', 'support_email', 'support_phone', 'support_address', 'currency_code', 'announcement')
	`)
	if err != nil {
		return fmt.Errorf("load settings: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var key string
		var value string
		if err := rows.Scan(&key, &value); err != nil {
			return fmt.Errorf("scan setting: %w", err)
		}

		switch key {
		case "store_name":
			state.Settings.StoreName = value
		case "support_email":
			state.Settings.SupportEmail = value
		case "support_phone":
			state.Settings.SupportPhone = value
		case "support_address":
			state.Settings.SupportAddress = value
		case "currency_code":
			state.Settings.CurrencyCode = value
		case "announcement":
			state.Content.Announcement = value
		}
	}

	return rows.Err()
}

func (s *Store) loadContent(ctx context.Context, state *State) error {
	type rawSetting struct {
		Key   string
		Value string
	}

	rows, err := s.pool.Query(ctx, `
		SELECT setting_key, setting_value
		FROM site_settings
		WHERE setting_key IN ('hero_content_json', 'spotlight_cards_json', 'navigation_json')
	`)
	if err != nil {
		return fmt.Errorf("load content settings: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var item rawSetting
		if err := rows.Scan(&item.Key, &item.Value); err != nil {
			return fmt.Errorf("scan content setting: %w", err)
		}

		switch item.Key {
		case "hero_content_json":
			_ = json.Unmarshal([]byte(item.Value), &state.Content.Hero)
		case "spotlight_cards_json":
			_ = json.Unmarshal([]byte(item.Value), &state.Content.SpotlightCards)
		case "navigation_json":
			_ = json.Unmarshal([]byte(item.Value), &state.Content.Navigation)
		}
	}

	return rows.Err()
}

func (s *Store) loadPolicies(ctx context.Context, state *State) error {
	rows, err := s.pool.Query(ctx, `
		SELECT slug, content
		FROM cms_pages
		WHERE slug IN ('return-exchange-policy', 'terms-conditions')
	`)
	if err != nil {
		return fmt.Errorf("load cms pages: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var slug string
		var content string
		if err := rows.Scan(&slug, &content); err != nil {
			return fmt.Errorf("scan cms page: %w", err)
		}

		switch slug {
		case "return-exchange-policy":
			state.Policies.Returns = content
		case "terms-conditions":
			state.Policies.Terms = content
		}
	}

	return rows.Err()
}

func (s *Store) loadCollections(ctx context.Context, state *State) error {
	rows, err := s.pool.Query(ctx, `
		SELECT
			c.id::text,
			c.name,
			COALESCE(parent.name, c.name),
			'/collections/' || COALESCE(parent.slug || '/', '') || c.slug,
			COALESCE(c.description, ''),
			COALESCE(
				ARRAY(
					SELECT p.id::text
					FROM products p
					WHERE p.category_id = c.id
					ORDER BY p.name
				),
				ARRAY[]::text[]
			)
		FROM categories c
		LEFT JOIN categories parent ON parent.id = c.parent_id
		WHERE c.is_active = TRUE
			AND NOT EXISTS (
				SELECT 1
				FROM categories child
				WHERE child.parent_id = c.id AND child.is_active = TRUE
			)
		ORDER BY
			COALESCE(parent.sort_order, c.sort_order) NULLS LAST,
			COALESCE(parent.name, c.name),
			c.sort_order NULLS LAST,
			c.name
	`)
	if err != nil {
		return fmt.Errorf("load categories: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var collection Collection
		if err := rows.Scan(
			&collection.ID,
			&collection.Label,
			&collection.Breadcrumb,
			&collection.Path,
			&collection.Description,
			&collection.ProductIDs,
		); err != nil {
			return fmt.Errorf("scan category: %w", err)
		}
		collection.SortOptions = []string{"Featured", "Best selling", "Price, low to high"}
		state.Collections = append(state.Collections, collection)
	}

	return rows.Err()
}

func (s *Store) loadProducts(ctx context.Context, state *State) error {
	rows, err := s.pool.Query(ctx, `
		SELECT
			p.id::text,
			p.name,
			COALESCE(c.name, ''),
			COALESCE('/collections/' || COALESCE(pc.slug || '/', '') || c.slug, ''),
			COALESCE(p.price, 0),
			COALESCE(p.compare_price, 0),
			COALESCE(p.badge, ''),
			COALESCE(p.color, ''),
			COALESCE(p.theme, ''),
			CASE WHEN p.is_active THEN 'Active' ELSE 'Draft' END,
			COALESCE(i.stock_qty, 0),
			COALESCE(p.sku, ''),
			COALESCE(img.image_url, ''),
			COALESCE(p.gst_rate, 0)
		FROM products p
		LEFT JOIN categories c ON c.id = p.category_id
		LEFT JOIN categories pc ON pc.id = c.parent_id
		LEFT JOIN inventory i ON i.product_id = p.id
		LEFT JOIN LATERAL (
			SELECT image_url
			FROM product_images
			WHERE product_id = p.id
			ORDER BY is_primary DESC, sort_order ASC, id ASC
			LIMIT 1
		) img ON TRUE
		ORDER BY p.name
	`)
	if err != nil {
		return fmt.Errorf("load products: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var product Product
		if err := rows.Scan(
			&product.ID,
			&product.Title,
			&product.Category,
			&product.Path,
			&product.Price,
			&product.CompareAt,
			&product.Badge,
			&product.Color,
			&product.Theme,
			&product.Status,
			&product.Inventory,
			&product.SKU,
			&product.ImageRef,
			&product.GstRate,
		); err != nil {
			return fmt.Errorf("scan product: %w", err)
		}
		state.Products = append(state.Products, product)
	}

	return rows.Err()
}

func (s *Store) loadOrders(ctx context.Context, state *State) error {
	rows, err := s.pool.Query(ctx, `
		SELECT
			o.id::text,
			COALESCE(u.full_name, ''),
			COALESCE(u.email, ''),
			COALESCE(string_agg(oi.product_name || ' x' || oi.quantity::text, ', ' ORDER BY oi.id), ''),
			COALESCE(o.total_amount, 0),
			COALESCE(o.payment_status, ''),
			COALESCE(o.fulfillment_status, ''),
			COALESCE(s.tracking_number, ''),
			TO_CHAR(o.created_at, 'YYYY-MM-DD'),
			COALESCE(o.notes, '')
		FROM orders o
		LEFT JOIN users u ON u.id = o.user_id
		LEFT JOIN order_items oi ON oi.order_id = o.id
		LEFT JOIN LATERAL (
			SELECT tracking_number
			FROM shipments
			WHERE order_id = o.id
			ORDER BY id DESC
			LIMIT 1
		) s ON TRUE
		GROUP BY o.id, u.full_name, u.email, o.total_amount, o.payment_status, o.fulfillment_status, s.tracking_number, o.created_at, o.notes
		ORDER BY o.created_at DESC
	`)
	if err != nil {
		return fmt.Errorf("load orders: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var order Order
		if err := rows.Scan(
			&order.ID,
			&order.CustomerName,
			&order.CustomerEmail,
			&order.Items,
			&order.Total,
			&order.PaymentStatus,
			&order.FulfillmentStatus,
			&order.TrackingNumber,
			&order.CreatedAt,
			&order.Notes,
		); err != nil {
			return fmt.Errorf("scan order: %w", err)
		}
		state.Orders = append(state.Orders, order)
	}

	return rows.Err()
}

func (s *Store) loadCustomers(ctx context.Context, state *State) error {
	rows, err := s.pool.Query(ctx, `
		SELECT
			u.id::text,
			COALESCE(u.full_name, ''),
			COALESCE(u.email, ''),
			COALESCE(u.mobile, ''),
			COALESCE((
				SELECT ua.city
				FROM user_addresses ua
				WHERE ua.user_id = u.id
				ORDER BY ua.is_default DESC, ua.id ASC
				LIMIT 1
			), ''),
			CASE
				WHEN COALESCE(SUM(o.total_amount), 0) >= 10000 THEN 'Gold'
				WHEN COALESCE(SUM(o.total_amount), 0) >= 3000 THEN 'Silver'
				ELSE 'New'
			END,
			COALESCE(COUNT(o.id), 0)::int,
			COALESCE(SUM(o.total_amount), 0),
			CASE WHEN u.is_active THEN 'Active' ELSE 'Review' END
		FROM users u
		LEFT JOIN orders o ON o.user_id = u.id
		GROUP BY u.id, u.full_name, u.email, u.mobile, u.is_active
		ORDER BY u.created_at DESC
	`)
	if err != nil {
		return fmt.Errorf("load customers: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var customer Customer
		if err := rows.Scan(
			&customer.ID,
			&customer.Name,
			&customer.Email,
			&customer.Mobile,
			&customer.City,
			&customer.Tier,
			&customer.OrdersCount,
			&customer.TotalSpend,
			&customer.Status,
		); err != nil {
			return fmt.Errorf("scan customer: %w", err)
		}
		state.Customers = append(state.Customers, customer)
	}

	return rows.Err()
}
