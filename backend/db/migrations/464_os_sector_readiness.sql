-- O16 — Sector readiness scorecard (20 verticals production-grade)
CREATE TABLE IF NOT EXISTS os_sector_readiness (
  sector_id            TEXT PRIMARY KEY,
  label                TEXT NOT NULL,
  sensitivity          TEXT NOT NULL DEFAULT 'medium',
  regulated            BOOLEAN NOT NULL DEFAULT false,
  seed_count           INT NOT NULL DEFAULT 0,
  envato_count         INT NOT NULL DEFAULT 0,
  agent_count          INT NOT NULL DEFAULT 0,
  has_portal_template  BOOLEAN NOT NULL DEFAULT false,
  has_qa_rubric        BOOLEAN NOT NULL DEFAULT false,
  readiness_score      INT NOT NULL DEFAULT 0,
  checklist            JSONB NOT NULL DEFAULT '[]',
  metadata             JSONB NOT NULL DEFAULT '{}',
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
