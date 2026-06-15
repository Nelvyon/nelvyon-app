-- P2a — Partner Stripe Connect + rebilling ledger (Agency Partners)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS partner_stripe_accounts (
    partner_workspace_id INTEGER PRIMARY KEY,
    partner_user_id TEXT NOT NULL,
    stripe_account_id TEXT NOT NULL UNIQUE,
    onboarding_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (onboarding_status IN ('not_started', 'pending', 'active', 'restricted')),
    charges_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    details_submitted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS partner_stripe_accounts_user_idx
    ON partner_stripe_accounts (partner_user_id);

CREATE TABLE IF NOT EXISTS partner_rebilling_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_workspace_id INTEGER NOT NULL,
    client_workspace_id INTEGER,
    event_type TEXT NOT NULL
        CHECK (event_type IN (
            'subscription_invoice',
            'pack_payment',
            'affiliate_payout',
            'connect_test',
            'manual_adjustment'
        )),
    stripe_event_id TEXT UNIQUE,
    gross_eur NUMERIC(12, 2) NOT NULL DEFAULT 0,
    wholesale_eur NUMERIC(12, 2) NOT NULL DEFAULT 0,
    partner_margin_eur NUMERIC(12, 2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'eur',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS partner_rebilling_ledger_ws_idx
    ON partner_rebilling_ledger (partner_workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS partner_rebilling_ledger_event_idx
    ON partner_rebilling_ledger (event_type);
