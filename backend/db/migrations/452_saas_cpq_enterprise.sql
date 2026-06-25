-- Migration 452: CPQ enterprise — contracts, dunning, multi-currency
CREATE TABLE IF NOT EXISTS saas_contracts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        TEXT NOT NULL,
  quote_id         UUID REFERENCES saas_quotes(id) ON DELETE SET NULL,
  deal_id          UUID,
  contract_number  TEXT NOT NULL,
  title            TEXT NOT NULL,
  client_name      TEXT NOT NULL,
  client_email     TEXT NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'EUR',
  amount           NUMERIC(14,2) NOT NULL DEFAULT 0,
  billing_interval TEXT NOT NULL DEFAULT 'one_time'
                     CHECK (billing_interval IN ('month','year','one_time')),
  status           TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','sent','signed','active','expired','cancelled')),
  signed_at        TIMESTAMPTZ,
  starts_at        TIMESTAMPTZ,
  ends_at          TIMESTAMPTZ,
  auto_renew       BOOLEAN NOT NULL DEFAULT false,
  terms_html       TEXT,
  signature_token  TEXT UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saas_dunning_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      TEXT NOT NULL,
  invoice_id     UUID NOT NULL,
  attempt_number INT  NOT NULL DEFAULT 1,
  channel        TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email','sms')),
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','sent','failed','skipped')),
  scheduled_at   TIMESTAMPTZ NOT NULL,
  sent_at        TIMESTAMPTZ,
  error_message  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saas_exchange_rates (
  base_currency   TEXT NOT NULL DEFAULT 'EUR',
  target_currency TEXT NOT NULL,
  rate            NUMERIC(18,8) NOT NULL,
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (base_currency, target_currency)
);

-- Seed common rates (updated via API or manual)
INSERT INTO saas_exchange_rates (base_currency, target_currency, rate) VALUES
  ('EUR','USD',1.08),
  ('EUR','GBP',0.86),
  ('EUR','EUR',1.00),
  ('USD','EUR',0.926),
  ('USD','GBP',0.796),
  ('GBP','EUR',1.163),
  ('GBP','USD',1.257)
ON CONFLICT (base_currency, target_currency) DO NOTHING;

-- Currency columns: add to quotes + invoices if missing
ALTER TABLE saas_quotes  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'EUR';
ALTER TABLE invoices     ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'EUR';
ALTER TABLE invoices     ADD COLUMN IF NOT EXISTS fx_rate_applied NUMERIC(18,8);

CREATE INDEX IF NOT EXISTS idx_contracts_tenant ON saas_contracts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON saas_contracts (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_dunning_tenant_invoice ON saas_dunning_events (tenant_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_dunning_pending ON saas_dunning_events (status, scheduled_at)
  WHERE status = 'pending';
