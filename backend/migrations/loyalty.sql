-- NELVYON Loyalty — programs, points, transactions

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS loyalty_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    points_per_euro NUMERIC(8, 2) NOT NULL DEFAULT 1,
    reward_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS loyalty_programs_workspace_idx ON loyalty_programs (workspace_id, is_active);

CREATE TABLE IF NOT EXISTS loyalty_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES loyalty_programs (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    customer_email TEXT NOT NULL,
    points_balance INTEGER NOT NULL DEFAULT 0,
    tier TEXT NOT NULL DEFAULT 'Bronze',
    total_earned INTEGER NOT NULL DEFAULT 0,
    total_redeemed INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS loyalty_points_program_email_idx
    ON loyalty_points (program_id, lower(customer_email));

CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES loyalty_programs (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    customer_email TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('earn', 'redeem')),
    points INTEGER NOT NULL,
    trigger TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS loyalty_transactions_program_idx
    ON loyalty_transactions (program_id, created_at DESC);

ALTER TABLE loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS loyalty_programs_tenant ON loyalty_programs;
CREATE POLICY loyalty_programs_tenant ON loyalty_programs
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS loyalty_programs_public_read ON loyalty_programs;
CREATE POLICY loyalty_programs_public_read ON loyalty_programs
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS loyalty_points_tenant ON loyalty_points;
CREATE POLICY loyalty_points_tenant ON loyalty_points
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS loyalty_points_public_read ON loyalty_points;
CREATE POLICY loyalty_points_public_read ON loyalty_points
    FOR SELECT USING (
        program_id IN (SELECT id FROM loyalty_programs WHERE is_active = true)
    );

DROP POLICY IF EXISTS loyalty_transactions_tenant ON loyalty_transactions;
CREATE POLICY loyalty_transactions_tenant ON loyalty_transactions
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());
