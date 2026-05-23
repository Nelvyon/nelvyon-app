-- NELVYON OS Store Builder — AI-generated online stores

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS os_store_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE,
    store_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'generating', 'ready', 'published', 'error')),
    currency TEXT NOT NULL DEFAULT 'EUR',
    country_code TEXT NOT NULL DEFAULT 'ES',
    stripe_account_id TEXT,
    custom_domain TEXT,
    domain_verified BOOLEAN NOT NULL DEFAULT FALSE,
    seo_artifacts JSONB NOT NULL DEFAULT '{}'::jsonb,
    pages_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS os_store_projects_workspace_idx
    ON os_store_projects (workspace_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS os_store_projects_subdomain_idx
    ON os_store_projects (subdomain) WHERE subdomain IS NOT NULL;

CREATE TABLE IF NOT EXISTS os_store_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES os_store_projects (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    page_type TEXT NOT NULL,
    page_slug TEXT NOT NULL,
    landing_page_id UUID REFERENCES landing_pages (id) ON DELETE SET NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, page_slug)
);

CREATE INDEX IF NOT EXISTS os_store_pages_project_idx
    ON os_store_pages (project_id, order_index);

CREATE TABLE IF NOT EXISTS os_store_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES os_store_projects (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    ai_description TEXT,
    price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
    currency TEXT NOT NULL DEFAULT 'EUR',
    stripe_product_id TEXT,
    stripe_price_id TEXT,
    stripe_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (stripe_status IN ('pending', 'pending_stripe', 'active', 'archived')),
    stock INTEGER NOT NULL DEFAULT 100,
    category TEXT,
    images JSONB NOT NULL DEFAULT '[]'::jsonb,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, slug)
);

CREATE INDEX IF NOT EXISTS os_store_products_project_idx
    ON os_store_products (project_id, is_active, category);

CREATE TABLE IF NOT EXISTS os_store_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES os_store_projects (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    customer_email TEXT NOT NULL,
    customer_name TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
    currency TEXT NOT NULL DEFAULT 'EUR',
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'refunded')),
    stripe_payment_intent_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS os_store_orders_project_idx
    ON os_store_orders (project_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS os_store_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES os_store_projects (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    stripe_coupon_id TEXT,
    code TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('percent', 'fixed')),
    value NUMERIC(10, 2) NOT NULL,
    max_uses INTEGER,
    uses_count INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, code)
);

CREATE TABLE IF NOT EXISTS os_store_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL UNIQUE,
    thumbnail_url TEXT,
    store_info_defaults JSONB NOT NULL DEFAULT '{}'::jsonb,
    sample_products JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_default BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE os_store_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_store_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_store_discounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS os_store_projects_tenant ON os_store_projects;
CREATE POLICY os_store_projects_tenant ON os_store_projects
    FOR ALL
    USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS os_store_projects_public_read ON os_store_projects;
CREATE POLICY os_store_projects_public_read ON os_store_projects
    FOR SELECT
    USING (status = 'published');

DROP POLICY IF EXISTS os_store_pages_tenant ON os_store_pages;
CREATE POLICY os_store_pages_tenant ON os_store_pages
    FOR ALL
    USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS os_store_pages_public_read ON os_store_pages;
CREATE POLICY os_store_pages_public_read ON os_store_pages
    FOR SELECT
    USING (
        is_published = TRUE
        AND project_id IN (SELECT id FROM os_store_projects WHERE status = 'published')
    );

DROP POLICY IF EXISTS os_store_products_tenant ON os_store_products;
CREATE POLICY os_store_products_tenant ON os_store_products
    FOR ALL
    USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS os_store_products_public_read ON os_store_products;
CREATE POLICY os_store_products_public_read ON os_store_products
    FOR SELECT
    USING (
        is_active = TRUE
        AND project_id IN (SELECT id FROM os_store_projects WHERE status = 'published')
    );

DROP POLICY IF EXISTS os_store_orders_tenant ON os_store_orders;
CREATE POLICY os_store_orders_tenant ON os_store_orders
    FOR ALL
    USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS os_store_orders_public_insert ON os_store_orders;
CREATE POLICY os_store_orders_public_insert ON os_store_orders
    FOR INSERT
    WITH CHECK (
        project_id IN (SELECT id FROM os_store_projects WHERE status = 'published')
    );

DROP POLICY IF EXISTS os_store_discounts_tenant ON os_store_discounts;
CREATE POLICY os_store_discounts_tenant ON os_store_discounts
    FOR ALL
    USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS os_store_templates_read ON os_store_templates;
CREATE POLICY os_store_templates_read ON os_store_templates
    FOR SELECT
    USING (TRUE);

ALTER TABLE os_store_templates ENABLE ROW LEVEL SECURITY;
