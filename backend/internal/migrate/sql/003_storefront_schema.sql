-- Schema the storefront needs to render entirely from the database.

-- Product copy that used to be generated in the browser, and an explicit display order.
ALTER TABLE products ADD COLUMN fabric_details TEXT;
ALTER TABLE products ADD COLUMN shipping_details TEXT;
ALTER TABLE products ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

-- Short label for the sidebar ("T shirt" under Men's collection) while name stays unique ("Men's T shirt").
ALTER TABLE categories ADD COLUMN menu_label VARCHAR(100);

CREATE INDEX products_category_sort_idx ON products (category_id, sort_order);
CREATE INDEX product_images_product_id_idx ON product_images (product_id, sort_order);

-- Curated blocks on the home page: one 'strip' of featured cards plus titled 'grid' sections.
CREATE TABLE home_sections (
	id BIGSERIAL PRIMARY KEY,
	title VARCHAR(150) NOT NULL,
	path VARCHAR(255),
	layout VARCHAR(20) NOT NULL DEFAULT 'grid' CHECK (layout IN ('strip', 'grid')),
	sort_order INTEGER NOT NULL DEFAULT 0,
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE home_section_products (
	section_id BIGINT NOT NULL REFERENCES home_sections (id) ON DELETE CASCADE,
	product_id BIGINT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
	sort_order INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY (section_id, product_id)
);

CREATE INDEX home_section_products_product_id_idx ON home_section_products (product_id);
