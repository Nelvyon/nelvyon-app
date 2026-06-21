-- MIG 324: password reset tokens
ALTER TABLE nelvyon_users
  ADD COLUMN IF NOT EXISTS password_reset_token TEXT,
  ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_password_reset_token
  ON nelvyon_users(password_reset_token)
  WHERE password_reset_token IS NOT NULL;
