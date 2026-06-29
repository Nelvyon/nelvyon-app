-- 424 — Stripe Connect columns on saas_whitelabel_configs + agency sub-accounts table

-- Stripe Connect on white-label (agency can collect payments through their own Stripe account)
ALTER TABLE saas_whitelabel_configs
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id   TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_status        TEXT DEFAULT 'not_connected'
    CHECK (stripe_connect_status IN ('not_connected','pending','active','restricted')),
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connect_onboarded_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_whitelabel_stripe_account
  ON saas_whitelabel_configs(stripe_connect_account_id)
  WHERE stripe_connect_account_id IS NOT NULL;

-- Agency sub-accounts
CREATE TABLE IF NOT EXISTS saas_subcuentas (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_tenant_id                UUID NOT NULL,
  tenant_id                       UUID NOT NULL UNIQUE,
  name                            TEXT NOT NULL,
  email                           TEXT NOT NULL,
  plan                            TEXT NOT NULL DEFAULT 'starter',
  status                          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','suspended','cancelled')),
  max_contacts                    INTEGER NOT NULL DEFAULT 1000,
  max_campaigns                   INTEGER NOT NULL DEFAULT 5,
  stripe_connect_payment_enabled  BOOLEAN NOT NULL DEFAULT false,
  notes                           TEXT,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subcuentas_agency ON saas_subcuentas(agency_tenant_id);
CREATE INDEX IF NOT EXISTS idx_subcuentas_status ON saas_subcuentas(agency_tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_subcuentas_tenant ON saas_subcuentas(tenant_id);
