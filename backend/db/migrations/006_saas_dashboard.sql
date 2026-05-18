-- SaaS dashboard activity stream
CREATE TABLE IF NOT EXISTS saas_activity_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL,
  description  TEXT NOT NULL,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_activity_tenant_created
  ON saas_activity_log(tenant_id, created_at DESC);
