-- NELVYON OS jobs — Postgres source of truth (v1)
CREATE TABLE os_jobs (
  job_id        TEXT PRIMARY KEY,
  service_id    TEXT NOT NULL,
  client_id     TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'queued',
  progress      INTEGER NOT NULL DEFAULT 0,
  steps         JSONB NOT NULL DEFAULT '[]',
  result        JSONB,
  error         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_os_jobs_client ON os_jobs (client_id);
CREATE INDEX idx_os_jobs_status ON os_jobs (status);
CREATE INDEX idx_os_jobs_service ON os_jobs (service_id);
CREATE INDEX idx_os_jobs_created ON os_jobs (created_at DESC);
