-- Migration 453: Autopilot per-tenant toggle settings
-- Controls which recurring OS services are active per tenant + schedule day

CREATE TABLE IF NOT EXISTS saas_autopilot_settings (
  tenant_id             TEXT PRIMARY KEY,
  seo_enabled           BOOLEAN NOT NULL DEFAULT false,
  social_enabled        BOOLEAN NOT NULL DEFAULT false,
  reputation_enabled    BOOLEAN NOT NULL DEFAULT false,
  ads_enabled           BOOLEAN NOT NULL DEFAULT false,
  seo_day_of_month      INT NOT NULL DEFAULT 1 CHECK (seo_day_of_month BETWEEN 1 AND 28),
  social_day_of_month   INT NOT NULL DEFAULT 1 CHECK (social_day_of_month BETWEEN 1 AND 28),
  last_seo_run_at       TIMESTAMPTZ,
  last_social_run_at    TIMESTAMPTZ,
  last_reputation_run_at TIMESTAMPTZ,
  last_ads_run_at       TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_autopilot_seo_enabled
  ON saas_autopilot_settings (seo_enabled) WHERE seo_enabled = true;

CREATE INDEX IF NOT EXISTS idx_saas_autopilot_social_enabled
  ON saas_autopilot_settings (social_enabled) WHERE social_enabled = true;

COMMENT ON TABLE saas_autopilot_settings IS
  'Per-tenant toggles for autonomous recurring OS services (S47).';
