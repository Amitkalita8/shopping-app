-- Moves every piece of static storefront data into the database.
-- Generated from the original frontend data files (storeData.js, the collection pages, the policy text).

-- 1. Sidebar labels and collection page copy, exactly as the site showed them.
UPDATE categories SET menu_label = 'Accessories', description = 'Jewelry and styling extras now open as their own page from the sidebar instead of sharing space with other categories.', updated_at = NOW() WHERE slug = 'accessories' AND parent_id IS NULL;
UPDATE categories SET menu_label = 'Kurti sets', description = 'Coordinated festive and printed kurti sets, each shown inside a dedicated traditional category page.', updated_at = NOW() WHERE slug = 'kurti-sets' AND parent_id = (SELECT id FROM categories WHERE parent_id IS NULL AND slug = 'traditional');
UPDATE categories SET menu_label = 'Mekhela Sador', description = 'A dedicated Assam-inspired page for Mekhela Sador sets with the same shopping flow as the other collections.', updated_at = NOW() WHERE slug = 'mekhela-sador' AND parent_id = (SELECT id FROM categories WHERE parent_id IS NULL AND slug = 'traditional');
UPDATE categories SET menu_label = 'Shirt', description = 'A sharper shirt lineup with resort stripes, everyday oxfords, and smart casual finishes.', updated_at = NOW() WHERE slug = 'shirt' AND parent_id = (SELECT id FROM categories WHERE parent_id IS NULL AND slug = 'mens-collection');
UPDATE categories SET menu_label = 'T shirt', description = 'Soft basics, oversized fits, and clean casual layers for the everyday menswear edit.', updated_at = NOW() WHERE slug = 't-shirt' AND parent_id = (SELECT id FROM categories WHERE parent_id IS NULL AND slug = 'mens-collection');
UPDATE categories SET menu_label = 'Sarees', description = 'The saree page now sits directly under the Traditional menu, without the oversized View as strip.', updated_at = NOW() WHERE slug = 'sarees' AND parent_id = (SELECT id FROM categories WHERE parent_id IS NULL AND slug = 'traditional');
UPDATE categories SET menu_label = 'Single kurti', description = 'Everyday and embellished single kurti styles grouped into a simpler browse flow.', updated_at = NOW() WHERE slug = 'single-kurti' AND parent_id = (SELECT id FROM categories WHERE parent_id IS NULL AND slug = 'traditional');
UPDATE categories SET menu_label = 'Bottoms', description = 'Tailored and fluid bottoms built as their own route instead of being mixed into other pages.', updated_at = NOW() WHERE slug = 'bottoms' AND parent_id = (SELECT id FROM categories WHERE parent_id IS NULL AND slug = 'women-western');
UPDATE categories SET menu_label = 'Top', description = 'Satin drapes, wrap shapes, and polished tops styled as a dedicated western category page.', updated_at = NOW() WHERE slug = 'top' AND parent_id = (SELECT id FROM categories WHERE parent_id IS NULL AND slug = 'women-western');
UPDATE categories SET menu_label = 'T shirt', description = 'Easy western basics with ribbed fits, relaxed silhouettes, and lighter everyday styling.', updated_at = NOW() WHERE slug = 't-shirt' AND parent_id = (SELECT id FROM categories WHERE parent_id IS NULL AND slug = 'women-western');

-- 2. Products (20), in the order the site listed them.
WITH leaf AS (
	SELECT c.id, COALESCE(parent.slug || '/', '') || c.slug AS path
	FROM categories c
	LEFT JOIN categories parent ON parent.id = c.parent_id
)
INSERT INTO products (
	category_id, name, slug, sku, description, fabric_details, shipping_details,
	price, compare_price, color, badge, theme, is_active, sort_order, created_at, updated_at
)
SELECT leaf.id, v.name, v.slug, v.sku, v.description, v.fabric, v.shipping,
	v.price, v.compare_price, v.color, v.badge, v.theme, TRUE, v.sort_order, NOW(), NOW()
FROM (VALUES
	('mens-collection/t-shirt', 'Men''s Classic Cotton T Shirt', 'mens-classic-cotton-tshirt', 'MEN-TS-001', 'Men''s Classic Cotton T Shirt is designed as an easy wardrobe staple with a clean silhouette and all-day comfort.', 'Soft-touch fabric with a comfortable drape, breathable feel, and everyday wear construction.', 'Ships in 2-4 working days with prepaid offers, easy exchanges, and support for most serviceable pincodes.', 899::numeric, 1499::numeric, 'Charcoal', 'Best Seller', 'midnight', 1),
	('mens-collection/t-shirt', 'Men''s Graphic Oversized T Shirt', 'mens-graphic-oversized-tshirt', 'MEN-TS-002', 'Men''s Graphic Oversized T Shirt is designed as an easy wardrobe staple with a clean silhouette and all-day comfort.', 'Soft-touch fabric with a comfortable drape, breathable feel, and everyday wear construction.', 'Ships in 2-4 working days with prepaid offers, easy exchanges, and support for most serviceable pincodes.', 999::numeric, 1699::numeric, 'Stone', 'New', 'sand', 2),
	('mens-collection/shirt', 'Men''s Striped Resort Shirt', 'mens-resort-shirt', 'MEN-SH-001', 'Men''s Striped Resort Shirt is designed as an easy wardrobe staple with a clean silhouette and all-day comfort.', 'Soft-touch fabric with a comfortable drape, breathable feel, and everyday wear construction.', 'Ships in 2-4 working days with prepaid offers, easy exchanges, and support for most serviceable pincodes.', 1299::numeric, 1899::numeric, 'Blue Ivory', 'Trending', 'royal', 3),
	('mens-collection/shirt', 'Men''s Oxford Everyday Shirt', 'mens-oxford-shirt', 'MEN-SH-002', 'Men''s Oxford Everyday Shirt is designed as an easy wardrobe staple with a clean silhouette and all-day comfort.', 'Soft-touch fabric with a comfortable drape, breathable feel, and everyday wear construction.', 'Ships in 2-4 working days with prepaid offers, easy exchanges, and support for most serviceable pincodes.', 1499::numeric, 2199::numeric, 'Powder Blue', 'Smart Casual', 'sage', 4),
	('women-western/t-shirt', 'Women''s Ribbed T Shirt', 'women-ribbed-tshirt', 'WOM-TS-001', 'Women''s Ribbed T Shirt is part of the women western edit, built for easy styling from daywear to dressier moments.', 'Selected for a polished finish, comfortable wear, and a shape that holds well through repeated use.', 'Ships in 2-4 working days with reliable delivery updates and simple return support where available.', 749::numeric, 1199::numeric, 'Ivory', 'Daily Wear', 'rose', 5),
	('women-western/t-shirt', 'Women''s Oversized Drop-Shoulder T Shirt', 'women-oversized-tshirt', 'WOM-TS-002', 'Women''s Oversized Drop-Shoulder T Shirt is part of the women western edit, built for easy styling from daywear to dressier moments.', 'Selected for a polished finish, comfortable wear, and a shape that holds well through repeated use.', 'Ships in 2-4 working days with reliable delivery updates and simple return support where available.', 849::numeric, 1299::numeric, 'Mauve', 'New', 'plum', 6),
	('women-western/top', 'Women''s Satin Drape Top', 'women-satin-top', 'WOM-TOP-001', 'Women''s Satin Drape Top is part of the women western edit, built for easy styling from daywear to dressier moments.', 'Selected for a polished finish, comfortable wear, and a shape that holds well through repeated use.', 'Ships in 2-4 working days with reliable delivery updates and simple return support where available.', 1199::numeric, 1799::numeric, 'Rose Gold', 'Popular', 'rose', 7),
	('women-western/top', 'Women''s Wrap Tie Top', 'women-wrap-top', 'WOM-TOP-002', 'Women''s Wrap Tie Top is part of the women western edit, built for easy styling from daywear to dressier moments.', 'Selected for a polished finish, comfortable wear, and a shape that holds well through repeated use.', 'Ships in 2-4 working days with reliable delivery updates and simple return support where available.', 1099::numeric, 1649::numeric, 'Coral', 'Fresh Drop', 'terracotta', 8),
	('women-western/bottoms', 'Women''s Pleated Wide-Leg Bottoms', 'women-pleated-bottoms', 'WOM-BTM-001', 'Women''s Pleated Wide-Leg Bottoms is part of the women western edit, built for easy styling from daywear to dressier moments.', 'Selected for a polished finish, comfortable wear, and a shape that holds well through repeated use.', 'Ships in 2-4 working days with reliable delivery updates and simple return support where available.', 1399::numeric, 1999::numeric, 'Taupe', 'Popular', 'mustard', 9),
	('women-western/bottoms', 'Women''s Tailored Straight Bottoms', 'women-tailored-bottoms', 'WOM-BTM-002', 'Women''s Tailored Straight Bottoms is part of the women western edit, built for easy styling from daywear to dressier moments.', 'Selected for a polished finish, comfortable wear, and a shape that holds well through repeated use.', 'Ships in 2-4 working days with reliable delivery updates and simple return support where available.', 1299::numeric, 1899::numeric, 'Sand', 'Wardrobe Staple', 'sand', 10),
	('traditional/kurti-sets', 'Festive Kurti Set With Dupatta', 'festive-kurti-set', 'TRD-KS-001', 'Festive Kurti Set With Dupatta is part of the traditional edit, chosen for occasion-ready styling, strong visual detail, and elevated finishing.', 'Features a premium festive drape with decorative detailing and a blouse or matching styling component where applicable.', 'Ships in 2-4 working days with secure packaging, free-shipping support on qualifying orders, and return assistance on eligible items.', 2299::numeric, 3499::numeric, 'Mustard', '54% OFF', 'mustard', 11),
	('traditional/kurti-sets', 'Printed Kurti Set With Trousers', 'printed-kurti-set', 'TRD-KS-002', 'Printed Kurti Set With Trousers is part of the traditional edit, chosen for occasion-ready styling, strong visual detail, and elevated finishing.', 'Features a premium festive drape with decorative detailing and a blouse or matching styling component where applicable.', 'Ships in 2-4 working days with secure packaging, free-shipping support on qualifying orders, and return assistance on eligible items.', 1999::numeric, 2999::numeric, 'Olive', 'Bestseller', 'emerald', 12),
	('traditional/single-kurti', 'Printed Everyday Single Kurti', 'everyday-single-kurti', 'TRD-SK-001', 'Printed Everyday Single Kurti is part of the traditional edit, chosen for occasion-ready styling, strong visual detail, and elevated finishing.', 'Features a premium festive drape with decorative detailing and a blouse or matching styling component where applicable.', 'Ships in 2-4 working days with secure packaging, free-shipping support on qualifying orders, and return assistance on eligible items.', 999::numeric, 1499::numeric, 'Teal', 'Daily Wear', 'emerald', 13),
	('traditional/single-kurti', 'Embroidered Statement Single Kurti', 'embroidered-single-kurti', 'TRD-SK-002', 'Embroidered Statement Single Kurti is part of the traditional edit, chosen for occasion-ready styling, strong visual detail, and elevated finishing.', 'Features a premium festive drape with decorative detailing and a blouse or matching styling component where applicable.', 'Ships in 2-4 working days with secure packaging, free-shipping support on qualifying orders, and return assistance on eligible items.', 1199::numeric, 1799::numeric, 'Wine', 'Festive', 'maroon', 14),
	('traditional/sarees', 'Banarasi Silk Saree With Blouse Piece', 'banarasi-saree', 'TRD-SAR-001', 'Banarasi Silk Saree With Blouse Piece is part of the traditional edit, chosen for occasion-ready styling, strong visual detail, and elevated finishing.', 'Features a premium festive drape with decorative detailing and a blouse or matching styling component where applicable.', 'Ships in 2-4 working days with secure packaging, free-shipping support on qualifying orders, and return assistance on eligible items.', 2949::numeric, 6749::numeric, 'Maroon', '56% OFF', 'maroon', 15),
	('traditional/sarees', 'Pure Tissue Silk Saree With Brocade', 'tissue-saree', 'TRD-SAR-002', 'Pure Tissue Silk Saree With Brocade is part of the traditional edit, chosen for occasion-ready styling, strong visual detail, and elevated finishing.', 'Features a premium festive drape with decorative detailing and a blouse or matching styling component where applicable.', 'Ships in 2-4 working days with secure packaging, free-shipping support on qualifying orders, and return assistance on eligible items.', 2699::numeric, 4299::numeric, 'Lavender', 'New', 'lavender', 16),
	('traditional/mekhela-sador', 'Assamese Mekhela Sador Set', 'mekhela-sador-cream', 'TRD-MS-001', 'Assamese Mekhela Sador Set is part of the traditional edit, chosen for occasion-ready styling, strong visual detail, and elevated finishing.', 'Features a premium festive drape with decorative detailing and a blouse or matching styling component where applicable.', 'Ships in 2-4 working days with secure packaging, free-shipping support on qualifying orders, and return assistance on eligible items.', 3299::numeric, 4799::numeric, 'Cream Gold', 'Handpicked', 'sand', 17),
	('traditional/mekhela-sador', 'Ruby Border Mekhela Sador', 'mekhela-sador-ruby', 'TRD-MS-002', 'Ruby Border Mekhela Sador is part of the traditional edit, chosen for occasion-ready styling, strong visual detail, and elevated finishing.', 'Features a premium festive drape with decorative detailing and a blouse or matching styling component where applicable.', 'Ships in 2-4 working days with secure packaging, free-shipping support on qualifying orders, and return assistance on eligible items.', 3499::numeric, 5099::numeric, 'Ruby', 'Occasion Wear', 'terracotta', 18),
	('accessories', 'Temple Jewelry Styling Set', 'temple-jewelry-set', 'ACC-JWL-001', 'Temple Jewelry Styling Set is a styling-ready accessory selected to pair easily with festive and occasion looks.', 'Crafted with decorative finishing, structured detailing, and a premium presentation suitable for event styling.', 'Ships in 2-4 working days with careful packaging and easy return support across eligible pincodes.', 1599::numeric, 2399::numeric, 'Antique Gold', 'Accessorize', 'mustard', 19),
	('accessories', 'Embroidered Potli Bag', 'embroidered-potli-bag', 'ACC-BAG-001', 'Embroidered Potli Bag is a styling-ready accessory selected to pair easily with festive and occasion looks.', 'Crafted with decorative finishing, structured detailing, and a premium presentation suitable for event styling.', 'Ships in 2-4 working days with careful packaging and easy return support across eligible pincodes.', 899::numeric, 1299::numeric, 'Rust Gold', 'New', 'terracotta', 20)
) AS v (path, name, slug, sku, description, fabric, shipping, price, compare_price, color, badge, theme, sort_order)
JOIN leaf ON leaf.path = v.path;

DO $$
BEGIN
	IF (SELECT COUNT(*) FROM products) <> 20 THEN
		RAISE EXCEPTION 'expected 20 seeded products, found %', (SELECT COUNT(*) FROM products);
	END IF;
END $$;

-- 3. Images (the file name is resolved to a bundled asset by the frontend) and starting stock.
INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary, created_at)
SELECT p.id, v.image, p.name, 0, TRUE, NOW()
FROM (VALUES
	('mens-classic-cotton-tshirt', 'mens-tshirt-real.png'),
	('mens-graphic-oversized-tshirt', 'mens-tshirt-real.png'),
	('mens-resort-shirt', 'mens-shirt-real.png'),
	('mens-oxford-shirt', 'mens-shirt-real.png'),
	('women-ribbed-tshirt', 'women-tshirt-real.png'),
	('women-oversized-tshirt', 'women-tshirt-real.png'),
	('women-satin-top', 'women-top-real.png'),
	('women-wrap-top', 'women-top-real.png'),
	('women-pleated-bottoms', 'women-bottoms-real.png'),
	('women-tailored-bottoms', 'women-bottoms-real.png'),
	('festive-kurti-set', 'kurti-set-real.png'),
	('printed-kurti-set', 'kurti-set-real.png'),
	('everyday-single-kurti', 'single-kurti-real.png'),
	('embroidered-single-kurti', 'single-kurti-real.png'),
	('banarasi-saree', 'banarasi-saree-real.png'),
	('tissue-saree', 'tissue-saree-real.png'),
	('mekhela-sador-cream', 'mekhela-sador-real.png'),
	('mekhela-sador-ruby', 'mekhela-sador-real.png'),
	('temple-jewelry-set', 'temple-jewelry-real.png'),
	('embroidered-potli-bag', 'potli-bag-real.png')
) AS v (slug, image)
JOIN products p ON p.slug = v.slug;

-- The site had no stock levels; every product starts with a placeholder quantity of 10 for the admin to adjust.
INSERT INTO inventory (product_id, stock_qty, reserved_qty, low_stock_threshold, stock_status, updated_at)
SELECT id, 10, 0, 3, 'in_stock', NOW() FROM products;

-- 4. Home page blocks.
INSERT INTO home_sections (title, path, layout, sort_order) VALUES
	('Featured', NULL, 'strip', 1),
	('Men''s and Western Edits', '/collections/women-western/top', 'grid', 2),
	('Traditional Picks', '/collections/traditional/sarees', 'grid', 3);

INSERT INTO home_section_products (section_id, product_id, sort_order)
SELECT s.id, p.id, v.sort_order
FROM (VALUES
	('Featured', 'banarasi-saree', 1),
	('Featured', 'festive-kurti-set', 2),
	('Featured', 'mens-resort-shirt', 3),
	('Featured', 'women-satin-top', 4),
	('Men''s and Western Edits', 'mens-classic-cotton-tshirt', 1),
	('Men''s and Western Edits', 'mens-resort-shirt', 2),
	('Men''s and Western Edits', 'women-satin-top', 3),
	('Men''s and Western Edits', 'women-pleated-bottoms', 4),
	('Traditional Picks', 'festive-kurti-set', 1),
	('Traditional Picks', 'embroidered-single-kurti', 2),
	('Traditional Picks', 'banarasi-saree', 3),
	('Traditional Picks', 'mekhela-sador-cream', 4)
) AS v (section_title, slug, sort_order)
JOIN home_sections s ON s.title = v.section_title
JOIN products p ON p.slug = v.slug;

-- 5. Site settings and content blocks (keys the admin panel already reads and writes).
INSERT INTO site_settings (setting_key, setting_value, updated_at) VALUES
	('store_name', 'Atelier PS Vogue', NOW()),
	('support_email', 'support@atelierpsvogue.com', NOW()),
	('support_phone', '+91 98765 43210', NOW()),
	('support_address', 'GS Road, Guwahati, Assam 781005', NOW()),
	('currency_code', 'INR', NOW()),
	('announcement', 'Get upto 15% OFF + 200Rs extra discounts on all prepaid orders.', NOW()),
	('hero_content_json', $json${"eyebrow":"Editorial storefront","title":"Sharper category pages, cleaner routing, and the old sidebar structure back in place.","copy":"Browse the exact sidebar groups you asked for, open dedicated URLs for each option, and move straight into product pages without the extra View as strip.","primaryLabel":"Shop Sarees","primaryPath":"/collections/traditional/sarees","secondaryLabel":"Browse Men's T shirts","secondaryPath":"/collections/mens-collection/t-shirt"}$json$, NOW()),
	('spotlight_cards_json', $json$[{"id":"spotlight-men","title":"Men's Collection","copy":"Relaxed everyday T shirts and polished shirts grouped under one quick drawer section."},{"id":"spotlight-traditional","title":"Traditional Edit","copy":"Kurti sets, single kurtis, sarees, and Mekhela Sador each get their own route and page."}]$json$, NOW()),
	('navigation_json', $json$[{"id":"nav-men","label":"Men's collection","path":"/collections/mens-collection/t-shirt"},{"id":"nav-women","label":"Women Western","path":"/collections/women-western/t-shirt"},{"id":"nav-traditional","label":"Traditional","path":"/collections/traditional/sarees"},{"id":"nav-accessories","label":"Accessories","path":"/collections/accessories"}]$json$, NOW()),
	('product_page_json', $json${"shippingNote":"Inclusive of all taxes. Free shipping above Rs 1500.","trustPoints":["Authentic and quality assured","100% money back guarantee on eligible orders","Free shipping and returns on qualifying products"],"offerTitle":"Also get extra instant Rs 200 off on prepaid orders.","offerCopy":"Prices mentioned are inclusive of all taxes and special offer handling."}$json$, NOW()),
	('social_links_json', $json$[{"id":"instagram","label":"Instagram","shortLabel":"ig","url":""},{"id":"facebook","label":"Facebook","shortLabel":"fb","url":""},{"id":"pinterest","label":"Pinterest","shortLabel":"pi","url":""},{"id":"youtube","label":"YouTube","shortLabel":"yt","url":""}]$json$, NOW());

-- 6. Policies. Blocks are separated by a blank line; "## Heading" starts a titled block and "- " lines are list items.
INSERT INTO cms_pages (title, slug, content, is_active, updated_at) VALUES
	('Return & Exchange Policy', 'return-exchange-policy', $policy$## Returns & Exchanges
- Products can be returned or exchanged within 7 days of delivery.
- Items must be unused, unwashed, undamaged, and in their original packaging with all tags attached.
- A valid order number or proof of purchase is required.

## Non-Returnable Items
- Used, washed, or damaged products.
- Products without original tags or packaging.
- Customized or personalized items.
- Earrings and certain accessories due to hygiene reasons.

## Damaged or Wrong Products
If you receive a damaged, defective, or incorrect product, please contact us within 48 hours of delivery with photographs of the item and packaging. We will arrange a replacement or refund after verification.

## Refunds
- Once the returned product is received and inspected, the refund will be processed.
- Refunds will be credited to the original payment method within 7–10 business days.
- Shipping charges, if any, are non-refundable unless the return is due to our error.

## Contact Us
For return or exchange requests, please contact our customer support team with your order details.$policy$, TRUE, NOW()),
	('Terms & Conditions', 'terms-conditions', $policy$Welcome to our website. By accessing or using this website, you agree to comply with and be bound by the following Terms & Conditions.

## Account Registration
- Users must provide accurate and complete information during registration.
- Users are responsible for maintaining the confidentiality of their account credentials.
- The company reserves the right to suspend or terminate accounts containing false or misleading information.

## Product Information
- We strive to ensure that all product descriptions, specifications, and prices are accurate.
- However, we reserve the right to modify product information, pricing, or availability without prior notice.

## Orders and Acceptance
- Submission of an order does not guarantee acceptance.
- The company reserves the right to reject or cancel any order at its discretion.

## Payments
- All payments must be made through approved payment methods available on the website.
- Orders will be processed only after successful payment confirmation, where applicable.

## Intellectual Property
All content on this website, including text, images, logos, designs, and trademarks, is the property of the company and may not be copied, reproduced, or distributed without prior written permission.

## User Conduct
Users shall not engage in any activity that may harm, disrupt, or interfere with the website or its services. Any misuse, unauthorized access, or fraudulent activity may result in legal action.

## Privacy
Personal information collected through the website will be handled in accordance with our Privacy Policy.

## Limitation of Liability
The company shall not be liable for any direct, indirect, incidental, or consequential damages arising from the use of this website or its services.

## Changes to Terms
The company reserves the right to update or modify these Terms & Conditions at any time without prior notice.

## Governing Law
These Terms & Conditions shall be governed by and interpreted in accordance with the laws of India.

By registering on or using this website, you acknowledge that you have read, understood, and agreed to these Terms & Conditions.$policy$, TRUE, NOW());
