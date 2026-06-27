-- O20 — Learning loop production run log + seed learning rank persistence
CREATE TABLE IF NOT EXISTS os_learning_run_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_key       TEXT NOT NULL,
  trigger_source   TEXT NOT NULL DEFAULT 'cron'
                   CHECK (trigger_source IN ('cron','manual','autopilot')),
  status           TEXT NOT NULL DEFAULT 'running'
                   CHECK (status IN ('running','completed','failed','skipped')),
  ga4_users        INT NOT NULL DEFAULT 0,
  sectors_updated  INT NOT NULL DEFAULT 0,
  templates_ranked INT NOT NULL DEFAULT 0,
  seeds_reranked   INT NOT NULL DEFAULT 0,
  error_message    TEXT,
  metadata         JSONB NOT NULL DEFAULT '{}',
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS os_learning_run_log_period
  ON os_learning_run_log (period_key, trigger_source);

-- Persist GA4-driven learning rank/score on the envato seed registry (O15).
ALTER TABLE os_envato_seed_registry
  ADD COLUMN IF NOT EXISTS learning_rank INT,
  ADD COLUMN IF NOT EXISTS learning_score NUMERIC(6,4);

CREATE INDEX IF NOT EXISTS os_envato_seed_registry_sector_rank
  ON os_envato_seed_registry (sector, learning_rank NULLS LAST);
