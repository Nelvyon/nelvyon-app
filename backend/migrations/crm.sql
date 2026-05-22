-- NELVYON CRM pipeline (Supabase / Postgres)
-- Tables use crm_* prefix to avoid collision with legacy entities (contacts, deals, activities).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Contacts ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_contacts_workspace_idx ON crm_contacts (workspace_id);
CREATE INDEX IF NOT EXISTS crm_contacts_email_idx ON crm_contacts (workspace_id, lower(email));
CREATE INDEX IF NOT EXISTS crm_contacts_score_idx ON crm_contacts (workspace_id, score DESC);

-- ─── Deals ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    contact_id UUID NOT NULL REFERENCES crm_contacts (id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    value NUMERIC(14, 2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'EUR',
    stage TEXT NOT NULL DEFAULT 'lead' CHECK (
        stage IN (
            'lead',
            'qualified',
            'proposal',
            'negotiation',
            'closed_won',
            'closed_lost'
        )
    ),
    probability INTEGER NOT NULL DEFAULT 10 CHECK (probability >= 0 AND probability <= 100),
    close_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_deals_workspace_idx ON crm_deals (workspace_id);
CREATE INDEX IF NOT EXISTS crm_deals_contact_idx ON crm_deals (contact_id);
CREATE INDEX IF NOT EXISTS crm_deals_stage_idx ON crm_deals (workspace_id, stage);

-- ─── Activities ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    contact_id UUID NOT NULL REFERENCES crm_contacts (id) ON DELETE CASCADE,
    deal_id UUID REFERENCES crm_deals (id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    outcome TEXT,
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_activities_workspace_idx ON crm_activities (workspace_id);
CREATE INDEX IF NOT EXISTS crm_activities_contact_idx ON crm_activities (contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS crm_activities_deal_idx ON crm_activities (deal_id);
