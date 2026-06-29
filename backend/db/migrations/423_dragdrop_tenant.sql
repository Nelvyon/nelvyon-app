-- 423 — Add tenant_id to dragdrop_workflows (nullable for backward compat)
ALTER TABLE dragdrop_workflows
  ADD COLUMN IF NOT EXISTS tenant_id UUID;

CREATE INDEX IF NOT EXISTS idx_dragdrop_workflows_tenant
  ON dragdrop_workflows(tenant_id)
  WHERE tenant_id IS NOT NULL;

-- Workflow recipes catalog (saas-level, official + tenant custom)
CREATE TABLE IF NOT EXISTS saas_workflow_recipes (
  id           TEXT PRIMARY KEY,
  tenant_id    UUID,                          -- NULL = official/global
  name         TEXT NOT NULL,
  description  TEXT,
  category     TEXT NOT NULL DEFAULT 'general',
  trigger_type TEXT NOT NULL,
  nodes        JSONB NOT NULL DEFAULT '[]',
  edges        JSONB NOT NULL DEFAULT '[]',
  tags         TEXT[] NOT NULL DEFAULT '{}',
  is_official  BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_recipes_official ON saas_workflow_recipes(is_official) WHERE is_official = true;
CREATE INDEX IF NOT EXISTS idx_workflow_recipes_tenant ON saas_workflow_recipes(tenant_id) WHERE tenant_id IS NOT NULL;
