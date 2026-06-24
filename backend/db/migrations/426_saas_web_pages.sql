-- 426_saas_web_pages.sql — tenant web page builder
CREATE TABLE IF NOT EXISTS saas_web_pages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    TEXT NOT NULL,
  title        TEXT NOT NULL,
  slug         TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'landing' CHECK (type IN ('landing','blog','product','about','contact','custom')),
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  sections     JSONB NOT NULL DEFAULT '[]',
  views        INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  metadata     JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saas_web_pages_tenant ON saas_web_pages(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_saas_web_pages_slug ON saas_web_pages(tenant_id, slug);
