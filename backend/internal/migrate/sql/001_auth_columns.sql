-- Columns and indexes that email/password and Google login need.
-- Idempotent: these were previously applied by the auth package on startup.

ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_type VARCHAR(20) NOT NULL DEFAULT 'normal';
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gst_number VARCHAR(20);
ALTER TABLE user_addresses ADD COLUMN IF NOT EXISTS pincode VARCHAR(12);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON users (LOWER(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_mobile_key ON users (mobile) WHERE mobile IS NOT NULL AND mobile <> '';
CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_key ON users (google_id) WHERE google_id IS NOT NULL;
