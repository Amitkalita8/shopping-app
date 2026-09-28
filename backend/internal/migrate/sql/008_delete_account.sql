-- Deleting an account must not be blocked by, or destroy, its past orders: keep the order as a
-- business record and just drop the link to the account that no longer exists.
ALTER TABLE orders DROP CONSTRAINT orders_user_id_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_user_id_fkey
	FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL;
