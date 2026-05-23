-- NELVYON Forms & Surveys

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    slug TEXT UNIQUE,
    kind TEXT NOT NULL DEFAULT 'form' CHECK (kind IN ('form', 'survey')),
    fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    embed_token UUID DEFAULT gen_random_uuid(),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    views_count INTEGER NOT NULL DEFAULT 0,
    submissions_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS forms_workspace_idx ON forms (workspace_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS form_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES forms (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    responses JSONB NOT NULL DEFAULT '{}'::jsonb,
    visitor_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    completion_seconds INTEGER,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS form_responses_form_idx ON form_responses (form_id, submitted_at DESC);

ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS forms_tenant ON forms;
CREATE POLICY forms_tenant ON forms
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS forms_public_read ON forms;
CREATE POLICY forms_public_read ON forms
    FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS form_responses_tenant ON form_responses;
CREATE POLICY form_responses_tenant ON form_responses
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS form_responses_public_insert ON form_responses;
CREATE POLICY form_responses_public_insert ON form_responses
    FOR INSERT WITH CHECK (
        form_id IN (SELECT id FROM forms WHERE status = 'published')
    );
