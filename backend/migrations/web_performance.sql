-- Frente 59 — Web performance metrics + static export metadata

ALTER TABLE os_website_projects ADD COLUMN IF NOT EXISTS static_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE os_website_projects ADD COLUMN IF NOT EXISTS static_cdn_base TEXT;

CREATE TABLE IF NOT EXISTS web_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL REFERENCES os_website_projects (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    lcp_ms DOUBLE PRECISION,
    cls DOUBLE PRECISION,
    fid_ms DOUBLE PRECISION,
    performance_score INTEGER,
    measured_url TEXT,
    raw_report JSONB,
    measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS web_performance_metrics_website_idx
    ON web_performance_metrics (website_id, measured_at DESC);
