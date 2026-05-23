-- NELVYON affiliates, referrals, agency marketplace

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS affiliates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    commission_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.2000,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'paused', 'suspended')),
    total_earnings NUMERIC(12, 2) NOT NULL DEFAULT 0,
    pending_payout NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_clicks INTEGER NOT NULL DEFAULT 0,
    total_conversions INTEGER NOT NULL DEFAULT 0,
    stripe_connect_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS affiliates_workspace_user_idx
    ON affiliates (workspace_id, user_id);

CREATE INDEX IF NOT EXISTS affiliates_code_idx ON affiliates (code);

CREATE TABLE IF NOT EXISTS affiliate_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID NOT NULL REFERENCES affiliates (id) ON DELETE CASCADE,
    referred_workspace_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
    commission_type TEXT NOT NULL DEFAULT 'first_year'
        CHECK (commission_type IN ('first_year', 'recurring')),
    subscription_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    commission_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS affiliate_referrals_workspace_idx
    ON affiliate_referrals (referred_workspace_id);

CREATE INDEX IF NOT EXISTS affiliate_referrals_affiliate_idx
    ON affiliate_referrals (affiliate_id, created_at DESC);

CREATE TABLE IF NOT EXISTS affiliate_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID NOT NULL REFERENCES affiliates (id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    ip_hash TEXT,
    user_agent TEXT,
    referrer TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS affiliate_clicks_affiliate_idx
    ON affiliate_clicks (affiliate_id, created_at DESC);

CREATE TABLE IF NOT EXISTS affiliate_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID NOT NULL REFERENCES affiliates (id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'eur',
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    stripe_transfer_id TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS affiliate_payouts_affiliate_idx
    ON affiliate_payouts (affiliate_id, created_at DESC);

CREATE TABLE IF NOT EXISTS agency_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    services JSONB NOT NULL DEFAULT '[]'::jsonb,
    countries JSONB NOT NULL DEFAULT '[]'::jsonb,
    pricing JSONB NOT NULL DEFAULT '{}'::jsonb,
    location TEXT,
    min_budget NUMERIC(12, 2),
    max_budget NUMERIC(12, 2),
    rating NUMERIC(3, 2) NOT NULL DEFAULT 0,
    reviews_count INTEGER NOT NULL DEFAULT 0,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agency_profiles_verified_idx
    ON agency_profiles (verified, active, rating DESC);

CREATE TABLE IF NOT EXISTS agency_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agency_profiles (id) ON DELETE CASCADE,
    reviewer_workspace_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS agency_reviews_unique_idx
    ON agency_reviews (agency_id, reviewer_workspace_id);

CREATE TABLE IF NOT EXISTS marketplace_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_workspace_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'eur',
    category TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    rating NUMERIC(3, 2) NOT NULL DEFAULT 0,
    reviews_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS marketplace_items_seller_idx
    ON marketplace_items (seller_workspace_id, active);

CREATE TABLE IF NOT EXISTS marketplace_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES marketplace_items (id) ON DELETE CASCADE,
    buyer_workspace_id INTEGER NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'eur',
    status TEXT NOT NULL DEFAULT 'completed'
        CHECK (status IN ('pending', 'completed', 'refunded', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS marketplace_purchases_buyer_idx
    ON marketplace_purchases (buyer_workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS marketplace_item_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES marketplace_items (id) ON DELETE CASCADE,
    reviewer_workspace_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (item_id, reviewer_workspace_id)
);
