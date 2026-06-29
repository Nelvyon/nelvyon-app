-- S28: Helpdesk SLA + Macros + Knowledge Base
-- Adds SLA columns to existing helpdesk tickets, macros table, KB articles + categories

-- ── Helpdesk SLA fields ───────────────────────────────────────────────────────
ALTER TABLE saas_helpdesk_tickets
  ADD COLUMN IF NOT EXISTS sla_policy         TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS first_response_due TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution_due     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS macro_id           UUID;

-- ── Helpdesk Macros ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saas_helpdesk_macros (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID        NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  actions    JSONB       NOT NULL DEFAULT '[]',
  active     BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saas_helpdesk_macros_tenant ON saas_helpdesk_macros(tenant_id);

-- ── Knowledge Base Categories ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saas_kb_categories (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID        NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  icon       TEXT        NOT NULL DEFAULT '📁',
  slug       TEXT        NOT NULL,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_saas_kb_categories_tenant ON saas_kb_categories(tenant_id);

-- ── Knowledge Base Articles ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saas_kb_articles (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  category_id   UUID        REFERENCES saas_kb_categories(id) ON DELETE SET NULL,
  title         TEXT        NOT NULL,
  slug          TEXT        NOT NULL,
  content       TEXT        NOT NULL DEFAULT '',
  excerpt       TEXT        NOT NULL DEFAULT '',
  published     BOOLEAN     NOT NULL DEFAULT false,
  views         INTEGER     NOT NULL DEFAULT 0,
  helpful       INTEGER     NOT NULL DEFAULT 0,
  not_helpful   INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_saas_kb_articles_tenant     ON saas_kb_articles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saas_kb_articles_category   ON saas_kb_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_saas_kb_articles_published  ON saas_kb_articles(tenant_id, published);
