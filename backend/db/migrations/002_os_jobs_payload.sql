-- OS jobs: persist dispatch payload for queue recovery after restart
ALTER TABLE os_jobs
  ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;
