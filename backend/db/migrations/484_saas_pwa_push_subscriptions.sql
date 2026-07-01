-- S56b — Web Push subscriptions per SaaS tenant (PWA notifications)
CREATE TABLE IF NOT EXISTS saas_pwa_push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  user_id     TEXT,
  endpoint    TEXT NOT NULL,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, endpoint)
);

CREATE INDEX IF NOT EXISTS saas_pwa_push_subscriptions_tenant_idx
  ON saas_pwa_push_subscriptions (tenant_id, created_at DESC);
