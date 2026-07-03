-- 502 — GEO visibility runs + Twilio rebilling ledger + Stripe meter items + subcuenta meter + setup progress

CREATE TABLE IF NOT EXISTS saas_geo_visibility_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  domain          TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('running', 'completed', 'failed')),
  score           INTEGER,
  checklist       JSONB NOT NULL DEFAULT '[]'::jsonb,
  report_html     TEXT,
  deliverable_id  UUID,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_geo_visibility_tenant_started
  ON saas_geo_visibility_runs(tenant_id, started_at DESC);

CREATE TABLE IF NOT EXISTS saas_twilio_rebilling_ledger (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_tenant_id    UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  subcuenta_id        UUID NOT NULL REFERENCES saas_subcuentas(id) ON DELETE CASCADE,
  period              TEXT NOT NULL,
  sms_count           INTEGER NOT NULL DEFAULT 0,
  voice_minutes       NUMERIC(10,2) NOT NULL DEFAULT 0,
  cost_eur            NUMERIC(10,2) NOT NULL DEFAULT 0,
  retail_eur          NUMERIC(10,2) NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'invoiced', 'paid')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_twilio_rebilling_agency
  ON saas_twilio_rebilling_ledger(agency_tenant_id, period);

CREATE UNIQUE INDEX IF NOT EXISTS idx_twilio_rebilling_unique
  ON saas_twilio_rebilling_ledger(agency_tenant_id, subcuenta_id, period);

CREATE TABLE IF NOT EXISTS saas_stripe_meter_items (
  tenant_id                   UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  meter_key                   TEXT NOT NULL CHECK (meter_key IN ('sms', 'email', 'api_calls')),
  stripe_subscription_item_id TEXT NOT NULL,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, meter_key)
);

CREATE TABLE IF NOT EXISTS saas_subcuenta_meter_daily (
  subcuenta_id      UUID NOT NULL REFERENCES saas_subcuentas(id) ON DELETE CASCADE,
  agency_tenant_id  UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  meter_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  emails_sent       INTEGER NOT NULL DEFAULT 0,
  sms_sent          INTEGER NOT NULL DEFAULT 0,
  api_calls         INTEGER NOT NULL DEFAULT 0,
  workflow_runs     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (subcuenta_id, meter_date)
);

ALTER TABLE saas_tenants
  ADD COLUMN IF NOT EXISTS setup_progress JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS saas_social_proof_drafts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  deliverable_id  UUID,
  platform        TEXT NOT NULL DEFAULT 'linkedin',
  content         TEXT NOT NULL,
  hashtags        TEXT[] NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_proof_tenant
  ON saas_social_proof_drafts(tenant_id, created_at DESC);
