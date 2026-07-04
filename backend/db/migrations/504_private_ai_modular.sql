-- 504 — Private AI: extended ai_mode values + per-tenant agent permission overrides

ALTER TABLE saas_private_ai_settings DROP CONSTRAINT IF EXISTS saas_private_ai_settings_ai_mode_check;

ALTER TABLE saas_private_ai_settings
  ADD CONSTRAINT saas_private_ai_settings_ai_mode_check
  CHECK (ai_mode IN ('unconfigured', 'stub', 'mock', 'auto', 'local', 'openai', 'anthropic'));

ALTER TABLE saas_private_ai_settings
  ALTER COLUMN ai_mode SET DEFAULT 'unconfigured';

CREATE TABLE IF NOT EXISTS saas_private_ai_agent_overrides (
  tenant_id     UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  agent_id      TEXT NOT NULL,
  enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  extra_tools   TEXT[] NOT NULL DEFAULT '{}',
  denied_tools  TEXT[] NOT NULL DEFAULT '{}',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_private_ai_agent_overrides_tenant
  ON saas_private_ai_agent_overrides(tenant_id);
