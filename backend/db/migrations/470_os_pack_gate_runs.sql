-- O22 — OS pack gate run audit (blocking CI 8-pack validate)
CREATE TABLE IF NOT EXISTS os_pack_gate_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_key         TEXT NOT NULL,
  trigger_source  TEXT NOT NULL DEFAULT 'ci'
                  CHECK (trigger_source IN ('ci','manual','cron')),
  status          TEXT NOT NULL DEFAULT 'running'
                  CHECK (status IN ('running','passed','failed')),
  packs_total     INT NOT NULL DEFAULT 8,
  packs_passed    INT NOT NULL DEFAULT 0,
  packs_failed    INT NOT NULL DEFAULT 0,
  checks          JSONB NOT NULL DEFAULT '[]',
  error_message   TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS os_pack_gate_runs_started
  ON os_pack_gate_runs (started_at DESC);
