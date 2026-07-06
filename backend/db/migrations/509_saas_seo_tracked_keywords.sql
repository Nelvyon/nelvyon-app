-- Migration 509: Tenant-scoped SEO keyword tracking (independent of SEMrush)
CREATE TABLE IF NOT EXISTS saas_seo_tracked_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  domain TEXT,
  position INT NOT NULL DEFAULT 0,
  previous_position INT,
  search_volume INT NOT NULL DEFAULT 0,
  difficulty INT NOT NULL DEFAULT 0,
  cpc NUMERIC(10, 2) NOT NULL DEFAULT 0,
  url TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, keyword)
);

CREATE INDEX IF NOT EXISTS idx_seo_tracked_keywords_tenant ON saas_seo_tracked_keywords(tenant_id);
