-- 425_saas_funnels.sql — multi-step funnels per tenant
CREATE TABLE IF NOT EXISTS saas_funnels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','archived')),
  slug        TEXT,
  steps_count INTEGER NOT NULL DEFAULT 0,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saas_funnels_tenant ON saas_funnels(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_saas_funnels_slug ON saas_funnels(tenant_id, slug) WHERE slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS saas_funnel_steps (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id    UUID NOT NULL REFERENCES saas_funnels(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL,
  step_order   INTEGER NOT NULL DEFAULT 0,
  type         TEXT NOT NULL DEFAULT 'landing' CHECK (type IN ('landing','form','video','checkout','upsell','thankyou')),
  name         TEXT NOT NULL,
  content      TEXT,
  cta_label    TEXT,
  cta_url      TEXT,
  visitors     INTEGER NOT NULL DEFAULT 0,
  conversions  INTEGER NOT NULL DEFAULT 0,
  metadata     JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saas_funnel_steps_funnel ON saas_funnel_steps(funnel_id);
CREATE INDEX IF NOT EXISTS idx_saas_funnel_steps_tenant ON saas_funnel_steps(tenant_id);
