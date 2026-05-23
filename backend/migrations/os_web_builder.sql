-- NELVYON OS Web Builder — multi-page websites

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS os_website_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE,
    business_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'generating', 'ready', 'published', 'error')),
    pages_count INTEGER NOT NULL DEFAULT 0,
    custom_domain TEXT,
    domain_verified BOOLEAN NOT NULL DEFAULT FALSE,
    seo_artifacts JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS os_website_projects_workspace_idx
    ON os_website_projects (workspace_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS os_website_projects_subdomain_idx
    ON os_website_projects (subdomain) WHERE subdomain IS NOT NULL;

CREATE TABLE IF NOT EXISTS os_website_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES os_website_projects (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    page_type TEXT NOT NULL DEFAULT 'custom'
        CHECK (page_type IN ('home', 'about', 'services', 'pricing', 'contact', 'blog', 'faq', 'custom')),
    page_slug TEXT NOT NULL,
    landing_page_id UUID REFERENCES landing_pages (id) ON DELETE SET NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, page_slug)
);

CREATE INDEX IF NOT EXISTS os_website_pages_project_idx
    ON os_website_pages (project_id, order_index);

CREATE TABLE IF NOT EXISTS os_website_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL UNIQUE,
    thumbnail_url TEXT,
    pages_structure JSONB NOT NULL DEFAULT '[]'::jsonb,
    business_info_defaults JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_default BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE os_website_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_website_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS os_website_projects_tenant ON os_website_projects;
CREATE POLICY os_website_projects_tenant ON os_website_projects
    FOR ALL
    USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS os_website_projects_public_read ON os_website_projects;
CREATE POLICY os_website_projects_public_read ON os_website_projects
    FOR SELECT
    USING (status = 'published');

DROP POLICY IF EXISTS os_website_pages_tenant ON os_website_pages;
CREATE POLICY os_website_pages_tenant ON os_website_pages
    FOR ALL
    USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS os_website_pages_public_read ON os_website_pages;
CREATE POLICY os_website_pages_public_read ON os_website_pages
    FOR SELECT
    USING (
        is_published = TRUE
        AND project_id IN (SELECT id FROM os_website_projects WHERE status = 'published')
    );

DROP POLICY IF EXISTS os_website_templates_read ON os_website_templates;
CREATE POLICY os_website_templates_read ON os_website_templates
    FOR SELECT
    USING (TRUE);

ALTER TABLE os_website_templates ENABLE ROW LEVEL SECURITY;
