-- Google Calendar bidirectional sync (extends legacy calendar_events entity table)

ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS google_event_id TEXT;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS calendar_id TEXT DEFAULT 'primary';
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS attendees JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS meet_link TEXT;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

ALTER TABLE calendar_events ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE calendar_events ALTER COLUMN start_time DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS calendar_events_ws_google_idx
    ON calendar_events (workspace_id, google_event_id)
    WHERE google_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS calendar_events_ws_start_at_idx
    ON calendar_events (workspace_id, start_at);
