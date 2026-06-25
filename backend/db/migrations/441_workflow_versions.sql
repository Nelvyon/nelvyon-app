-- S30: Workflow version snapshots

CREATE TABLE IF NOT EXISTS saas_workflow_versions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   TEXT        NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  workflow_id UUID        NOT NULL,
  version_num INTEGER     NOT NULL DEFAULT 1,
  snapshot    JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_wf_versions_workflow ON saas_workflow_versions(workflow_id, version_num DESC);
CREATE INDEX IF NOT EXISTS idx_saas_wf_versions_tenant   ON saas_workflow_versions(tenant_id);

-- Ensure saas_workflow_runs.steps_executed has trigger/action trace columns
-- (already exists; we add a comment for documentation only — no schema change needed)
