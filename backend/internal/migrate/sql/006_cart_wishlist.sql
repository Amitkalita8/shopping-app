-- Carts and wishlist_items existed with no defaults and no upsert-friendly unique keys, so the
-- API could not tell "add one more of this product" from "add this product for the first time".

UPDATE carts SET status = 'active' WHERE status IS NULL;
ALTER TABLE carts ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE carts ALTER COLUMN status SET NOT NULL;
UPDATE carts SET created_at = NOW() WHERE created_at IS NULL;
UPDATE carts SET updated_at = NOW() WHERE updated_at IS NULL;
ALTER TABLE carts ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE carts ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE carts ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE carts ALTER COLUMN updated_at SET NOT NULL;

-- One active cart per signed-in user, so "find or create the cart" is race-free.
CREATE UNIQUE INDEX carts_user_active_key ON carts (user_id) WHERE status = 'active' AND user_id IS NOT NULL;

DELETE FROM carts_items WHERE quantity IS NULL OR quantity < 1;
ALTER TABLE carts_items ALTER COLUMN quantity SET DEFAULT 1;
ALTER TABLE carts_items ALTER COLUMN quantity SET NOT NULL;
ALTER TABLE carts_items ADD CONSTRAINT carts_items_quantity_positive CHECK (quantity > 0);
UPDATE carts_items SET created_at = NOW() WHERE created_at IS NULL;
UPDATE carts_items SET updated_at = NOW() WHERE updated_at IS NULL;
ALTER TABLE carts_items ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE carts_items ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE carts_items ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE carts_items ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE carts_items ADD CONSTRAINT carts_items_cart_product_key UNIQUE (cart_id, product_id);

UPDATE wishlist_items SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE wishlist_items ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE wishlist_items ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE wishlist_items ADD CONSTRAINT wishlist_items_user_product_key UNIQUE (user_id, product_id);
