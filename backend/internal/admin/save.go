package admin

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/jackc/pgx/v5"
)

func upsertSetting(ctx context.Context, tx pgx.Tx, key string, value string) error {
	_, err := tx.Exec(ctx, `
		INSERT INTO site_settings (setting_key, setting_value, updated_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (setting_key)
		DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
	`, key, value)
	if err != nil {
		return fmt.Errorf("upsert setting %s: %w", key, err)
	}

	return nil
}

func upsertJSONSetting(ctx context.Context, tx pgx.Tx, key string, value any) error {
	bytes, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("marshal %s: %w", key, err)
	}

	return upsertSetting(ctx, tx, key, string(bytes))
}

func upsertCMSPage(ctx context.Context, tx pgx.Tx, slug string, title string, content string) error {
	_, err := tx.Exec(ctx, `
		INSERT INTO cms_pages (slug, title, content, is_active, updated_at)
		VALUES ($1, $2, $3, TRUE, NOW())
		ON CONFLICT (slug)
		DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, is_active = TRUE, updated_at = NOW()
	`, slug, title, content)
	if err != nil {
		return fmt.Errorf("upsert cms page %s: %w", slug, err)
	}

	return nil
}

// saveCollections writes edited collection names and descriptions back to their categories,
// which is where the storefront reads them from. Only rows that already exist are updated.
func (s *Store) saveCollections(ctx context.Context, tx pgx.Tx, collections []Collection) error {
	for _, collection := range collections {
		categoryID, err := strconv.ParseInt(collection.ID, 10, 64)
		if err != nil {
			continue
		}

		_, err = tx.Exec(ctx, `
			UPDATE categories
			SET name = $2, description = $3, updated_at = NOW()
			WHERE id = $1
		`, categoryID, collection.Label, collection.Description)
		if err != nil {
			return fmt.Errorf("update collection %s: %w", collection.ID, err)
		}
	}

	return nil
}

func (s *Store) saveProducts(ctx context.Context, tx pgx.Tx, products []Product) error {
	for _, product := range products {
		productID, err := strconv.ParseInt(product.ID, 10, 64)
		if err != nil {
			continue
		}

		var categoryID *int64
		if product.Category != "" {
			var catID int64
			err := tx.QueryRow(ctx, `SELECT id FROM categories WHERE LOWER(name) = LOWER($1) LIMIT 1`, product.Category).Scan(&catID)
			if err == nil {
				categoryID = &catID
			}
		}

		_, err = tx.Exec(ctx, `
			UPDATE products
			SET
				category_id = $2,
				name = $3,
				sku = $4,
				price = $5,
				compare_price = $6,
				color = $7,
				badge = $8,
				theme = $9,
				gst_rate = $10,
				is_active = $11,
				updated_at = NOW()
			WHERE id = $1
		`,
			productID,
			categoryID,
			product.Title,
			product.SKU,
			product.Price,
			product.CompareAt,
			product.Color,
			product.Badge,
			product.Theme,
			product.GstRate,
			product.Status == "Active",
		)
		if err != nil {
			return fmt.Errorf("update product %s: %w", product.ID, err)
		}

		_, err = tx.Exec(ctx, `
			UPDATE inventory
			SET stock_qty = $2, updated_at = NOW()
			WHERE product_id = $1
		`, productID, product.Inventory)
		if err != nil {
			return fmt.Errorf("update inventory %s: %w", product.ID, err)
		}
	}

	return nil
}

func (s *Store) saveOrders(ctx context.Context, tx pgx.Tx, orders []Order) error {
	for _, order := range orders {
		orderID, err := strconv.ParseInt(order.ID, 10, 64)
		if err != nil {
			continue
		}

		_, err = tx.Exec(ctx, `
			UPDATE orders
			SET
				payment_status = $2,
				fulfillment_status = $3,
				total_amount = $4,
				notes = $5,
				updated_at = NOW()
			WHERE id = $1
		`, orderID, order.PaymentStatus, order.FulfillmentStatus, order.Total, order.Notes)
		if err != nil {
			return fmt.Errorf("update order %s: %w", order.ID, err)
		}

		if order.TrackingNumber != "" {
			_, err = tx.Exec(ctx, `
				UPDATE shipments
				SET tracking_number = $2
				WHERE order_id = $1
			`, orderID, order.TrackingNumber)
			if err != nil {
				return fmt.Errorf("update shipment %s: %w", order.ID, err)
			}
		}
	}

	return nil
}

func (s *Store) saveCustomers(ctx context.Context, tx pgx.Tx, customers []Customer) error {
	for _, customer := range customers {
		customerID, err := strconv.ParseInt(customer.ID, 10, 64)
		if err != nil {
			continue
		}

		_, err = tx.Exec(ctx, `
			UPDATE users
			SET
				full_name = $2,
				email = $3,
				mobile = $4,
				is_active = $5,
				updated_at = NOW()
			WHERE id = $1
		`, customerID, customer.Name, customer.Email, customer.Mobile, customer.Status == "Active")
		if err != nil {
			return fmt.Errorf("update customer %s: %w", customer.ID, err)
		}

		_, err = tx.Exec(ctx, `
			UPDATE user_addresses
			SET city = $2, updated_at = NOW()
			WHERE user_id = $1 AND is_default = TRUE
		`, customerID, customer.City)
		if err != nil {
			return fmt.Errorf("update customer address %s: %w", customer.ID, err)
		}
	}

	return nil
}
