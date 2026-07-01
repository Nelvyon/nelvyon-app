-- Migration 482: Elite world-class frentes (security, deliverability, enterprise, marketplace)

-- C5 IP allowlist
CREATE TABLE IF NOT EXISTS saas_tenant_ip_allowlist (
  tenant_id UUID PRIMARY KEY REFERENCES saas_tenants(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  cidrs TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- C8 2FA / TOTP
CREATE TABLE IF NOT EXISTS saas_user_mfa (
  user_id TEXT PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  totp_secret_enc TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  backup_codes_hash TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE saas_tenants ADD COLUMN IF NOT EXISTS mfa_enforced BOOLEAN NOT NULL DEFAULT false;

-- C3 custom RBAC roles
CREATE TABLE IF NOT EXISTS saas_custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS saas_member_custom_roles (
  user_id TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES saas_custom_roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, tenant_id)
);

-- C6 sandbox tenants
CREATE TABLE IF NOT EXISTS saas_sandbox_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  sandbox_tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sandbox_tenant_id)
);

-- C7 CRM territories
CREATE TABLE IF NOT EXISTS saas_crm_territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  regions TEXT[] NOT NULL DEFAULT '{}',
  owner_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE saas_contacts ADD COLUMN IF NOT EXISTS territory_id UUID REFERENCES saas_crm_territories(id) ON DELETE SET NULL;

-- C10 deliverability snapshots
CREATE TABLE IF NOT EXISTS saas_deliverability_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  bounce_rate NUMERIC(6,3) NOT NULL DEFAULT 0,
  complaint_rate NUMERIC(6,3) NOT NULL DEFAULT 0,
  sent_30d INT NOT NULL DEFAULT 0,
  bounced_30d INT NOT NULL DEFAULT 0,
  complaints_30d INT NOT NULL DEFAULT 0,
  dedicated_ip TEXT,
  warmup_day INT NOT NULL DEFAULT 0,
  health_score INT NOT NULL DEFAULT 100,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliverability_tenant_captured
  ON saas_deliverability_snapshots (tenant_id, captured_at DESC);

-- C15 ads optimizer rules
CREATE TABLE IF NOT EXISTS saas_ads_optimizer_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  name TEXT NOT NULL,
  condition_json JSONB NOT NULL DEFAULT '{}',
  action_json JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- C18 HubSpot sync cursor
CREATE TABLE IF NOT EXISTS saas_hubspot_sync_state (
  tenant_id UUID PRIMARY KEY REFERENCES saas_tenants(id) ON DELETE CASCADE,
  last_sync_at TIMESTAMPTZ,
  cursor TEXT,
  contacts_synced INT NOT NULL DEFAULT 0,
  deals_synced INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'idle',
  error_message TEXT
);

-- C20 usage metering
CREATE TABLE IF NOT EXISTS saas_usage_meter_daily (
  tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  meter_date DATE NOT NULL,
  contacts_created INT NOT NULL DEFAULT 0,
  emails_sent INT NOT NULL DEFAULT 0,
  workflow_runs INT NOT NULL DEFAULT 0,
  api_calls INT NOT NULL DEFAULT 0,
  sms_sent INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, meter_date)
);

-- C29 webhook dead-letter queue
CREATE TABLE IF NOT EXISTS saas_webhook_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  webhook_id UUID,
  event_type TEXT,
  payload JSONB NOT NULL,
  error_message TEXT,
  attempts INT NOT NULL DEFAULT 1,
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  replayed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webhook_failures_tenant
  ON saas_webhook_failures (tenant_id, last_attempt_at DESC);

-- C31 data region
ALTER TABLE saas_tenants ADD COLUMN IF NOT EXISTS data_region TEXT NOT NULL DEFAULT 'eu-west-1';
ALTER TABLE saas_tenants ADD COLUMN IF NOT EXISTS billing_status TEXT NOT NULL DEFAULT 'active';

-- C35 human QA review queue
CREATE TABLE IF NOT EXISTS os_qa_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  pack_run_id TEXT,
  deliverable_id TEXT,
  qa_score INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_os_qa_review_status ON os_qa_review_queue (status, created_at DESC);

-- C28 integration marketplace
CREATE TABLE IF NOT EXISTS saas_marketplace_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'Nelvyon',
  category TEXT NOT NULL,
  install_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saas_tenant_installed_apps (
  tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  app_id UUID NOT NULL REFERENCES saas_marketplace_apps(id) ON DELETE CASCADE,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, app_id)
);

-- C14 A2P 10DLC registration tracking
CREATE TABLE IF NOT EXISTS saas_twilio_a2p_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  brand_sid TEXT,
  campaign_sid TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  business_name TEXT NOT NULL,
  ein TEXT,
  use_case TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed marketplace starter apps
INSERT INTO saas_marketplace_apps (slug, name, description, author, category, install_count)
VALUES
  ('zapier', 'Zapier', 'Conecta 5000+ apps con triggers y acciones Nelvyon', 'Nelvyon', 'automation', 0),
  ('make', 'Make.com', 'Automatizaciones visuales con webhooks Nelvyon', 'Nelvyon', 'automation', 0),
  ('n8n', 'n8n', 'Self-hosted automation con API pública v2', 'Nelvyon', 'automation', 0),
  ('hubspot-sync', 'HubSpot Sync', 'Sincronización bidireccional contactos y deals', 'Nelvyon', 'crm', 0),
  ('google-analytics', 'Google Analytics 4', 'Eventos de conversión desde funnels', 'Nelvyon', 'analytics', 0)
ON CONFLICT (slug) DO NOTHING;
