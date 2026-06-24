-- 420 — Social scheduler: connected accounts + scheduled/published posts (tenant-scoped)
CREATE TABLE IF NOT EXISTS saas_social_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL,
  platform        TEXT NOT NULL CHECK (platform IN ('meta', 'linkedin', 'instagram')),
  account_id      TEXT NOT NULL,
  account_name    TEXT NOT NULL,
  page_id         TEXT,           -- Meta page_id or LinkedIn org URN
  access_token    TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, platform, account_id)
);

CREATE INDEX IF NOT EXISTS idx_social_accounts_tenant ON saas_social_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_active ON saas_social_accounts(tenant_id, is_active) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS saas_social_posts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         TEXT NOT NULL,
  social_account_id UUID NOT NULL REFERENCES saas_social_accounts(id) ON DELETE CASCADE,
  platform          TEXT NOT NULL CHECK (platform IN ('meta', 'linkedin', 'instagram')),
  content           TEXT NOT NULL,
  media_urls        TEXT[] NOT NULL DEFAULT '{}',
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','published','failed')),
  scheduled_at      TIMESTAMPTZ,
  published_at      TIMESTAMPTZ,
  external_post_id  TEXT,
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_tenant ON saas_social_posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON saas_social_posts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled ON saas_social_posts(scheduled_at) WHERE status = 'scheduled';
