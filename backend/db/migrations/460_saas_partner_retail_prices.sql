-- S54 — Partner Zone: per-agency wholesale→retail price overrides
CREATE TABLE IF NOT EXISTS saas_partner_retail_prices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_tenant_id  TEXT NOT NULL,
  sku               TEXT NOT NULL,
  wholesale_eur     NUMERIC(10,2) NOT NULL,
  retail_eur        NUMERIC(10,2) NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'eur',
  active            BOOLEAN NOT NULL DEFAULT true,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS saas_partner_retail_prices_agency_sku
  ON saas_partner_retail_prices (agency_tenant_id, sku);
