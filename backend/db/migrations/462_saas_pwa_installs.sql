-- S56 — PWA install tracking (per-tenant install events)
CREATE TABLE IF NOT EXISTS saas_pwa_installs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL,
  user_id       TEXT,
  platform      TEXT NOT NULL DEFAULT 'unknown'
                CHECK (platform IN ('ios','android','desktop','unknown')),
  display_mode  TEXT NOT NULL DEFAULT 'browser',
  user_agent    TEXT,
  installed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS saas_pwa_installs_tenant_installed
  ON saas_pwa_installs (tenant_id, installed_at DESC);
