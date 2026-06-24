-- 437 — Formalize Stripe Connect partner tables + agency rebilling tracking

-- Already created inline in partnerConnectStore.ts — formalise here for migrations
CREATE TABLE IF NOT EXISTS partner_stripe_accounts (
  partner_workspace_id INTEGER PRIMARY KEY,
  partner_user_id      TEXT NOT NULL,
  stripe_account_id    TEXT NOT NULL UNIQUE,
  onboarding_status    TEXT NOT NULL DEFAULT 'pending'
    CHECK (onboarding_status IN ('pending','active','restricted','deauthorized')),
  charges_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  payouts_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  details_submitted    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_rebilling_ledger (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_workspace_id INTEGER NOT NULL,
  client_workspace_id  INTEGER,
  event_type           TEXT NOT NULL,
  stripe_event_id      TEXT UNIQUE,
  gross_eur            NUMERIC(12,2) NOT NULL DEFAULT 0,
  wholesale_eur        NUMERIC(12,2) NOT NULL DEFAULT 0,
  partner_margin_eur   NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency             TEXT NOT NULL DEFAULT 'eur',
  description          TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stripe webhook dedup log
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  stripe_event_id TEXT PRIMARY KEY,
  event_type      TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'processed',
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at    TIMESTAMPTZ
);

-- Agency rebilling: tracks payments that have been charged through agency Stripe Connect
CREATE TABLE IF NOT EXISTS saas_connect_rebilling (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_tenant_id       TEXT NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  subcuenta_tenant_id    TEXT NOT NULL,
  stripe_payment_intent  TEXT,
  stripe_transfer_id     TEXT,
  gross_amount_eur       NUMERIC(10,2) NOT NULL,
  platform_fee_eur       NUMERIC(10,2) NOT NULL,
  net_agency_eur         NUMERIC(10,2) NOT NULL,
  status                 TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','transferred','failed')),
  stripe_connect_acct    TEXT,
  description            TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_connect_rebilling_agency
  ON saas_connect_rebilling(agency_tenant_id);

CREATE INDEX IF NOT EXISTS idx_connect_rebilling_subcuenta
  ON saas_connect_rebilling(subcuenta_tenant_id);

CREATE INDEX IF NOT EXISTS idx_partner_rebilling_workspace
  ON partner_rebilling_ledger(partner_workspace_id);

CREATE INDEX IF NOT EXISTS idx_partner_stripe_accounts_stripe_id
  ON partner_stripe_accounts(stripe_account_id);
