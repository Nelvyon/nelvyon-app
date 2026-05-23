-- NELVYON A/B Testing — experiments, variants, events

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS ab_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    hypothesis TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'running', 'paused', 'ended')),
    metric_goal TEXT NOT NULL DEFAULT 'conversion',
    traffic_split JSONB NOT NULL DEFAULT '{}'::jsonb,
    winner_variant_id UUID,
    ai_recommendation TEXT,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ab_experiments_workspace_idx ON ab_experiments (workspace_id, status);

CREATE TABLE IF NOT EXISTS ab_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID NOT NULL REFERENCES ab_experiments (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    changes JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_control BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS ab_variants_experiment_idx ON ab_variants (experiment_id);

CREATE TABLE IF NOT EXISTS ab_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID NOT NULL REFERENCES ab_experiments (id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES ab_variants (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL
        CHECK (event_type IN ('impression', 'conversion', 'click', 'revenue')),
    value NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ab_events_experiment_idx ON ab_events (experiment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ab_events_variant_idx ON ab_events (variant_id, event_type);

ALTER TABLE ab_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ab_experiments_tenant ON ab_experiments;
CREATE POLICY ab_experiments_tenant ON ab_experiments
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS ab_variants_tenant ON ab_variants;
CREATE POLICY ab_variants_tenant ON ab_variants
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS ab_events_tenant ON ab_events;
CREATE POLICY ab_events_tenant ON ab_events
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS ab_experiments_public_read ON ab_experiments;
CREATE POLICY ab_experiments_public_read ON ab_experiments
    FOR SELECT USING (status = 'running');

DROP POLICY IF EXISTS ab_variants_public_read ON ab_variants;
CREATE POLICY ab_variants_public_read ON ab_variants
    FOR SELECT USING (
        experiment_id IN (SELECT id FROM ab_experiments WHERE status = 'running')
    );

DROP POLICY IF EXISTS ab_events_public_insert ON ab_events;
CREATE POLICY ab_events_public_insert ON ab_events
    FOR INSERT WITH CHECK (
        experiment_id IN (SELECT id FROM ab_experiments WHERE status = 'running')
    );
