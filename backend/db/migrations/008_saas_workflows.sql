-- SaaS workflows engine tables
CREATE TABLE IF NOT EXISTS saas_workflows (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  description    TEXT,
  status         TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft','active','paused','archived')),
  trigger_type   TEXT NOT NULL
                 CHECK (trigger_type IN ('contact_created','contact_updated','stage_changed','job_completed','manual','scheduled')),
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  conditions     JSONB NOT NULL DEFAULT '[]'::jsonb,
  actions        JSONB NOT NULL DEFAULT '[]'::jsonb,
  run_count      INTEGER NOT NULL DEFAULT 0,
  last_run_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_workflows_tenant ON saas_workflows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saas_workflows_status ON saas_workflows(tenant_id, status);

CREATE TABLE IF NOT EXISTS saas_workflow_runs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id    UUID NOT NULL REFERENCES saas_workflows(id) ON DELETE CASCADE,
  tenant_id      UUID NOT NULL,
  trigger_data   JSONB NOT NULL DEFAULT '{}'::jsonb,
  status         TEXT NOT NULL DEFAULT 'running'
                 CHECK (status IN ('running','completed','failed')),
  steps_executed JSONB NOT NULL DEFAULT '[]'::jsonb,
  error          TEXT,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_saas_workflow_runs_workflow_started
  ON saas_workflow_runs(workflow_id, started_at DESC);
