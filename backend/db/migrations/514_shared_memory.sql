-- 514: Shared Memory runtime (Phase 2 / ADR-024).
-- SSOT multi-agent memory with tenant isolation. Flag: NELVYON_SHARED_MEMORY_ENABLED.
-- Complements (does not replace) saas_tenant_memory_chunks (inbox KB adjunct).

CREATE TABLE IF NOT EXISTS saas_shared_memory_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  scope           TEXT NOT NULL CHECK (scope IN ('tenant','agent','workspace','shared_team','session','user')),
  visibility      TEXT NOT NULL CHECK (visibility IN ('private','agent_shared','tenant_shared')),
  kind            TEXT NOT NULL CHECK (kind IN ('fact','preference','decision','artifact_ref','conversation_summary','kpi_snapshot')),
  layer           TEXT NOT NULL DEFAULT 'ltm' CHECK (layer IN ('stm','ltm')),
  agent_id        TEXT,
  user_id         TEXT,
  workspace_id    UUID,
  session_id      TEXT,
  key             TEXT NOT NULL,
  title           TEXT NOT NULL DEFAULT '',
  content         TEXT NOT NULL,
  embedding_ref   TEXT,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at      TIMESTAMPTZ,
  created_by      TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version         INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_shared_memory_tenant_scope_key
  ON saas_shared_memory_entries (
    tenant_id,
    scope,
    key,
    (COALESCE(agent_id, '')),
    (COALESCE(session_id, '')),
    (COALESCE(user_id, ''))
  );

CREATE INDEX IF NOT EXISTS idx_shared_memory_tenant_updated
  ON saas_shared_memory_entries(tenant_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_shared_memory_tenant_agent
  ON saas_shared_memory_entries(tenant_id, agent_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_shared_memory_tenant_user
  ON saas_shared_memory_entries(tenant_id, user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_shared_memory_tenant_layer
  ON saas_shared_memory_entries(tenant_id, layer, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_shared_memory_tags
  ON saas_shared_memory_entries USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_shared_memory_expires
  ON saas_shared_memory_entries(expires_at)
  WHERE expires_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS saas_shared_memory_audit (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  entry_id     UUID,
  actor_id     TEXT NOT NULL,
  agent_id     TEXT,
  action       TEXT NOT NULL,
  preview      TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_memory_audit_tenant
  ON saas_shared_memory_audit(tenant_id, created_at DESC);
