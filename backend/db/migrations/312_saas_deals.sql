-- Fase 3A: pipeline SaaS oficial (separado de os_deals, deals, crm_deals, pipeline_deals)

CREATE TABLE IF NOT EXISTS saas_deals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  contact_id          UUID REFERENCES saas_contacts(id) ON DELETE SET NULL,
  title               TEXT NOT NULL,
  value               NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency            TEXT NOT NULL DEFAULT 'EUR',
  stage               TEXT NOT NULL DEFAULT 'new'
                      CHECK (stage IN ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost')),
  probability         INTEGER NOT NULL DEFAULT 10
                      CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  source              TEXT,
  owner_user_id       TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_deals_tenant ON saas_deals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saas_deals_tenant_stage ON saas_deals(tenant_id, stage);
CREATE INDEX IF NOT EXISTS idx_saas_deals_tenant_contact ON saas_deals(tenant_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_saas_deals_tenant_updated ON saas_deals(tenant_id, updated_at DESC);

COMMENT ON TABLE saas_deals IS
  'Oportunidades SaaS del tenant. Fuente oficial pipeline Fase 3A; no mezclar con os_deals ni legacy deals.';
