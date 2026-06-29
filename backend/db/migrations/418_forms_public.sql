-- Migration 418: Public forms with submissions (extends saas_forms from formularios)
CREATE TABLE IF NOT EXISTS saas_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  submissions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saas_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES saas_forms(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES saas_contacts(id) ON DELETE SET NULL,
  data JSONB NOT NULL DEFAULT '{}',
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_forms_tenant ON saas_forms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saas_form_submissions_form ON saas_form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_saas_form_submissions_contact ON saas_form_submissions(contact_id);
