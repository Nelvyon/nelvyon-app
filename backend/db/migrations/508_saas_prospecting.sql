-- Migration 508: B2B prospecting lists, prospects and Apollo search audit
CREATE TABLE IF NOT EXISTS saas_prospecting_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filter JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'done' CHECK (status IN ('running', 'done', 'paused')),
  prospects_count INT NOT NULL DEFAULT 0,
  enriched_count INT NOT NULL DEFAULT 0,
  apollo_search_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saas_prospecting_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  list_id UUID NOT NULL REFERENCES saas_prospecting_lists(id) ON DELETE CASCADE,
  apollo_person_id TEXT,
  name TEXT NOT NULL,
  title TEXT,
  company TEXT,
  industry TEXT,
  country TEXT,
  employees INT NOT NULL DEFAULT 0,
  email TEXT,
  linkedin_url TEXT,
  phone TEXT,
  enriched BOOLEAN NOT NULL DEFAULT FALSE,
  added_to_crm BOOLEAN NOT NULL DEFAULT FALSE,
  crm_contact_id UUID REFERENCES saas_contacts(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(list_id, apollo_person_id)
);

CREATE TABLE IF NOT EXISTS saas_prospecting_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  list_id UUID REFERENCES saas_prospecting_lists(id) ON DELETE SET NULL,
  filter JSONB NOT NULL DEFAULT '{}',
  apollo_page INT NOT NULL DEFAULT 1,
  apollo_total_entries INT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prospecting_lists_tenant ON saas_prospecting_lists(tenant_id);
CREATE INDEX IF NOT EXISTS idx_prospecting_prospects_list ON saas_prospecting_prospects(list_id);
CREATE INDEX IF NOT EXISTS idx_prospecting_prospects_tenant ON saas_prospecting_prospects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_prospecting_searches_tenant ON saas_prospecting_searches(tenant_id);
