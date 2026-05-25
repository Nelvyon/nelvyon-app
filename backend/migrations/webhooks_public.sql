-- Frente 54 — Public analytics events + webhook delivery extensions

CREATE TABLE IF NOT EXISTS public_analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    event_name TEXT NOT NULL,
    properties JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS public_analytics_events_ws_idx
    ON public_analytics_events (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS public_analytics_events_name_idx
    ON public_analytics_events (workspace_id, event_name);
