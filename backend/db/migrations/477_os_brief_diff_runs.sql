-- O29 — Brief diff + linked pack re-run (intake before/after + rerun pack_run)
CREATE TABLE IF NOT EXISTS os_brief_diff_runs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_pack_run_id  UUID NOT NULL,
  new_pack_run_id     UUID,
  pack_id             TEXT NOT NULL,
  tenant_id           UUID,
  workspace_id        INT,
  before_intake       JSONB NOT NULL DEFAULT '{}',
  after_intake        JSONB NOT NULL DEFAULT '{}',
  diff                JSONB NOT NULL DEFAULT '[]',
  change_count        INT NOT NULL DEFAULT 0,
  material            BOOLEAN NOT NULL DEFAULT false,
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','compared','no_change','rerunning','completed','failed')),
  error_message       TEXT,
  requested_by          TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rerun_started_at    TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS os_brief_diff_runs_source
  ON os_brief_diff_runs (source_pack_run_id, created_at DESC);

CREATE INDEX IF NOT EXISTS os_brief_diff_runs_new_run
  ON os_brief_diff_runs (new_pack_run_id) WHERE new_pack_run_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS os_brief_diff_runs_status
  ON os_brief_diff_runs (status, created_at DESC);
