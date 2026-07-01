-- Migration 487: Partner client billing (P2 rebilling)

CREATE TABLE IF NOT EXISTS partner_client_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_workspace_id INT NOT NULL,
  client_workspace_id INT NOT NULL,
  retail_plan_id TEXT,
  retail_pack_id TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  monthly_retail_eur NUMERIC(10, 2) NOT NULL DEFAULT 0,
  monthly_wholesale_eur NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (partner_workspace_id, client_workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_client_billing_partner
  ON partner_client_billing (partner_workspace_id, status);
