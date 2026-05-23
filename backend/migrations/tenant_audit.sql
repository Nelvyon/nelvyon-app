-- NELVYON multi-tenant audit, consent, DPA + RLS helpers

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Immutable audit trail (append-only; no updated_at)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    old_value JSONB,
    new_value JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_tenant_created_idx
    ON audit_logs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_tenant_user_idx
    ON audit_logs (tenant_id, user_id);

CREATE INDEX IF NOT EXISTS audit_logs_resource_idx
    ON audit_logs (tenant_id, resource_type, created_at DESC);

-- Immutable user consent log (tenant_id = workspace_id)
CREATE TABLE IF NOT EXISTS gdpr_user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    consent_type TEXT NOT NULL,
    granted BOOLEAN NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address TEXT
);

CREATE INDEX IF NOT EXISTS gdpr_user_consents_tenant_user_idx
    ON gdpr_user_consents (tenant_id, user_id, granted_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS gdpr_user_consents_latest_idx
    ON gdpr_user_consents (tenant_id, user_id, consent_type, granted_at);

CREATE TABLE IF NOT EXISTS data_processing_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id INTEGER NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0',
    content TEXT NOT NULL,
    accepted_at TIMESTAMPTZ,
    accepted_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dpa_tenant_idx
    ON data_processing_agreements (tenant_id, created_at DESC);

-- Session helper for RLS (Supabase / Postgres)
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id INTEGER)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.tenant_id', p_tenant_id::TEXT, TRUE);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS INTEGER AS $$
BEGIN
    RETURN NULLIF(current_setting('app.tenant_id', TRUE), '')::INTEGER;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- RLS: audit_logs — tenant isolation, no deletes
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_tenant_select ON audit_logs;
CREATE POLICY audit_logs_tenant_select ON audit_logs
    FOR SELECT
    USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS audit_logs_tenant_insert ON audit_logs;
CREATE POLICY audit_logs_tenant_insert ON audit_logs
    FOR INSERT
    WITH CHECK (tenant_id = current_tenant_id());

-- RLS: gdpr_user_consents — append-only per tenant
ALTER TABLE gdpr_user_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gdpr_user_consents_tenant_select ON gdpr_user_consents;
CREATE POLICY gdpr_user_consents_tenant_select ON gdpr_user_consents
    FOR SELECT
    USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS gdpr_user_consents_tenant_insert ON gdpr_user_consents;
CREATE POLICY gdpr_user_consents_tenant_insert ON gdpr_user_consents
    FOR INSERT
    WITH CHECK (tenant_id = current_tenant_id());

-- Critical workspace-scoped tables (workspace_id = tenant_id)
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'crm_contacts', 'crm_deals', 'crm_activities',
        'campaigns', 'invoices', 'bookings', 'tickets'
    ])
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = tbl
        ) THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
            EXECUTE format('DROP POLICY IF EXISTS %I_tenant_isolation ON %I', tbl, tbl);
            EXECUTE format(
                'CREATE POLICY %I_tenant_isolation ON %I FOR ALL
                 USING (workspace_id = current_tenant_id())
                 WITH CHECK (workspace_id = current_tenant_id())',
                tbl, tbl
            );
        END IF;
    END LOOP;
END $$;
