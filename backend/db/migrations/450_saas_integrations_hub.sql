-- Migration 450: Integrations hub — unified connector table
CREATE TABLE IF NOT EXISTS saas_integration_connections (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL,
  connector_slug       TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'disconnected'
                         CHECK (status IN ('connected','disconnected','error','pending')),
  external_account_id  TEXT,
  external_account_name TEXT,
  access_token_enc     TEXT,
  refresh_token_enc    TEXT,
  scopes               JSONB NOT NULL DEFAULT '[]',
  metadata             JSONB NOT NULL DEFAULT '{}',
  last_sync_at         TIMESTAMPTZ,
  error_message        TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, connector_slug)
);

CREATE INDEX IF NOT EXISTS idx_integrations_tenant_status
  ON saas_integration_connections (tenant_id, status);
