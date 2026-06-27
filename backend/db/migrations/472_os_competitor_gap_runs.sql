-- O24 — Competitor gap analysis runs (URL → gaps → pack recommendation)
CREATE TABLE IF NOT EXISTS os_competitor_gap_runs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_key             TEXT NOT NULL,
  tenant_id           UUID,
  workspace_id        INT,
  own_domain          TEXT NOT NULL,
  competitor_url      TEXT NOT NULL,
  competitor_domain   TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'running'
                      CHECK (status IN ('running','completed','failed')),
  gaps                JSONB NOT NULL DEFAULT '[]',
  gap_score           NUMERIC,
  recommended_pack_id TEXT,
  recommended_skus    JSONB NOT NULL DEFAULT '[]',
  agent_data          JSONB NOT NULL DEFAULT '{}',
  report_html         TEXT,
  pack_run_id         UUID,
  launch_id           UUID,
  error_message       TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}',
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS os_competitor_gap_runs_started
  ON os_competitor_gap_runs (started_at DESC);
