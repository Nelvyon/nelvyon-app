-- MIG 283 — GDPR data subject fields + retention markers for OS jobs/results
ALTER TABLE nelvyon_users
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS data_export_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS anonymized_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_nelvyon_users_scheduled_deletion
  ON nelvyon_users(scheduled_deletion_at)
  WHERE scheduled_deletion_at IS NOT NULL;

ALTER TABLE os_job_results
  ADD COLUMN IF NOT EXISTS scheduled_deletion_at timestamptz;

ALTER TABLE os_jobs
  ADD COLUMN IF NOT EXISTS scheduled_deletion_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_os_job_results_scheduled_deletion
  ON os_job_results(scheduled_deletion_at)
  WHERE scheduled_deletion_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_os_jobs_scheduled_deletion
  ON os_jobs(scheduled_deletion_at)
  WHERE scheduled_deletion_at IS NOT NULL;
