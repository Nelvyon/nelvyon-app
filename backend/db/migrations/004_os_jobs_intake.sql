-- Elite client intake snapshot on OS jobs (JSONB).
ALTER TABLE os_jobs ADD COLUMN IF NOT EXISTS intake JSONB;
