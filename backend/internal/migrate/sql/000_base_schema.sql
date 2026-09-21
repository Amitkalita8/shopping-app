-- The tables as they existed before the first migration (they were created by hand in pgAdmin).
-- Everything below runs only on an empty database; where the tables already exist it does nothing.
-- Migrations 001-005 then bring either kind of database to the same state.
-- Deliberately not "fixed" here: the columns named or typed wrongly are corrected by 002 and 004.

DO $$
BEGIN
	IF to_regclass('public.users') IS NULL THEN
		CREATE TABLE admin_audit_logs (
			id BIGSERIAL PRIMARY KEY,
			admin_user_id BIGINT,
			action VARCHAR(100),
			table_name VARCHAR(100),
			record_id VARCHAR(100),
			old_data JSONB,
			new_data JSONB,
			created_at TIMESTAMPTZ
		);

		CREATE TABLE carts (
			id BIGSERIAL PRIMARY KEY,
			user_id BIGINT,
			session_id VARCHAR(255),
			status VARCHAR(20),
			created_at TIMESTAMPTZ,
			updated_at TIMESTAMPTZ
		);

		CREATE TABLE carts_items (
			id BIGSERIAL PRIMARY KEY,
			cart_id BIGINT,
			product_id BIGINT,
			quantity INTEGER,
			unit_price NUMERIC(12,2),
			created_at TIMESTAMPTZ,
			updated_at TIMESTAMPTZ
		);

		CREATE TABLE categories (
			id BIGSERIAL PRIMARY KEY,
			name VARCHAR(150),
			slug VARCHAR(180),
			parent_id BIGSERIAL NOT NULL,
			description TEXT,
			image_url TEXT,
			sort_order INTEGER,
			is_active BOOLEAN,
			created_at TIMESTAMPTZ,
			updated_at TIMESTAMPTZ
		);

		CREATE TABLE cms_pages (
			id BIGSERIAL PRIMARY KEY,
			title VARCHAR(200),
			slug VARCHAR(220),
			content TEXT,
			meta_title VARCHAR(255),
			meta_description TEXT,
			is_active BOOLEAN,
			updated_at TIMESTAMPTZ
		);

		CREATE TABLE content_queries (
			id BIGSERIAL PRIMARY KEY,
			name VARCHAR(150),
			email VARCHAR(255),
			mobile VARCHAR(20),
			subject VARCHAR(200),
			message TEXT,
			status VARCHAR(20),
			created_at TIMESTAMPTZ
		);

		CREATE TABLE coupons (
			id BIGSERIAL PRIMARY KEY,
			code VARCHAR(50),
			discount_type VARCHAR(20),
			discount_value NUMERIC(12,2),
			min_order_amount NUMERIC(12,2),
			max_discount NUMERIC(12,2),
			start_date TIMESTAMPTZ,
			end_date TIMESTAMPTZ,
			usage_limit INTEGER,
			is_active BOOLEAN
		);

		CREATE TABLE inventory (
			id BIGSERIAL PRIMARY KEY,
			product_id BIGINT,
			stock_qty INTEGER,
			reserved_qty INTEGER,
			low_stock_threshold INTEGER,
			stock_status VARCHAR(20),
			updated_at TIMESTAMPTZ
		);

		CREATE TABLE order_items (
			id BIGSERIAL PRIMARY KEY,
			order_id BIGINT,
			product_id BIGINT,
			product_name VARCHAR(200),
			sku VARCHAR(100),
			quantity INTEGER,
			unit_price NUMERIC(12,2),
			tax_amount NUMERIC(12,2),
			total_price NUMERIC(12,2)
		);

		CREATE TABLE orders (
			id BIGSERIAL PRIMARY KEY,
			order_number VARCHAR(50),
			user_id BIGINT,
			billing_addess_id BIGINT,
			shipping_address_id BIGINT,
			subtotal NUMERIC(12,2),
			discount_amount NUMERIC(12,2),
			shipping_amount NUMERIC(12,2),
			tax_amount NUMERIC(12,2),
			total_amount NUMERIC(12,2),
			payment_status VARCHAR(20),
			order_status VARCHAR(30),
			fulfillment_status VARCHAR(30),
			notes TEXT,
			created_at TIMESTAMPTZ,
			updated_at TIMESTAMPTZ
		);

		CREATE TABLE payments (
			id BIGSERIAL PRIMARY KEY,
			order_id BIGINT,
			payment_method VARCHAR(50),
			transaction_id VARCHAR(150),
			amount NUMERIC(12,2),
			currency VARCHAR(10),
			payment_status VARCHAR(20),
			paid_at TIMESTAMPTZ,
			gateway_response JSONB
		);

		CREATE TABLE product_images (
			id BIGSERIAL PRIMARY KEY,
			product_id BIGINT,
			image_url TEXT,
			alt_text VARCHAR(255),
			sort_order INTEGER,
			is_primary BOOLEAN,
			created_at TIMESTAMPTZ
		);

		CREATE TABLE product_variants (
			id BIGSERIAL PRIMARY KEY,
			product_id BIGINT,
			variant_name VARCHAR(150),
			sku VARCHAR(100),
			price NUMERIC(12,2),
			compare_price NUMERIC(12,2),
			stock_qty INTEGER,
			is_active BOOLEAN
		);

		CREATE TABLE products (
			id BIGSERIAL PRIMARY KEY,
			category_id BIGSERIAL NOT NULL,
			name VARCHAR(200),
			slug VARCHAR(220),
			sku VARCHAR(100),
			short_description TEXT,
			description TEXT,
			price NUMERIC(5,2),
			compare_price NUMERIC(12,2),
			cost_price NUMERIC(12,2),
			color VARCHAR(100),
			badge VARCHAR(100),
			theme VARCHAR(50),
			gst_rate NUMERIC(5,2),
			is_active BOOLEAN,
			is_featured BOOLEAN,
			created_at TIMESTAMPTZ,
			updated_at TIMESTAMPTZ
		);

		CREATE TABLE returns (
			id BIGSERIAL PRIMARY KEY,
			order_id BIGINT,
			order_item_id BIGINT,
			user_id BIGINT,
			reason TEXT,
			return_type VARCHAR(20),
			status VARCHAR(30),
			requested_at TIMESTAMPTZ,
			approved_at TIMESTAMPTZ,
			closed_at TIMESTAMPTZ
		);

		CREATE TABLE reviews (
			id BIGSERIAL PRIMARY KEY,
			product_id BIGINT,
			user_id BIGINT,
			rating SMALLINT,
			title VARCHAR(200),
			comment TEXT,
			is_approved BOOLEAN,
			created_at TIMESTAMPTZ
		);

		CREATE TABLE shipments (
			id BIGSERIAL PRIMARY KEY,
			order_id BIGINT,
			courier_name VARCHAR(100),
			tracking_number VARCHAR(100),
			shipping_status VARCHAR(30),
			shipped_at TIMESTAMPTZ,
			delivered_at TIMESTAMPTZ
		);

		CREATE TABLE site_settings (
			id BIGSERIAL PRIMARY KEY,
			setting_key VARCHAR(100),
			setting_value TEXT,
			updated_at TIMESTAMPTZ
		);

		CREATE TABLE user_addresses (
			id BIGSERIAL PRIMARY KEY,
			user_id BIGINT,
			full_name VARCHAR(150),
			mobile VARCHAR(20),
			address_line1 VARCHAR(255),
			address_line2 VARCHAR(255),
			landmark VARCHAR(255),
			city VARCHAR(100),
			state VARCHAR(100),
			country VARCHAR(100),
			is_default BOOLEAN,
			address_type VARCHAR(20),
			created_at TIMESTAMPTZ,
			updated_at TIMESTAMPTZ
		);

		CREATE TABLE users (
			id BIGSERIAL PRIMARY KEY,
			full_name VARCHAR(150),
			mobile VARCHAR(20),
			email VARCHAR(255),
			password_hash VARCHAR(255),
			role VARCHAR(20),
			is_active BOOLEAN,
			email_verified BOOLEAN,
			mobile_verified BOOLEAN,
			created_at TIMESTAMPTZ,
			updated_at TIMESTAMPTZ
		);

		CREATE TABLE wishlist_items (
			id BIGSERIAL PRIMARY KEY,
			user_id BIGINT,
			product_id BIGINT,
			created_at TIMESTAMPTZ
		);
	END IF;
END $$;
