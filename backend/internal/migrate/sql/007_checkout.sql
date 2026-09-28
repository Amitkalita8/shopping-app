-- Checkout needs: one default address per user, and defaults/not-null on the order tables that
-- were, like carts and wishlist_items, created by hand with no defaults at all.

CREATE UNIQUE INDEX user_addresses_default_key ON user_addresses (user_id) WHERE is_default = TRUE;
UPDATE user_addresses SET created_at = NOW() WHERE created_at IS NULL;
UPDATE user_addresses SET updated_at = NOW() WHERE updated_at IS NULL;
ALTER TABLE user_addresses ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE user_addresses ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE user_addresses ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE user_addresses ALTER COLUMN updated_at SET NOT NULL;

UPDATE orders SET discount_amount = 0 WHERE discount_amount IS NULL;
UPDATE orders SET shipping_amount = 0 WHERE shipping_amount IS NULL;
UPDATE orders SET tax_amount = 0 WHERE tax_amount IS NULL;
ALTER TABLE orders ALTER COLUMN discount_amount SET DEFAULT 0;
ALTER TABLE orders ALTER COLUMN shipping_amount SET DEFAULT 0;
ALTER TABLE orders ALTER COLUMN tax_amount SET DEFAULT 0;
UPDATE orders SET created_at = NOW() WHERE created_at IS NULL;
UPDATE orders SET updated_at = NOW() WHERE updated_at IS NULL;
ALTER TABLE orders ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE orders ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE orders ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE orders ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE orders ADD CONSTRAINT orders_order_number_not_blank CHECK (order_number IS NOT NULL AND order_number <> '');

ALTER TABLE order_items ADD CONSTRAINT order_items_quantity_positive CHECK (quantity > 0);

CREATE UNIQUE INDEX payments_order_id_key ON payments (order_id);
