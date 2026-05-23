-- NELVYON social monitoring — alerts & mentions

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS social_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    keyword TEXT NOT NULL,
    platforms JSONB NOT NULL DEFAULT '[]'::jsonb,
    notify_email TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS social_alerts_workspace_idx ON social_alerts (workspace_id, is_active);

CREATE TABLE IF NOT EXISTS social_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES social_alerts (id) ON DELETE SET NULL,
    workspace_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    author TEXT,
    platform TEXT NOT NULL DEFAULT 'web',
    url TEXT,
    sentiment TEXT NOT NULL DEFAULT 'neutral'
        CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    sentiment_score REAL NOT NULL DEFAULT 0,
    is_handled BOOLEAN NOT NULL DEFAULT false,
    found_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS social_mentions_workspace_found_idx
    ON social_mentions (workspace_id, found_at DESC);
CREATE INDEX IF NOT EXISTS social_mentions_alert_idx ON social_mentions (alert_id);

ALTER TABLE social_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_mentions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS social_alerts_tenant ON social_alerts;
CREATE POLICY social_alerts_tenant ON social_alerts
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS social_mentions_tenant ON social_mentions;
CREATE POLICY social_mentions_tenant ON social_mentions
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());
