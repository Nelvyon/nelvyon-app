-- O28 — Agent audit trail (agent → input versions → output → QA per SKU, append-only)
CREATE TABLE IF NOT EXISTS os_agent_audit_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_run_id           UUID NOT NULL,
  sku                   TEXT NOT NULL,
  tenant_id             UUID,
  workspace_id          INT,
  agent_id              TEXT NOT NULL,
  step_order            INT NOT NULL DEFAULT 0,
  input_artifact_versions JSONB NOT NULL DEFAULT '{}',
  output_artifact       TEXT NOT NULL,
  output_version        INT NOT NULL DEFAULT 1,
  model                 TEXT NOT NULL DEFAULT 'mock-rules-v1',
  tokens                INT NOT NULL DEFAULT 0,
  llm_mode              TEXT CHECK (llm_mode IN ('mock','real')),
  agent_status          TEXT NOT NULL DEFAULT 'success'
                        CHECK (agent_status IN ('success','failed')),
  qa_score              INT,
  qa_passed             BOOLEAN,
  started_at            TIMESTAMPTZ,
  ended_at              TIMESTAMPTZ,
  metadata              JSONB NOT NULL DEFAULT '{}',
  recorded_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS os_agent_audit_events_pack_run
  ON os_agent_audit_events (pack_run_id, sku, step_order);

CREATE INDEX IF NOT EXISTS os_agent_audit_events_agent
  ON os_agent_audit_events (agent_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS os_agent_audit_events_recorded
  ON os_agent_audit_events (recorded_at DESC);
