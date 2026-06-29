-- Migration 454: Revenue attribution per deliverable
-- Links deliverables (os/recurring/pack_run) to UTM campaigns + computed revenue/spend

CREATE TABLE IF NOT EXISTS saas_deliverable_links (
  tenant_id             UUID NOT NULL,
  deliverable_id        TEXT NOT NULL,
  deliverable_source    TEXT NOT NULL CHECK (deliverable_source IN ('os', 'recurring', 'pack_run')),
  utm_campaign          TEXT,
  external_campaign_id  TEXT,
  landing_url           TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, deliverable_id)
);

CREATE INDEX IF NOT EXISTS idx_saas_deliverable_links_utm
  ON saas_deliverable_links (tenant_id, utm_campaign)
  WHERE utm_campaign IS NOT NULL;

CREATE TABLE IF NOT EXISTS saas_deliverable_revenue (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL,
  deliverable_id      TEXT NOT NULL,
  deliverable_source  TEXT NOT NULL CHECK (deliverable_source IN ('os', 'recurring', 'pack_run')),
  pack_id             TEXT,
  utm_campaign        TEXT,
  period_start        DATE NOT NULL,
  period_end          DATE NOT NULL,
  visits              INT NOT NULL DEFAULT 0,
  conversions         INT NOT NULL DEFAULT 0,
  attributed_revenue  NUMERIC(12,2) NOT NULL DEFAULT 0,
  ads_spend           NUMERIC(12,2) NOT NULL DEFAULT 0,
  roas                NUMERIC(8,4),
  model               TEXT NOT NULL DEFAULT 'last_touch',
  computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, deliverable_id, period_start, period_end, model)
);

CREATE INDEX IF NOT EXISTS idx_saas_deliverable_revenue_tenant
  ON saas_deliverable_revenue (tenant_id, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_saas_deliverable_revenue_pack
  ON saas_deliverable_revenue (tenant_id, pack_id)
  WHERE pack_id IS NOT NULL;

COMMENT ON TABLE saas_deliverable_revenue IS
  'Computed revenue attribution per deliverable (S48). Refreshed by cron or manual trigger.';
