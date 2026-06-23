-- Migration 404: White-label configuration per tenant
CREATE TABLE IF NOT EXISTS white_label_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  brand_name TEXT NOT NULL DEFAULT 'My Platform',
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#6366f1',
  secondary_color TEXT NOT NULL DEFAULT '#10b981',
  custom_domain TEXT,
  custom_domain_verified BOOLEAN NOT NULL DEFAULT FALSE,
  custom_domain_ssl BOOLEAN NOT NULL DEFAULT FALSE,
  custom_login_url TEXT,
  email_from_name TEXT,
  email_from_address TEXT,
  email_signature TEXT,
  support_email TEXT,
  support_phone TEXT,
  hide_nelvyon_branding BOOLEAN NOT NULL DEFAULT FALSE,
  custom_css TEXT,
  smtp_host TEXT,
  smtp_port INTEGER DEFAULT 587,
  smtp_user TEXT,
  smtp_password_enc TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_white_label_tenant ON white_label_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_white_label_domain ON white_label_configs(custom_domain) WHERE custom_domain IS NOT NULL;
