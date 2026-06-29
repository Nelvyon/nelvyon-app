-- 421 — Ads dashboard: tenant-scoped ad platform connections + metrics cache
CREATE TABLE IF NOT EXISTS saas_ads_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  platform        TEXT NOT NULL CHECK (platform IN ('meta', 'google', 'linkedin', 'tiktok')),
  account_id      TEXT NOT NULL,
  account_name    TEXT NOT NULL,
  access_token    TEXT NOT NULL,
  refresh_token   TEXT,
  token_expires_at TIMESTAMPTZ,
  extra_config    JSONB NOT NULL DEFAULT '{}', -- pixel_id, customer_id, etc.
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, platform, account_id)
);

CREATE INDEX IF NOT EXISTS idx_ads_connections_tenant ON saas_ads_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ads_connections_active ON saas_ads_connections(tenant_id, is_active) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS saas_ads_metrics_cache (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id   UUID NOT NULL REFERENCES saas_ads_connections(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL,
  date_start      DATE NOT NULL,
  date_end        DATE NOT NULL,
  spend           NUMERIC(12,2) NOT NULL DEFAULT 0,
  impressions     BIGINT NOT NULL DEFAULT 0,
  clicks          BIGINT NOT NULL DEFAULT 0,
  conversions     BIGINT NOT NULL DEFAULT 0,
  ctr             NUMERIC(6,4),
  cpc             NUMERIC(10,4),
  roas            NUMERIC(10,4),
  raw_payload     JSONB,
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (connection_id, date_start, date_end)
);

CREATE INDEX IF NOT EXISTS idx_ads_metrics_tenant ON saas_ads_metrics_cache(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ads_metrics_conn ON saas_ads_metrics_cache(connection_id, date_start, date_end);
