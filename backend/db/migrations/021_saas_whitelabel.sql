CREATE TABLE IF NOT EXISTS saas_whitelabel_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) UNIQUE NOT NULL,
  agency_name VARCHAR(500),
  logo_url TEXT,
  primary_color VARCHAR(20) DEFAULT '#6366f1',
  secondary_color VARCHAR(20) DEFAULT '#8b5cf6',
  custom_domain VARCHAR(500),
  favicon_url TEXT,
  support_email VARCHAR(500),
  footer_text TEXT,
  hide_nelvyon_branding BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whitelabel_tenant ON saas_whitelabel_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whitelabel_domain ON saas_whitelabel_configs(custom_domain);
