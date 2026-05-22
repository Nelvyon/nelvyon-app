-- NELVYON bookings with Zoom integration

CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    host_user_id TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_phone TEXT,
    service_name TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
    zoom_meeting_id TEXT,
    zoom_join_url TEXT,
    zoom_host_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bookings_workspace_idx ON bookings (workspace_id);
CREATE INDEX IF NOT EXISTS bookings_workspace_start_idx ON bookings (workspace_id, start_at);
CREATE INDEX IF NOT EXISTS bookings_workspace_status_idx ON bookings (workspace_id, status);
CREATE INDEX IF NOT EXISTS bookings_zoom_meeting_idx ON bookings (zoom_meeting_id)
    WHERE zoom_meeting_id IS NOT NULL;
