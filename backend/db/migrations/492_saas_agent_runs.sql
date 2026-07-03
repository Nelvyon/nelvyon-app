-- S58 — Agent execution log (UI /saas/agentes + /api/saas/agentes/execute)
CREATE TABLE IF NOT EXISTS saas_agent_runs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  agent_id    TEXT NOT NULL,
  input       TEXT NOT NULL,
  output      TEXT,
  status      TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed')),
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_agent_runs_tenant_created
  ON saas_agent_runs (tenant_id, created_at DESC);
