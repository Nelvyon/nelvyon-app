-- AUTONOMOUS-PHASE-L: Learning Engine — template outcome persistence (isolated table).
-- No RLS en esta fase — no expuesta por API pública. Idempotente.

CREATE TABLE IF NOT EXISTS template_outcomes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        INTEGER,
  template_id         TEXT NOT NULL,
  category            TEXT NOT NULL,
  sector              TEXT NOT NULL,
  service             TEXT NOT NULL,
  objective           TEXT,
  channel             TEXT,
  language            TEXT,
  level               TEXT,
  qa_score            NUMERIC,
  approved_by_client  BOOLEAN,
  revisions_count     INTEGER NOT NULL DEFAULT 0,
  conversion_rate     NUMERIC,
  lead_count          INTEGER,
  client_rating       NUMERIC,
  delivery_time_hours NUMERIC,
  result_status       TEXT,
  notes               TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_template_outcomes_template_id
  ON template_outcomes (template_id);

CREATE INDEX IF NOT EXISTS idx_template_outcomes_sector
  ON template_outcomes (sector);

CREATE INDEX IF NOT EXISTS idx_template_outcomes_service
  ON template_outcomes (service);

CREATE INDEX IF NOT EXISTS idx_template_outcomes_category
  ON template_outcomes (category);

CREATE INDEX IF NOT EXISTS idx_template_outcomes_created_at
  ON template_outcomes (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_template_outcomes_sector_service_category
  ON template_outcomes (sector, service, category, created_at DESC);

COMMENT ON TABLE template_outcomes IS
  'AUTONOMOUS Phase L — resultados por plantilla para Learning Engine (sin RLS en L).';
