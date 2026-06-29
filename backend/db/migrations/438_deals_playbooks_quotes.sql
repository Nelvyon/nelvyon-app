-- 438 — Playbooks (stage templates) + CPQ Quotes

-- Playbook: template de acciones por etapa del pipeline
CREATE TABLE IF NOT EXISTS saas_playbooks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  stage       TEXT NOT NULL,  -- DealStage it applies to
  description TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saas_playbook_actions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id  UUID NOT NULL REFERENCES saas_playbooks(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  action_type  TEXT NOT NULL CHECK (action_type IN ('task','email','call','note','wait')),
  title        TEXT NOT NULL,
  description  TEXT,
  template     TEXT,          -- email body or task description template
  wait_days    INTEGER,       -- for action_type='wait'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_playbooks_tenant       ON saas_playbooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_playbooks_stage        ON saas_playbooks(tenant_id, stage);
CREATE INDEX IF NOT EXISTS idx_playbook_actions_pb    ON saas_playbook_actions(playbook_id);

-- Quotes (CPQ lite) — quotes linked to deals
CREATE TABLE IF NOT EXISTS saas_quotes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  deal_id         UUID REFERENCES saas_deals(id) ON DELETE SET NULL,
  quote_number    TEXT NOT NULL,
  title           TEXT NOT NULL,
  client_name     TEXT NOT NULL,
  client_email    TEXT,
  client_address  TEXT,
  currency        TEXT NOT NULL DEFAULT 'EUR',
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_pct    NUMERIC(5,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_pct         NUMERIC(5,2) NOT NULL DEFAULT 21,
  tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','accepted','rejected','expired')),
  valid_until     DATE,
  notes           TEXT,
  pdf_url         TEXT,        -- signed URL once rendered
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, quote_number)
);

CREATE TABLE IF NOT EXISTS saas_quote_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id    UUID NOT NULL REFERENCES saas_quotes(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  quantity    NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal    NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

CREATE INDEX IF NOT EXISTS idx_quotes_tenant    ON saas_quotes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotes_deal      ON saas_quotes(deal_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_q    ON saas_quote_items(quote_id);

-- Sequence for quote numbers per tenant (via a per-tenant counter)
CREATE TABLE IF NOT EXISTS saas_quote_sequences (
  tenant_id UUID PRIMARY KEY,
  last_seq  INTEGER NOT NULL DEFAULT 0
);

-- Win probability model per stage (tenant-overridable defaults)
CREATE TABLE IF NOT EXISTS saas_stage_probabilities (
  tenant_id   UUID NOT NULL,
  stage       TEXT NOT NULL,
  probability INTEGER NOT NULL CHECK (probability BETWEEN 0 AND 100),
  PRIMARY KEY (tenant_id, stage)
);
