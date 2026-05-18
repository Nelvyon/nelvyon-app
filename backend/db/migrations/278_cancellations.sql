-- MIG 278 — Voluntary cancellation + offboarding fields
ALTER TABLE nelvyon_users
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancellation_feedback text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS period_end_date timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_deletion_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_nelvyon_users_cancel_at_period_end
  ON nelvyon_users(cancel_at_period_end)
  WHERE cancel_at_period_end = true;
