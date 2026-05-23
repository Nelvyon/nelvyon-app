-- NELVYON voice commands history

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS voice_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    transcript TEXT NOT NULL,
    action JSONB NOT NULL DEFAULT '{}'::jsonb,
    response TEXT,
    status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'error')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS voice_commands_workspace_created_idx
    ON voice_commands (workspace_id, created_at DESC);

ALTER TABLE voice_commands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS voice_commands_tenant ON voice_commands;
CREATE POLICY voice_commands_tenant ON voice_commands
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());
