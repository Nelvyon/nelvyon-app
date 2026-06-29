-- Migration 448: WhatsApp Business templates + product catalog
CREATE TABLE IF NOT EXISTS saas_wa_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  meta_template_id TEXT NOT NULL,
  name            TEXT NOT NULL,
  language        TEXT NOT NULL DEFAULT 'es',
  status          TEXT NOT NULL,   -- APPROVED | PENDING | REJECTED | PAUSED
  category        TEXT,            -- MARKETING | UTILITY | AUTHENTICATION
  components      JSONB NOT NULL DEFAULT '[]',
  quality_score   TEXT,
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name, language)
);

CREATE TABLE IF NOT EXISTS saas_wa_catalog_products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL,
  meta_product_id  TEXT NOT NULL,
  catalog_id       TEXT NOT NULL,
  name             TEXT NOT NULL,
  description      TEXT,
  price_amount     NUMERIC(12,2),
  price_currency   TEXT DEFAULT 'EUR',
  image_url        TEXT,
  availability     TEXT DEFAULT 'in stock',
  retailer_id      TEXT,
  synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, meta_product_id)
);

CREATE TABLE IF NOT EXISTS saas_wa_settings (
  tenant_id   UUID PRIMARY KEY,
  waba_id     TEXT,
  catalog_id  TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_templates_tenant_status
  ON saas_wa_templates (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_wa_catalog_tenant
  ON saas_wa_catalog_products (tenant_id);
