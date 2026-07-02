-- PWA push notification outbox (workflow/campaign triggers)
CREATE TABLE IF NOT EXISTS saas_pwa_push_queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL,
  user_id       TEXT,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  url           TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dispatched_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_saas_pwa_push_queue_pending
  ON saas_pwa_push_queue (created_at) WHERE dispatched_at IS NULL;
