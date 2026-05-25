-- Frente 55 — Executive report schedules & history

CREATE TABLE IF NOT EXISTS executive_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    period VARCHAR(16) NOT NULL,
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
    pdf_path TEXT,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS executive_reports_ws_idx
    ON executive_reports (workspace_id, generated_at DESC);

CREATE TABLE IF NOT EXISTS report_schedules (
    workspace_id INTEGER PRIMARY KEY,
    weekly_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    monthly_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    send_day_of_week INTEGER NOT NULL DEFAULT 0,
    send_hour INTEGER NOT NULL DEFAULT 9,
    send_minute INTEGER NOT NULL DEFAULT 0,
    timezone VARCHAR(64) NOT NULL DEFAULT 'Europe/Madrid',
    recipient_emails JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_weekly_sent_at TIMESTAMPTZ,
    last_monthly_sent_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
