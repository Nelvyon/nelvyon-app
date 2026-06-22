-- MIG 325: Add missing subscriptions columns (workspace_id, current_period_start)
-- These were intended to be added by Alembic PR01 but never ran in production.
-- Using IF NOT EXISTS so this is safe to run multiple times.

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ;

-- Backfill current_period_start from created_at where null
UPDATE subscriptions
SET current_period_start = created_at
WHERE current_period_start IS NULL AND created_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_subscriptions_workspace_id
  ON subscriptions(workspace_id);
