-- 518: workflows columns required by FastAPI workflow_service.list_workflows
-- 507 already intended is_active; may be missing if 507 was marked applied mid-file.
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS runs_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS trigger_type VARCHAR;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS status VARCHAR;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
