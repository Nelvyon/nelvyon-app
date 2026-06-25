-- S31: Afiliados y Loyalty — modelo tenant SaaS

-- ── Affiliate Programs ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saas_affiliate_programs (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      TEXT         NOT NULL UNIQUE REFERENCES saas_tenants(id) ON DELETE CASCADE,
  commission_pct NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  cookie_days    INTEGER      NOT NULL DEFAULT 30,
  active         BOOLEAN      NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Affiliate Links ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saas_affiliate_links (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         TEXT        NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  code              TEXT        NOT NULL,
  affiliate_user_id TEXT        NOT NULL,
  clicks            INTEGER     NOT NULL DEFAULT 0,
  conversions       INTEGER     NOT NULL DEFAULT 0,
  active            BOOLEAN     NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, code)
);
CREATE INDEX IF NOT EXISTS idx_saas_affiliate_links_tenant ON saas_affiliate_links(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saas_affiliate_links_code   ON saas_affiliate_links(tenant_id, code);

-- ── Affiliate Commissions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saas_affiliate_commissions (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          TEXT          NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  link_id            UUID          NOT NULL REFERENCES saas_affiliate_links(id),
  affiliate_user_id  TEXT          NOT NULL,
  amount             NUMERIC(12,2) NOT NULL,
  commission_pct     NUMERIC(5,2)  NOT NULL,
  commission_amount  NUMERIC(12,2) NOT NULL,
  status             TEXT          NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid')),
  stripe_transfer_id TEXT,
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saas_affiliate_commissions_tenant ON saas_affiliate_commissions(tenant_id, status);

-- ── Loyalty Programs ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saas_loyalty_programs (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      TEXT         NOT NULL UNIQUE REFERENCES saas_tenants(id) ON DELETE CASCADE,
  points_per_eur NUMERIC(8,2) NOT NULL DEFAULT 1.0,
  tiers          JSONB        NOT NULL DEFAULT '[{"name":"Bronze","min_points":0},{"name":"Silver","min_points":500},{"name":"Gold","min_points":2000},{"name":"Platinum","min_points":5000}]',
  active         BOOLEAN      NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Loyalty Balances ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saas_loyalty_balances (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    TEXT        NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  contact_id   UUID        NOT NULL,
  points       INTEGER     NOT NULL DEFAULT 0,
  tier         TEXT        NOT NULL DEFAULT 'Bronze',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, contact_id)
);
CREATE INDEX IF NOT EXISTS idx_saas_loyalty_balances_tenant ON saas_loyalty_balances(tenant_id, points DESC);

-- ── Loyalty Transactions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saas_loyalty_transactions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    TEXT        NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  contact_id   UUID        NOT NULL,
  type         TEXT        NOT NULL CHECK (type IN ('earn','redeem','adjust')),
  points       INTEGER     NOT NULL,
  reason       TEXT,
  reference_id TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saas_loyalty_txn_contact ON saas_loyalty_transactions(tenant_id, contact_id, created_at DESC);
