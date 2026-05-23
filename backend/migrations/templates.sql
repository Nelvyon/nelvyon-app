-- NELVYON reusable templates (email, whatsapp, contract, report, invoice)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL
        CHECK (type IN ('email', 'whatsapp', 'contract', 'report', 'invoice')),
    subject TEXT,
    content TEXT NOT NULL,
    variables JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS templates_workspace_type_idx
    ON templates (workspace_id, type);

CREATE INDEX IF NOT EXISTS templates_public_idx
    ON templates (is_public, type)
    WHERE is_public = TRUE;
