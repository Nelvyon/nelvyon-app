-- F62 — Advanced dialer sessions (power / parallel)

CREATE TABLE IF NOT EXISTS dialer_advanced_sessions (
    id TEXT PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    client_id TEXT NOT NULL DEFAULT 'default',
    mode TEXT NOT NULL CHECK (mode IN ('power', 'parallel')),
    status TEXT NOT NULL DEFAULT 'active',
    queue_json TEXT NOT NULL DEFAULT '[]',
    parallel_limit INTEGER NOT NULL DEFAULT 3,
    voicemail_url TEXT,
    stats_json TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dialer_adv_sessions_ws_idx ON dialer_advanced_sessions (workspace_id, created_at DESC);

ALTER TABLE dialer_calls ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE dialer_calls ADD COLUMN IF NOT EXISTS amd_result TEXT;
ALTER TABLE dialer_calls ADD COLUMN IF NOT EXISTS call_score INTEGER;
ALTER TABLE dialer_calls ADD COLUMN IF NOT EXISTS recording_storage_path TEXT;
ALTER TABLE dialer_calls ADD COLUMN IF NOT EXISTS local_from_number TEXT;
ALTER TABLE dialer_calls ADD COLUMN IF NOT EXISTS client_id TEXT;

CREATE INDEX IF NOT EXISTS dialer_calls_session_idx ON dialer_calls (session_id);
