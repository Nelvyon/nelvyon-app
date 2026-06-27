-- O17 — Pack E2E certification (8 runners verified end-to-end)
CREATE TABLE IF NOT EXISTS os_pack_certifications (
  pack_id             TEXT PRIMARY KEY,
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','running','passed','failed')),
  last_run_id         UUID,
  qa_score            INT,
  legal_passed        BOOLEAN,
  steps_completed     INT NOT NULL DEFAULT 0,
  steps_total         INT NOT NULL DEFAULT 0,
  deliverables_count  INT NOT NULL DEFAULT 0,
  auto_approved       BOOLEAN NOT NULL DEFAULT false,
  failure_reason      TEXT,
  run_duration_ms     INT,
  certified_at        TIMESTAMPTZ,
  last_checked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata            JSONB NOT NULL DEFAULT '{}'
);
