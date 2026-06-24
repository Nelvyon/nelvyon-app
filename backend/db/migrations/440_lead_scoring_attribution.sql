-- S29: Lead scoring rules + scores + multi-touch attribution

-- ── Lead Scoring Rules ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saas_lead_scoring_rules (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  TEXT        NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  field      TEXT        NOT NULL,
  operator   TEXT        NOT NULL CHECK (operator IN ('equals','not_equals','greater_than','less_than','contains','not_contains','is_true','is_false')),
  value      TEXT        NOT NULL DEFAULT '',
  points     INTEGER     NOT NULL DEFAULT 0,
  category   TEXT        NOT NULL DEFAULT 'behavioral' CHECK (category IN ('demographic','behavioral','engagement','firmographic')),
  active     BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saas_lead_scoring_rules_tenant ON saas_lead_scoring_rules(tenant_id);

-- ── Lead Scores (latest per contact) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saas_lead_scores (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      TEXT        NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  contact_id     UUID        NOT NULL,
  score          INTEGER     NOT NULL DEFAULT 0,
  grade          TEXT        NOT NULL DEFAULT 'D' CHECK (grade IN ('A','B','C','D')),
  category       TEXT        NOT NULL DEFAULT 'cold' CHECK (category IN ('hot','warm','cold')),
  reasons        JSONB       NOT NULL DEFAULT '[]',
  rule_breakdown JSONB       NOT NULL DEFAULT '[]',
  scored_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, contact_id)
);
CREATE INDEX IF NOT EXISTS idx_saas_lead_scores_tenant   ON saas_lead_scores(tenant_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_saas_lead_scores_contact  ON saas_lead_scores(contact_id);

-- ── Multi-touch Attribution ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saas_lead_attribution (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT        NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  contact_id    UUID,
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT,
  utm_content   TEXT,
  utm_term      TEXT,
  page_url      TEXT,
  referrer      TEXT,
  event_type    TEXT        NOT NULL DEFAULT 'visit' CHECK (event_type IN ('visit','form_submit','email_click','conversion')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saas_lead_attribution_tenant    ON saas_lead_attribution(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saas_lead_attribution_contact   ON saas_lead_attribution(contact_id);
CREATE INDEX IF NOT EXISTS idx_saas_lead_attribution_source    ON saas_lead_attribution(tenant_id, utm_source);
CREATE INDEX IF NOT EXISTS idx_saas_lead_attribution_campaign  ON saas_lead_attribution(tenant_id, utm_campaign);
