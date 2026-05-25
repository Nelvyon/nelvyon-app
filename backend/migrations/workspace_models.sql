-- Frente 53 — Workspace fine-tuned models

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS workspace_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    model_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'collecting', 'uploading', 'queued', 'running', 'succeeded', 'failed', 'active')),
    openai_file_id TEXT,
    openai_job_id TEXT,
    dataset_path TEXT,
    examples_count INTEGER NOT NULL DEFAULT 0,
    base_model TEXT NOT NULL DEFAULT 'gpt-4o-mini-2024-07-18',
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    last_collected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS workspace_models_ws_idx
    ON workspace_models (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS workspace_models_ws_active_idx
    ON workspace_models (workspace_id, is_active)
    WHERE is_active = TRUE;
