-- Extend products table with store-specific fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS variants JSONB; -- [{name,price_modifier,stock}]

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_tenant_slug ON products(tenant_id, slug) WHERE slug IS NOT NULL;

-- Store settings per tenant (IVA, moneda, envío)
CREATE TABLE IF NOT EXISTS store_settings (
  tenant_id TEXT PRIMARY KEY REFERENCES saas_tenants(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'EUR',
  vat_pct NUMERIC(5,2) NOT NULL DEFAULT 21,
  vat_included BOOLEAN NOT NULL DEFAULT true,
  shipping_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  free_shipping_above NUMERIC(10,2),
  store_name TEXT,
  store_description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS store_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  customer_address JSONB,
  payment_intent_id TEXT,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  vat_pct NUMERIC(5,2) NOT NULL DEFAULT 21,
  vat_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  notes TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, order_number)
);

CREATE TABLE IF NOT EXISTS store_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  variant_name TEXT,
  sku TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_orders_tenant ON store_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_payment_intent ON store_orders(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_store_order_items_order ON store_order_items(order_id);
