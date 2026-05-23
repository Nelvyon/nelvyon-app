-- NELVYON CDP — events, identities, segments

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS cdp_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    source TEXT NOT NULL,
    event_type TEXT NOT NULL,
    properties JSONB NOT NULL DEFAULT '{}'::jsonb,
    user_id TEXT,
    anonymous_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cdp_events_workspace_idx ON cdp_events (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cdp_events_user_idx ON cdp_events (workspace_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cdp_events_anon_idx ON cdp_events (workspace_id, anonymous_id, created_at DESC);

CREATE TABLE IF NOT EXISTS cdp_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    anonymous_id TEXT,
    user_id TEXT NOT NULL,
    traits JSONB NOT NULL DEFAULT '{}'::jsonb,
    first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS cdp_identities_user_idx
    ON cdp_identities (workspace_id, lower(user_id));

CREATE INDEX IF NOT EXISTS cdp_identities_anon_idx
    ON cdp_identities (workspace_id, anonymous_id);

CREATE TABLE IF NOT EXISTS cdp_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
    user_count INTEGER NOT NULL DEFAULT 0,
    last_evaluated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cdp_segments_workspace_idx ON cdp_segments (workspace_id, created_at DESC);

ALTER TABLE cdp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cdp_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE cdp_segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cdp_events_tenant ON cdp_events;
CREATE POLICY cdp_events_tenant ON cdp_events
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS cdp_events_public_insert ON cdp_events;
CREATE POLICY cdp_events_public_insert ON cdp_events
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS cdp_identities_tenant ON cdp_identities;
CREATE POLICY cdp_identities_tenant ON cdp_identities
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS cdp_identities_public ON cdp_identities;
CREATE POLICY cdp_identities_public ON cdp_identities
    FOR ALL USING (true);

DROP POLICY IF EXISTS cdp_segments_tenant ON cdp_segments;
CREATE POLICY cdp_segments_tenant ON cdp_segments
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());
