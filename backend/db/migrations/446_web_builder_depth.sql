-- Migration 446: Web Builder depth — versions, domain verify, CDN publish, SSL
ALTER TABLE saas_web_pages
  ADD COLUMN IF NOT EXISTS seo_title        TEXT,
  ADD COLUMN IF NOT EXISTS seo_description  TEXT,
  ADD COLUMN IF NOT EXISTS published_html   TEXT,
  ADD COLUMN IF NOT EXISTS cdn_url          TEXT,
  ADD COLUMN IF NOT EXISTS domain_status    TEXT NOT NULL DEFAULT 'none'
                           CHECK (domain_status IN ('none','pending','verified','failed')),
  ADD COLUMN IF NOT EXISTS domain_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ssl_status       TEXT NOT NULL DEFAULT 'pending'
                           CHECK (ssl_status IN ('pending','active','failed')),
  ADD COLUMN IF NOT EXISTS ssl_verified_at  TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS saas_web_page_versions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id    UUID NOT NULL REFERENCES saas_web_pages(id) ON DELETE CASCADE,
  version    INT NOT NULL,
  sections   JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (page_id, version)
);

-- Fast lookup of published pages by tenant+slug
CREATE INDEX IF NOT EXISTS idx_web_pages_published
  ON saas_web_pages (tenant_id, slug)
  WHERE status = 'published';

-- Unique verified custom domain per published page
CREATE UNIQUE INDEX IF NOT EXISTS uidx_web_pages_verified_domain
  ON saas_web_pages (custom_domain)
  WHERE domain_status = 'verified' AND status = 'published';
