-- NELVYON onboarding & workspace usage tracking

CREATE TABLE IF NOT EXISTS workspace_usage (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    resource TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    period TEXT NOT NULL DEFAULT 'monthly',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (workspace_id, resource, period)
);

CREATE INDEX IF NOT EXISTS workspace_usage_workspace_idx
    ON workspace_usage (workspace_id, period);

CREATE INDEX IF NOT EXISTS workspace_usage_resource_idx
    ON workspace_usage (workspace_id, resource);

-- Workspace-level onboarding steps (automated checklist)
CREATE TABLE IF NOT EXISTS onboarding_workspace_steps (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    step TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (workspace_id, step)
);

CREATE INDEX IF NOT EXISTS onboarding_workspace_steps_ws_idx
    ON onboarding_workspace_steps (workspace_id);
