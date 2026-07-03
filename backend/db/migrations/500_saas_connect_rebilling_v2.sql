-- 500 — Connect rebilling v2: subcuenta + invoice period tracking
ALTER TABLE saas_connect_rebilling
  ADD COLUMN IF NOT EXISTS subcuenta_id UUID,
  ADD COLUMN IF NOT EXISTS invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS rebilling_period TEXT;

CREATE INDEX IF NOT EXISTS idx_connect_rebilling_subcuenta_id
  ON saas_connect_rebilling(subcuenta_id) WHERE subcuenta_id IS NOT NULL;
