-- 517: reconcile workspaces tenant extension columns (FastAPI SQLAlchemy model)
-- Root cause: legacy/partial workspaces table existed before 479 columns applied
-- (CREATE TABLE IF NOT EXISTS skipped full shape). Model requires timezone/locale/etc.
-- Idempotent ADD COLUMN IF NOT EXISTS — safe on already-complete schemas.

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS timezone VARCHAR;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS locale VARCHAR;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS industry VARCHAR;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS billing_email VARCHAR;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS max_users INTEGER;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS features_json TEXT;
