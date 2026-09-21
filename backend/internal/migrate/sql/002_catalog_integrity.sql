-- Catalog and order integrity: fixes, unique rules, foreign keys, and the category tree.

-- 1. parent_id / category_id were created as auto-numbering, NOT NULL columns, so a row inserted
--    without a value silently received a made-up id, and top-level categories (no parent) and
--    unassigned products (which the admin supports) were impossible. They must be nullable references.
ALTER TABLE categories ALTER COLUMN parent_id DROP DEFAULT;
ALTER TABLE categories ALTER COLUMN parent_id DROP NOT NULL;
DROP SEQUENCE IF EXISTS categories_parent_id_seq;
ALTER TABLE products ALTER COLUMN category_id DROP DEFAULT;
ALTER TABLE products ALTER COLUMN category_id DROP NOT NULL;
DROP SEQUENCE IF EXISTS products_category_id_seq;

-- 2. Typo: billing_addess_id -> billing_address_id.
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'billing_addess_id'
	) THEN
		ALTER TABLE orders RENAME COLUMN billing_addess_id TO billing_address_id;
	END IF;
END $$;

-- 3. Unique rules. The admin saves rely on ON CONFLICT (setting_key) and ON CONFLICT (slug),
--    which need real unique constraints on exactly those columns.
ALTER TABLE site_settings ADD CONSTRAINT site_settings_setting_key_key UNIQUE (setting_key);
ALTER TABLE cms_pages ADD CONSTRAINT cms_pages_slug_key UNIQUE (slug);
ALTER TABLE inventory ADD CONSTRAINT inventory_product_id_key UNIQUE (product_id);
ALTER TABLE coupons ADD CONSTRAINT coupons_code_key UNIQUE (code);
ALTER TABLE orders ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);

CREATE UNIQUE INDEX products_slug_key ON products (slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX products_sku_key ON products (sku) WHERE sku IS NOT NULL AND sku <> '';
CREATE UNIQUE INDEX product_variants_sku_key ON product_variants (sku) WHERE sku IS NOT NULL AND sku <> '';

-- A slug only has to be unique among siblings ("t-shirt" exists under both Men's and Women).
CREATE UNIQUE INDEX categories_parent_slug_key ON categories (COALESCE(parent_id, 0), slug);
-- Names are unique because the admin matches a product's category by name.
CREATE UNIQUE INDEX categories_name_key ON categories (LOWER(name));

-- 4. Foreign keys. CASCADE where a row means nothing without its parent, RESTRICT (the default)
--    where deleting would destroy history, SET NULL where the record should outlive the link.
ALTER TABLE categories ADD CONSTRAINT categories_parent_id_fkey
	FOREIGN KEY (parent_id) REFERENCES categories (id);
ALTER TABLE categories ADD CONSTRAINT categories_not_own_parent
	CHECK (parent_id IS NULL OR parent_id <> id);

ALTER TABLE products ADD CONSTRAINT products_category_id_fkey
	FOREIGN KEY (category_id) REFERENCES categories (id);
ALTER TABLE product_images ADD CONSTRAINT product_images_product_id_fkey
	FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE;
ALTER TABLE product_variants ADD CONSTRAINT product_variants_product_id_fkey
	FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE;
ALTER TABLE inventory ADD CONSTRAINT inventory_product_id_fkey
	FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE;

ALTER TABLE user_addresses ADD CONSTRAINT user_addresses_user_id_fkey
	FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE carts ADD CONSTRAINT carts_user_id_fkey
	FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE carts_items ADD CONSTRAINT carts_items_cart_id_fkey
	FOREIGN KEY (cart_id) REFERENCES carts (id) ON DELETE CASCADE;
ALTER TABLE carts_items ADD CONSTRAINT carts_items_product_id_fkey
	FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE;
ALTER TABLE wishlist_items ADD CONSTRAINT wishlist_items_user_id_fkey
	FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE wishlist_items ADD CONSTRAINT wishlist_items_product_id_fkey
	FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE;
ALTER TABLE reviews ADD CONSTRAINT reviews_product_id_fkey
	FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE;
ALTER TABLE reviews ADD CONSTRAINT reviews_user_id_fkey
	FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;

ALTER TABLE orders ADD CONSTRAINT orders_user_id_fkey
	FOREIGN KEY (user_id) REFERENCES users (id);
ALTER TABLE orders ADD CONSTRAINT orders_billing_address_id_fkey
	FOREIGN KEY (billing_address_id) REFERENCES user_addresses (id) ON DELETE SET NULL;
ALTER TABLE orders ADD CONSTRAINT orders_shipping_address_id_fkey
	FOREIGN KEY (shipping_address_id) REFERENCES user_addresses (id) ON DELETE SET NULL;
ALTER TABLE order_items ADD CONSTRAINT order_items_order_id_fkey
	FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE;
ALTER TABLE order_items ADD CONSTRAINT order_items_product_id_fkey
	FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL;
ALTER TABLE payments ADD CONSTRAINT payments_order_id_fkey
	FOREIGN KEY (order_id) REFERENCES orders (id);
ALTER TABLE shipments ADD CONSTRAINT shipments_order_id_fkey
	FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE;
ALTER TABLE returns ADD CONSTRAINT returns_order_id_fkey
	FOREIGN KEY (order_id) REFERENCES orders (id);
ALTER TABLE returns ADD CONSTRAINT returns_order_item_id_fkey
	FOREIGN KEY (order_item_id) REFERENCES order_items (id);
ALTER TABLE returns ADD CONSTRAINT returns_user_id_fkey
	FOREIGN KEY (user_id) REFERENCES users (id);
ALTER TABLE admin_audit_logs ADD CONSTRAINT admin_audit_logs_admin_user_id_fkey
	FOREIGN KEY (admin_user_id) REFERENCES users (id) ON DELETE SET NULL;

-- 5. Category tree matching the storefront: 4 top-level groups, 9 sub-categories.
--    Products belong to a sub-category (Accessories has none, so it holds products directly).
--    Names are unique, so the two "T shirt" categories are named per audience.
INSERT INTO categories (name, slug, parent_id, description, sort_order, is_active, created_at, updated_at)
SELECT v.name, v.slug, NULL::bigint, v.description, v.sort_order, TRUE, NOW(), NOW()
FROM (VALUES
	('Men''s collection', 'mens-collection', 'Relaxed everyday T shirts and polished shirts.', 1),
	('Women Western', 'women-western', 'Western wear: T shirts, tops and bottoms.', 2),
	('Traditional', 'traditional', 'Kurti sets, kurtis, sarees and Mekhela Sador.', 3),
	('Accessories', 'accessories', 'Bags, jewelry and finishing touches.', 4)
) AS v (name, slug, description, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.parent_id IS NULL AND c.slug = v.slug);

INSERT INTO categories (name, slug, parent_id, description, sort_order, is_active, created_at, updated_at)
SELECT v.name, v.slug, p.id, v.description, v.sort_order, TRUE, NOW(), NOW()
FROM (VALUES
	('mens-collection', 'Men''s T shirt', 't-shirt', 'Soft basics, oversized fits, and clean casual layers for the everyday menswear edit.', 1),
	('mens-collection', 'Men''s Shirt', 'shirt', 'Polished shirts for work, weekends, and everything in between.', 2),
	('women-western', 'Women''s T shirt', 't-shirt', 'Easy everyday T shirts with relaxed fits and clean finishing.', 1),
	('women-western', 'Women''s Top', 'top', 'Draped tops and easy occasion-ready silhouettes with polished finishing.', 2),
	('women-western', 'Women''s Bottoms', 'bottoms', 'Comfortable, well-cut bottoms to pair with every top.', 3),
	('traditional', 'Kurti sets', 'kurti-sets', 'Coordinated kurti sets that come together in one easy outfit.', 1),
	('traditional', 'Single kurti', 'single-kurti', 'Standalone kurtis in everyday and festive styles.', 2),
	('traditional', 'Sarees', 'sarees', 'Festive sarees with premium drape, occasion styling, and statement detailing.', 3),
	('traditional', 'Mekhela Sador', 'mekhela-sador', 'Traditional Assamese Mekhela Sador for weddings, festivals and special occasions.', 4)
) AS v (parent_slug, name, slug, description, sort_order)
JOIN categories p ON p.parent_id IS NULL AND p.slug = v.parent_slug
WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.parent_id = p.id AND c.slug = v.slug);
