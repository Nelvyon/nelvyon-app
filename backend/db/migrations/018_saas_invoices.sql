ALTER TABLE os_service_contracts ADD COLUMN IF NOT EXISTS amount_eur NUMERIC(10,2) DEFAULT 97;

CREATE TABLE IF NOT EXISTS saas_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  amount_eur NUMERIC(10,2) NOT NULL DEFAULT 97,
  status VARCHAR(20) NOT NULL DEFAULT 'issued',
  line_items JSONB DEFAULT '[]',
  pdf_url TEXT,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user ON saas_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON saas_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON saas_invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON saas_invoices(created_at DESC);
