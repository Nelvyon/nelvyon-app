-- O18 — Visual QA gate audit trail (screenshot/content hash + lighthouse proxy + legal)
CREATE TABLE IF NOT EXISTS os_qa_audit_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_run_id       UUID,
  deliverable_ref   TEXT,
  tenant_id         TEXT,
  workspace_id      INT,
  visual_score      INT NOT NULL,
  lighthouse_score  INT,
  legal_passed      BOOLEAN NOT NULL DEFAULT false,
  content_hash      TEXT,
  baseline_hash     TEXT,
  diff_percent      NUMERIC(5,2),
  gate_status       TEXT NOT NULL DEFAULT 'pending'
                    CHECK (gate_status IN ('pending','passed','failed','blocked')),
  failure_reasons   JSONB NOT NULL DEFAULT '[]',
  checks            JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS os_qa_audit_runs_pack_run
  ON os_qa_audit_runs (pack_run_id, created_at DESC);
