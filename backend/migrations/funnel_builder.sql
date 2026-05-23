-- NELVYON visual funnel builder

CREATE TABLE IF NOT EXISTS funnels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'archived')),
    campaign_id INTEGER,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS funnels_workspace_idx
    ON funnels (workspace_id, status);

CREATE TABLE IF NOT EXISTS funnel_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID NOT NULL REFERENCES funnels (id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL DEFAULT 0,
    name TEXT NOT NULL DEFAULT 'Step',
    landing_page_id UUID REFERENCES landing_pages (id) ON DELETE SET NULL,
    next_step_id UUID REFERENCES funnel_steps (id) ON DELETE SET NULL,
    exit_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS funnel_steps_funnel_idx
    ON funnel_steps (funnel_id, step_order);

ALTER TABLE funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS funnels_tenant ON funnels;
CREATE POLICY funnels_tenant ON funnels
    FOR ALL
    USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS funnel_steps_tenant ON funnel_steps;
CREATE POLICY funnel_steps_tenant ON funnel_steps
    FOR ALL
    USING (
        funnel_id IN (SELECT id FROM funnels WHERE workspace_id = current_tenant_id())
    )
    WITH CHECK (
        funnel_id IN (SELECT id FROM funnels WHERE workspace_id = current_tenant_id())
    );
