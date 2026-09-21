-- products.price was NUMERIC(5,2), which tops out at 999.99: a Rs 2,949 saree cannot be stored.
-- Every other money column is NUMERIC(12,2).
ALTER TABLE products ALTER COLUMN price TYPE NUMERIC(12,2);
