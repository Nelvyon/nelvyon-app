-- NELVYON landing page builder

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS landing_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),
    blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    ab_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    custom_domain TEXT,
    domain_verified BOOLEAN NOT NULL DEFAULT FALSE,
    form_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS landing_pages_workspace_idx
    ON landing_pages (workspace_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS landing_pages_slug_idx
    ON landing_pages (slug) WHERE slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS landing_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    thumbnail_url TEXT,
    blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_default BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS landing_templates_category_idx
    ON landing_templates (category);

CREATE TABLE IF NOT EXISTS landing_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES landing_pages (id) ON DELETE CASCADE,
    variant TEXT NOT NULL DEFAULT 'control',
    event_type TEXT NOT NULL
        CHECK (event_type IN ('impression', 'conversion', 'form_submit', 'time_on_page')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS landing_analytics_page_idx
    ON landing_analytics (page_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS landing_analytics_variant_idx
    ON landing_analytics (page_id, variant, event_type);

ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS landing_pages_tenant ON landing_pages;
CREATE POLICY landing_pages_tenant ON landing_pages
    FOR ALL
    USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS landing_pages_public_read ON landing_pages;
CREATE POLICY landing_pages_public_read ON landing_pages
    FOR SELECT
    USING (status = 'published');

DROP POLICY IF EXISTS landing_analytics_tenant ON landing_analytics;
CREATE POLICY landing_analytics_tenant ON landing_analytics
    FOR ALL
    USING (
        page_id IN (SELECT id FROM landing_pages WHERE workspace_id = current_tenant_id())
    )
    WITH CHECK (
        page_id IN (SELECT id FROM landing_pages WHERE workspace_id = current_tenant_id())
    );

DROP POLICY IF EXISTS landing_analytics_public_insert ON landing_analytics;
CREATE POLICY landing_analytics_public_insert ON landing_analytics
    FOR INSERT
    WITH CHECK (
        page_id IN (SELECT id FROM landing_pages WHERE status = 'published')
    );

-- Templates are global (read-only for all tenants)
ALTER TABLE landing_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS landing_templates_read ON landing_templates;
CREATE POLICY landing_templates_read ON landing_templates
    FOR SELECT
    USING (TRUE);
