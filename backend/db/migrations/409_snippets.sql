-- Migration 409: Text snippets / canned responses
CREATE TABLE IF NOT EXISTS snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  shortcut TEXT,
  content TEXT NOT NULL,
  channels TEXT[] NOT NULL DEFAULT '{}',
  variables TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, shortcut)
);

CREATE INDEX IF NOT EXISTS idx_snippets_tenant ON snippets(tenant_id);
