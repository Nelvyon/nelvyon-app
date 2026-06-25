-- Migration 449: Ads ↔ Attribution bridge
CREATE TABLE IF NOT EXISTS saas_ads_campaign_links (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            TEXT NOT NULL,
  platform             TEXT NOT NULL,
  external_campaign_id TEXT NOT NULL,
  external_campaign_name TEXT,
  utm_campaign         TEXT NOT NULL,
  utm_source           TEXT,
  utm_medium           TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, platform, external_campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_ads_campaign_links_tenant
  ON saas_ads_campaign_links (tenant_id);

CREATE INDEX IF NOT EXISTS idx_ads_campaign_links_utm
  ON saas_ads_campaign_links (tenant_id, utm_campaign);
