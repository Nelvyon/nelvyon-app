-- NELVYON Dialer VoIP — Twilio calls

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS dialer_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    contact_id UUID,
    to_number TEXT NOT NULL,
    from_number TEXT NOT NULL DEFAULT '',
    call_sid TEXT,
    status TEXT NOT NULL DEFAULT 'queued',
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    outcome TEXT CHECK (outcome IS NULL OR outcome IN ('connected', 'no-answer', 'voicemail', 'failed')),
    recording_url TEXT,
    transcript TEXT,
    notes TEXT,
    agent_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dialer_calls_workspace_idx ON dialer_calls (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS dialer_calls_sid_idx ON dialer_calls (call_sid);

ALTER TABLE dialer_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dialer_calls_tenant ON dialer_calls;
CREATE POLICY dialer_calls_tenant ON dialer_calls
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());
