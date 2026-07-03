-- 497 — Moso-style shared tenant memory for all AI agents
CREATE TABLE IF NOT EXISTS saas_tenant_memory_settings (
  tenant_id           UUID PRIMARY KEY REFERENCES saas_tenants(id) ON DELETE CASCADE,
  max_chunks          INTEGER NOT NULL DEFAULT 200,
  auto_ingest_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saas_tenant_memory_chunks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  source      TEXT NOT NULL CHECK (source IN ('manual', 'inbox', 'pack', 'crm', 'import')),
  title       TEXT NOT NULL DEFAULT '',
  content     TEXT NOT NULL,
  tags        TEXT[] NOT NULL DEFAULT '{}',
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_memory_tenant_created
  ON saas_tenant_memory_chunks(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_memory_tenant_source
  ON saas_tenant_memory_chunks(tenant_id, source);
