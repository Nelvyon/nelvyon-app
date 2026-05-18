-- MIG 270: email verification for signup
ALTER TABLE nelvyon_users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verification_token TEXT,
  ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMPTZ;

-- Existing accounts are treated as verified
UPDATE nelvyon_users SET email_verified = true WHERE email_verified = false;

CREATE INDEX IF NOT EXISTS idx_users_email_verification_token
  ON nelvyon_users(email_verification_token)
  WHERE email_verification_token IS NOT NULL;
