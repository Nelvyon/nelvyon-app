-- Migration 507: FastAPI legacy runtime schemas (consolidated from backend/migrations/*.sql)
-- Replaces all runtime CREATE TABLE / ensure_schema DDL in FastAPI services.


-- === ab_testing.sql ===

-- NELVYON A/B Testing â€” experiments, variants, events

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS ab_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    hypothesis TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'running', 'paused', 'ended')),
    metric_goal TEXT NOT NULL DEFAULT 'conversion',
    traffic_split JSONB NOT NULL DEFAULT '{}'::jsonb,
    winner_variant_id UUID,
    ai_recommendation TEXT,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ab_experiments_workspace_idx ON ab_experiments (workspace_id, status);

CREATE TABLE IF NOT EXISTS ab_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID NOT NULL REFERENCES ab_experiments (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    changes JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_control BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS ab_variants_experiment_idx ON ab_variants (experiment_id);

CREATE TABLE IF NOT EXISTS ab_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID NOT NULL REFERENCES ab_experiments (id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES ab_variants (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL
        CHECK (event_type IN ('impression', 'conversion', 'click', 'revenue')),
    value NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ab_events_experiment_idx ON ab_events (experiment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ab_events_variant_idx ON ab_events (variant_id, event_type);

ALTER TABLE ab_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ab_experiments_tenant ON ab_experiments;
CREATE POLICY ab_experiments_tenant ON ab_experiments
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS ab_variants_tenant ON ab_variants;
CREATE POLICY ab_variants_tenant ON ab_variants
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS ab_events_tenant ON ab_events;
CREATE POLICY ab_events_tenant ON ab_events
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS ab_experiments_public_read ON ab_experiments;
CREATE POLICY ab_experiments_public_read ON ab_experiments
    FOR SELECT USING (status = 'running');

DROP POLICY IF EXISTS ab_variants_public_read ON ab_variants;
CREATE POLICY ab_variants_public_read ON ab_variants
    FOR SELECT USING (
        experiment_id IN (SELECT id FROM ab_experiments WHERE status = 'running')
    );

DROP POLICY IF EXISTS ab_events_public_insert ON ab_events;
CREATE POLICY ab_events_public_insert ON ab_events
    FOR INSERT WITH CHECK (
        experiment_id IN (SELECT id FROM ab_experiments WHERE status = 'running')
    );


-- === affiliates.sql ===

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


-- === api_keys.sql ===

-- Frente 54 â€” Public API keys (extends webhooks.sql api_keys table)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL DEFAULT '',
    key_hash TEXT NOT NULL,
    scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS api_keys_hash_idx ON api_keys (key_hash);
CREATE INDEX IF NOT EXISTS api_keys_workspace_idx ON api_keys (workspace_id);

ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;


-- === bookings.sql ===

-- NELVYON bookings with Zoom integration

CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    host_user_id TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_phone TEXT,
    service_name TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
    zoom_meeting_id TEXT,
    zoom_join_url TEXT,
    zoom_host_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bookings_workspace_idx ON bookings (workspace_id);
CREATE INDEX IF NOT EXISTS bookings_workspace_start_idx ON bookings (workspace_id, start_at);
CREATE INDEX IF NOT EXISTS bookings_workspace_status_idx ON bookings (workspace_id, status);
CREATE INDEX IF NOT EXISTS bookings_zoom_meeting_idx ON bookings (zoom_meeting_id)
    WHERE zoom_meeting_id IS NOT NULL;


-- === calendar.sql ===

-- Google Calendar bidirectional sync (extends legacy calendar_events entity table)

ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS google_event_id TEXT;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS calendar_id TEXT DEFAULT 'primary';
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS attendees JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS meet_link TEXT;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

ALTER TABLE calendar_events ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE calendar_events ALTER COLUMN start_time DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS calendar_events_ws_google_idx
    ON calendar_events (workspace_id, google_event_id)
    WHERE google_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS calendar_events_ws_start_at_idx
    ON calendar_events (workspace_id, start_at);


-- === campaigns.sql ===

-- NELVYON campaign scheduler & deliverability (Postgres)
-- Extends legacy `campaigns` (Alembic) and adds per-recipient tracking.

-- â”€â”€â”€ campaigns (additive columns on existing table) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS from_name TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS from_email TEXT;

CREATE INDEX IF NOT EXISTS campaigns_workspace_status_idx
    ON campaigns (workspace_id, status);

CREATE INDEX IF NOT EXISTS campaigns_scheduled_idx
    ON campaigns (status, scheduled_at)
    WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;

-- â”€â”€â”€ campaign_recipients â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS campaign_recipients (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
    contact_id INTEGER,
    email TEXT,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'failed', 'bounced', 'opened', 'clicked')),
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS campaign_recipients_campaign_idx
    ON campaign_recipients (campaign_id);

CREATE INDEX IF NOT EXISTS campaign_recipients_status_idx
    ON campaign_recipients (campaign_id, status);


-- === cdp.sql ===

-- NELVYON CDP â€” events, identities, segments

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS cdp_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    source TEXT NOT NULL,
    event_type TEXT NOT NULL,
    properties JSONB NOT NULL DEFAULT '{}'::jsonb,
    user_id TEXT,
    anonymous_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cdp_events_workspace_idx ON cdp_events (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cdp_events_user_idx ON cdp_events (workspace_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cdp_events_anon_idx ON cdp_events (workspace_id, anonymous_id, created_at DESC);

CREATE TABLE IF NOT EXISTS cdp_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    anonymous_id TEXT,
    user_id TEXT NOT NULL,
    traits JSONB NOT NULL DEFAULT '{}'::jsonb,
    first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS cdp_identities_user_idx
    ON cdp_identities (workspace_id, lower(user_id));

CREATE INDEX IF NOT EXISTS cdp_identities_anon_idx
    ON cdp_identities (workspace_id, anonymous_id);

CREATE TABLE IF NOT EXISTS cdp_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
    user_count INTEGER NOT NULL DEFAULT 0,
    last_evaluated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cdp_segments_workspace_idx ON cdp_segments (workspace_id, created_at DESC);

ALTER TABLE cdp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cdp_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE cdp_segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cdp_events_tenant ON cdp_events;
CREATE POLICY cdp_events_tenant ON cdp_events
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS cdp_events_public_insert ON cdp_events;
CREATE POLICY cdp_events_public_insert ON cdp_events
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS cdp_identities_tenant ON cdp_identities;
CREATE POLICY cdp_identities_tenant ON cdp_identities
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS cdp_identities_public ON cdp_identities;
CREATE POLICY cdp_identities_public ON cdp_identities
    FOR ALL USING (true);

DROP POLICY IF EXISTS cdp_segments_tenant ON cdp_segments;
CREATE POLICY cdp_segments_tenant ON cdp_segments
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());


-- === chatbot_builder.sql ===

-- NELVYON embeddable chatbot builder

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS chatbots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    embed_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chatbots_workspace_idx ON chatbots (workspace_id, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS chatbots_embed_token_idx ON chatbots (embed_token);

CREATE TABLE IF NOT EXISTS chatbot_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id UUID NOT NULL REFERENCES chatbots (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    session_id TEXT NOT NULL,
    visitor_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    lead_captured BOOLEAN NOT NULL DEFAULT false,
    escalated BOOLEAN NOT NULL DEFAULT false,
    satisfaction INTEGER CHECK (satisfaction IS NULL OR (satisfaction >= 1 AND satisfaction <= 5)),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chatbot_conversations_bot_idx
    ON chatbot_conversations (chatbot_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS chatbot_conversations_session_idx
    ON chatbot_conversations (chatbot_id, session_id);
CREATE INDEX IF NOT EXISTS chatbot_conversations_workspace_idx
    ON chatbot_conversations (workspace_id, started_at DESC);

ALTER TABLE chatbots ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chatbots_tenant ON chatbots;
CREATE POLICY chatbots_tenant ON chatbots
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS chatbots_public_widget ON chatbots;
CREATE POLICY chatbots_public_widget ON chatbots
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS chatbot_conversations_tenant ON chatbot_conversations;
CREATE POLICY chatbot_conversations_tenant ON chatbot_conversations
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());


-- === client_web_builder.sql ===

-- F61 â€” Client websites (OS Web Builder) â€” Postgres + SQLite compatible

CREATE TABLE IF NOT EXISTS client_websites (
    id SERIAL PRIMARY KEY,
    client_id VARCHAR(128) NOT NULL,
    workspace_id INTEGER,
    slug VARCHAR(128) NOT NULL,
    html_content TEXT NOT NULL,
    css_content TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_websites_client ON client_websites(client_id);
CREATE INDEX IF NOT EXISTS idx_client_websites_slug ON client_websites(slug);

CREATE TABLE IF NOT EXISTS website_sections (
    id SERIAL PRIMARY KEY,
    website_id INTEGER NOT NULL,
    section_type VARCHAR(64) NOT NULL,
    content_json TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_website_sections_site ON website_sections(website_id);


-- === crm.sql ===

-- NELVYON CRM pipeline (Supabase / Postgres)
-- Tables use crm_* prefix to avoid collision with legacy entities (contacts, deals, activities).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- â”€â”€â”€ Contacts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€ Deals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€ Activities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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


-- === dialer.sql ===

-- NELVYON Dialer VoIP â€” Twilio calls

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS dialer_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    contact_id UUID,
    to_number TEXT NOT NULL,
    from_number TEXT NOT NULL DEFAULT '',
    call_sid TEXT,
    status TEXT NOT NULL DEFAULT 'queued',
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    outcome TEXT CHECK (outcome IS NULL OR outcome IN ('connected', 'no-answer', 'voicemail', 'failed')),
    recording_url TEXT,
    transcript TEXT,
    notes TEXT,
    agent_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dialer_calls_workspace_idx ON dialer_calls (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS dialer_calls_sid_idx ON dialer_calls (call_sid);

ALTER TABLE dialer_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dialer_calls_tenant ON dialer_calls;
CREATE POLICY dialer_calls_tenant ON dialer_calls
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());


-- === dialer_advanced.sql ===

-- F62 â€” Advanced dialer sessions (power / parallel)

CREATE TABLE IF NOT EXISTS dialer_advanced_sessions (
    id TEXT PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    client_id TEXT NOT NULL DEFAULT 'default',
    mode TEXT NOT NULL CHECK (mode IN ('power', 'parallel')),
    status TEXT NOT NULL DEFAULT 'active',
    queue_json TEXT NOT NULL DEFAULT '[]',
    parallel_limit INTEGER NOT NULL DEFAULT 3,
    voicemail_url TEXT,
    stats_json TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dialer_adv_sessions_ws_idx ON dialer_advanced_sessions (workspace_id, created_at DESC);

ALTER TABLE dialer_calls ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE dialer_calls ADD COLUMN IF NOT EXISTS amd_result TEXT;
ALTER TABLE dialer_calls ADD COLUMN IF NOT EXISTS call_score INTEGER;
ALTER TABLE dialer_calls ADD COLUMN IF NOT EXISTS recording_storage_path TEXT;
ALTER TABLE dialer_calls ADD COLUMN IF NOT EXISTS local_from_number TEXT;
ALTER TABLE dialer_calls ADD COLUMN IF NOT EXISTS client_id TEXT;

CREATE INDEX IF NOT EXISTS dialer_calls_session_idx ON dialer_calls (session_id);


-- === email_queue_scheduled_at.sql ===

-- Phase 1 Local Pack welcome sequence
-- Adds scheduling support for queued campaign emails.

ALTER TABLE email_queue
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS ix_email_queue_scheduled_at
  ON email_queue (status, scheduled_at);


-- === forms.sql ===

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


-- === funnel_builder.sql ===

-- NELVYON visual funnel builder

CREATE TABLE IF NOT EXISTS funnels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'archived')),
    campaign_id INTEGER,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS funnels_workspace_idx
    ON funnels (workspace_id, status);

CREATE TABLE IF NOT EXISTS funnel_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID NOT NULL REFERENCES funnels (id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL DEFAULT 0,
    name TEXT NOT NULL DEFAULT 'Step',
    landing_page_id UUID REFERENCES landing_pages (id) ON DELETE SET NULL,
    next_step_id UUID REFERENCES funnel_steps (id) ON DELETE SET NULL,
    exit_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS funnel_steps_funnel_idx
    ON funnel_steps (funnel_id, step_order);

ALTER TABLE funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS funnels_tenant ON funnels;
CREATE POLICY funnels_tenant ON funnels
    FOR ALL
    USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS funnel_steps_tenant ON funnel_steps;
CREATE POLICY funnel_steps_tenant ON funnel_steps
    FOR ALL
    USING (
        funnel_id IN (SELECT id FROM funnels WHERE workspace_id = current_tenant_id())
    )
    WITH CHECK (
        funnel_id IN (SELECT id FROM funnels WHERE workspace_id = current_tenant_id())
    );


-- === gdpr.sql ===

-- NELVYON GDPR â€” consent tracking and data deletion requests

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    contact_id TEXT NOT NULL,
    consent_type TEXT NOT NULL,
    granted BOOLEAN NOT NULL DEFAULT TRUE,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS consent_records_workspace_contact_idx
    ON consent_records (workspace_id, contact_id, created_at DESC);

CREATE INDEX IF NOT EXISTS consent_records_type_idx
    ON consent_records (workspace_id, consent_type);

CREATE TABLE IF NOT EXISTS data_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    contact_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS data_deletion_requests_pending_idx
    ON data_deletion_requests (status, requested_at)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS data_deletion_requests_workspace_idx
    ON data_deletion_requests (workspace_id, requested_at DESC);


-- === helpdesk.sql ===

-- NELVYON multichannel helpdesk (WhatsApp + email inbox)

CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    contact_id INTEGER,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'pending', 'resolved', 'closed')),
    priority TEXT NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    channel TEXT NOT NULL
        CHECK (channel IN ('whatsapp', 'email', 'web')),
    assigned_to TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_messages (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets (id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'web')),
    content TEXT NOT NULL,
    attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
    sender_name TEXT,
    sender_email TEXT,
    sender_phone TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tickets_workspace_idx ON tickets (workspace_id);
CREATE INDEX IF NOT EXISTS tickets_workspace_status_idx ON tickets (workspace_id, status);
CREATE INDEX IF NOT EXISTS tickets_workspace_channel_idx ON tickets (workspace_id, channel);
CREATE INDEX IF NOT EXISTS ticket_messages_ticket_idx ON ticket_messages (ticket_id, created_at);


-- === invoices.sql ===

-- NELVYON Spanish invoicing (IVA, correlativa numbering)

CREATE TABLE IF NOT EXISTS invoice_sequences (
    workspace_id INTEGER NOT NULL,
    series TEXT NOT NULL DEFAULT 'FAC',
    year INTEGER NOT NULL,
    last_number INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (workspace_id, series, year)
);

CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    invoice_number TEXT NOT NULL,
    series TEXT NOT NULL DEFAULT 'FAC',
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_nif TEXT,
    client_address TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
    iva_rate NUMERIC(5, 2) NOT NULL DEFAULT 21,
    iva_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total NUMERIC(14, 2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'EUR',
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
    due_date DATE,
    paid_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    pdf_path TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS invoices_workspace_number_idx
    ON invoices (workspace_id, invoice_number);

CREATE INDEX IF NOT EXISTS invoices_workspace_status_idx
    ON invoices (workspace_id, status);

CREATE INDEX IF NOT EXISTS invoices_workspace_created_idx
    ON invoices (workspace_id, created_at DESC);


-- === landing_builder.sql ===

-- NELVYON landing page builder

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS landing_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),
    blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    ab_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    custom_domain TEXT,
    domain_verified BOOLEAN NOT NULL DEFAULT FALSE,
    form_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS landing_pages_workspace_idx
    ON landing_pages (workspace_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS landing_pages_slug_idx
    ON landing_pages (slug) WHERE slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS landing_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    thumbnail_url TEXT,
    blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_default BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS landing_templates_category_idx
    ON landing_templates (category);

CREATE TABLE IF NOT EXISTS landing_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES landing_pages (id) ON DELETE CASCADE,
    variant TEXT NOT NULL DEFAULT 'control',
    event_type TEXT NOT NULL
        CHECK (event_type IN ('impression', 'conversion', 'form_submit', 'time_on_page')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS landing_analytics_page_idx
    ON landing_analytics (page_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS landing_analytics_variant_idx
    ON landing_analytics (page_id, variant, event_type);

ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS landing_pages_tenant ON landing_pages;
CREATE POLICY landing_pages_tenant ON landing_pages
    FOR ALL
    USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS landing_pages_public_read ON landing_pages;
CREATE POLICY landing_pages_public_read ON landing_pages
    FOR SELECT
    USING (status = 'published');

DROP POLICY IF EXISTS landing_analytics_tenant ON landing_analytics;
CREATE POLICY landing_analytics_tenant ON landing_analytics
    FOR ALL
    USING (
        page_id IN (SELECT id FROM landing_pages WHERE workspace_id = current_tenant_id())
    )
    WITH CHECK (
        page_id IN (SELECT id FROM landing_pages WHERE workspace_id = current_tenant_id())
    );

DROP POLICY IF EXISTS landing_analytics_public_insert ON landing_analytics;
CREATE POLICY landing_analytics_public_insert ON landing_analytics
    FOR INSERT
    WITH CHECK (
        page_id IN (SELECT id FROM landing_pages WHERE status = 'published')
    );

-- Templates are global (read-only for all tenants)
ALTER TABLE landing_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS landing_templates_read ON landing_templates;
CREATE POLICY landing_templates_read ON landing_templates
    FOR SELECT
    USING (TRUE);


-- === livechat.sql ===

-- NELVYON native live chat

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS chat_widget_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id INTEGER NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#6366f1',
    welcome_message TEXT NOT NULL DEFAULT 'Â¡Hola! Â¿En quÃ© podemos ayudarte?',
    agent_name TEXT NOT NULL DEFAULT 'Soporte',
    avatar_url TEXT,
    position TEXT NOT NULL DEFAULT 'bottom-right',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id INTEGER NOT NULL,
    visitor_id TEXT NOT NULL,
    visitor_name TEXT,
    visitor_email TEXT,
    page_url TEXT,
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'waiting', 'closed')),
    assigned_agent_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    csat_score INTEGER CHECK (csat_score IS NULL OR (csat_score >= 1 AND csat_score <= 5)),
    resolution_note TEXT,
    first_response_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS chat_conversations_tenant_status_idx
    ON chat_conversations (tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS chat_conversations_visitor_idx
    ON chat_conversations (tenant_id, visitor_id);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES chat_conversations (id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('visitor', 'agent', 'bot')),
    sender_id TEXT,
    content TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_messages_conversation_idx
    ON chat_messages (conversation_id, created_at ASC);

-- RLS (requires set_tenant_context / current_tenant_id from tenant_audit.sql)
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_conversations_tenant ON chat_conversations;
CREATE POLICY chat_conversations_tenant ON chat_conversations
    FOR ALL
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS chat_messages_tenant ON chat_messages;
CREATE POLICY chat_messages_tenant ON chat_messages
    FOR ALL
    USING (
        conversation_id IN (
            SELECT id FROM chat_conversations WHERE tenant_id = current_tenant_id()
        )
    )
    WITH CHECK (
        conversation_id IN (
            SELECT id FROM chat_conversations WHERE tenant_id = current_tenant_id()
        )
    );


-- === lms.sql ===

-- NELVYON LMS â€” courses, modules, lessons, enrollments, progress

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS lms_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price_cents INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'eur',
    stripe_product_id TEXT,
    stripe_price_id TEXT,
    thumbnail_url TEXT,
    category TEXT,
    idioma TEXT NOT NULL DEFAULT 'es',
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'pending_stripe')),
    students_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lms_courses_workspace_idx ON lms_courses (workspace_id, status);

CREATE TABLE IF NOT EXISTS lms_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES lms_courses (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS lms_modules_course_idx ON lms_modules (course_id, order_index);

CREATE TABLE IF NOT EXISTS lms_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES lms_modules (id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES lms_courses (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'text'
        CHECK (content_type IN ('video', 'text', 'pdf', 'quiz')),
    content_url TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 0,
    order_index INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS lms_lessons_module_idx ON lms_lessons (module_id, order_index);
CREATE INDEX IF NOT EXISTS lms_lessons_course_idx ON lms_lessons (course_id);

CREATE TABLE IF NOT EXISTS lms_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES lms_courses (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    student_email TEXT NOT NULL,
    student_name TEXT,
    payment_intent_id TEXT,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'completed', 'refunded')),
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lms_enrollments_course_idx ON lms_enrollments (course_id, enrolled_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS lms_enrollments_course_email_idx
    ON lms_enrollments (course_id, lower(student_email));

CREATE TABLE IF NOT EXISTS lms_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES lms_enrollments (id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lms_lessons (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (enrollment_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS lms_progress_enrollment_idx ON lms_progress (enrollment_id);

ALTER TABLE lms_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lms_courses_tenant ON lms_courses;
CREATE POLICY lms_courses_tenant ON lms_courses
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS lms_courses_public_read ON lms_courses;
CREATE POLICY lms_courses_public_read ON lms_courses
    FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS lms_modules_tenant ON lms_modules;
CREATE POLICY lms_modules_tenant ON lms_modules
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS lms_modules_public_read ON lms_modules;
CREATE POLICY lms_modules_public_read ON lms_modules
    FOR SELECT USING (
        course_id IN (SELECT id FROM lms_courses WHERE status = 'published')
    );

DROP POLICY IF EXISTS lms_lessons_tenant ON lms_lessons;
CREATE POLICY lms_lessons_tenant ON lms_lessons
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS lms_lessons_public_read ON lms_lessons;
CREATE POLICY lms_lessons_public_read ON lms_lessons
    FOR SELECT USING (
        course_id IN (SELECT id FROM lms_courses WHERE status = 'published')
    );

DROP POLICY IF EXISTS lms_enrollments_tenant ON lms_enrollments;
CREATE POLICY lms_enrollments_tenant ON lms_enrollments
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS lms_progress_tenant ON lms_progress;
CREATE POLICY lms_progress_tenant ON lms_progress
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());


-- === loyalty.sql ===

-- NELVYON Loyalty â€” programs, points, transactions

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


-- === omnichannel.sql ===

-- Frente 52 â€” Unified omnichannel inbox

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS omnichannel_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    contact_id TEXT,
    channel TEXT NOT NULL
        CHECK (channel IN ('email', 'whatsapp', 'sms', 'chat', 'voice')),
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'pending', 'resolved')),
    subject TEXT,
    participant_name TEXT,
    participant_email TEXT,
    participant_phone TEXT,
    last_message TEXT,
    last_message_at TIMESTAMPTZ,
    unread_count INTEGER NOT NULL DEFAULT 0,
    external_id TEXT,
    auto_reply_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    last_inbound_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS omnichannel_conv_ws_activity_idx
    ON omnichannel_conversations (workspace_id, last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS omnichannel_conv_ws_status_idx
    ON omnichannel_conversations (workspace_id, status);

CREATE INDEX IF NOT EXISTS omnichannel_conv_external_idx
    ON omnichannel_conversations (workspace_id, channel, external_id);

CREATE TABLE IF NOT EXISTS omnichannel_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES omnichannel_conversations (id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
    content TEXT NOT NULL,
    channel TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS omnichannel_msg_conv_idx
    ON omnichannel_messages (conversation_id, created_at ASC);


-- === onboarding.sql ===

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


-- === os_agent_prompts.sql ===

-- Frente 58 â€” Encrypted OS agent prompts (never store plaintext in repo)

CREATE TABLE IF NOT EXISTS os_agent_prompts (
    agent_id TEXT PRIMARY KEY,
    prompt_encrypted TEXT NOT NULL,
    sector TEXT,
    agent_class TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS os_agent_prompts_sector_idx ON os_agent_prompts (sector);


-- === os_store_builder.sql ===

-- NELVYON OS Store Builder â€” AI-generated online stores

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS os_store_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE,
    store_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'generating', 'ready', 'published', 'error')),
    currency TEXT NOT NULL DEFAULT 'EUR',
    country_code TEXT NOT NULL DEFAULT 'ES',
    stripe_account_id TEXT,
    custom_domain TEXT,
    domain_verified BOOLEAN NOT NULL DEFAULT FALSE,
    seo_artifacts JSONB NOT NULL DEFAULT '{}'::jsonb,
    pages_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS os_store_projects_workspace_idx
    ON os_store_projects (workspace_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS os_store_projects_subdomain_idx
    ON os_store_projects (subdomain) WHERE subdomain IS NOT NULL;

CREATE TABLE IF NOT EXISTS os_store_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES os_store_projects (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    page_type TEXT NOT NULL,
    page_slug TEXT NOT NULL,
    landing_page_id UUID REFERENCES landing_pages (id) ON DELETE SET NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, page_slug)
);

CREATE INDEX IF NOT EXISTS os_store_pages_project_idx
    ON os_store_pages (project_id, order_index);

CREATE TABLE IF NOT EXISTS os_store_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES os_store_projects (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    ai_description TEXT,
    price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
    currency TEXT NOT NULL DEFAULT 'EUR',
    stripe_product_id TEXT,
    stripe_price_id TEXT,
    stripe_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (stripe_status IN ('pending', 'pending_stripe', 'active', 'archived')),
    stock INTEGER NOT NULL DEFAULT 100,
    category TEXT,
    images JSONB NOT NULL DEFAULT '[]'::jsonb,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, slug)
);

CREATE INDEX IF NOT EXISTS os_store_products_project_idx
    ON os_store_products (project_id, is_active, category);

CREATE TABLE IF NOT EXISTS os_store_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES os_store_projects (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    customer_email TEXT NOT NULL,
    customer_name TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
    currency TEXT NOT NULL DEFAULT 'EUR',
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'refunded')),
    stripe_payment_intent_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS os_store_orders_project_idx
    ON os_store_orders (project_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS os_store_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES os_store_projects (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    stripe_coupon_id TEXT,
    code TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('percent', 'fixed')),
    value NUMERIC(10, 2) NOT NULL,
    max_uses INTEGER,
    uses_count INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, code)
);

CREATE TABLE IF NOT EXISTS os_store_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL UNIQUE,
    thumbnail_url TEXT,
    store_info_defaults JSONB NOT NULL DEFAULT '{}'::jsonb,
    sample_products JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_default BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE os_store_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_store_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_store_discounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS os_store_projects_tenant ON os_store_projects;
CREATE POLICY os_store_projects_tenant ON os_store_projects
    FOR ALL
    USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS os_store_projects_public_read ON os_store_projects;
CREATE POLICY os_store_projects_public_read ON os_store_projects
    FOR SELECT
    USING (status = 'published');

DROP POLICY IF EXISTS os_store_pages_tenant ON os_store_pages;
CREATE POLICY os_store_pages_tenant ON os_store_pages
    FOR ALL
    USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS os_store_pages_public_read ON os_store_pages;
CREATE POLICY os_store_pages_public_read ON os_store_pages
    FOR SELECT
    USING (
        is_published = TRUE
        AND project_id IN (SELECT id FROM os_store_projects WHERE status = 'published')
    );

DROP POLICY IF EXISTS os_store_products_tenant ON os_store_products;
CREATE POLICY os_store_products_tenant ON os_store_products
    FOR ALL
    USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS os_store_products_public_read ON os_store_products;
CREATE POLICY os_store_products_public_read ON os_store_products
    FOR SELECT
    USING (
        is_active = TRUE
        AND project_id IN (SELECT id FROM os_store_projects WHERE status = 'published')
    );

DROP POLICY IF EXISTS os_store_orders_tenant ON os_store_orders;
CREATE POLICY os_store_orders_tenant ON os_store_orders
    FOR ALL
    USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS os_store_orders_public_insert ON os_store_orders;
CREATE POLICY os_store_orders_public_insert ON os_store_orders
    FOR INSERT
    WITH CHECK (
        project_id IN (SELECT id FROM os_store_projects WHERE status = 'published')
    );

DROP POLICY IF EXISTS os_store_discounts_tenant ON os_store_discounts;
CREATE POLICY os_store_discounts_tenant ON os_store_discounts
    FOR ALL
    USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS os_store_templates_read ON os_store_templates;
CREATE POLICY os_store_templates_read ON os_store_templates
    FOR SELECT
    USING (TRUE);

ALTER TABLE os_store_templates ENABLE ROW LEVEL SECURITY;


-- === os_web_builder.sql ===

-- NELVYON OS Web Builder â€” multi-page websites

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS os_website_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE,
    business_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'generating', 'ready', 'published', 'error')),
    pages_count INTEGER NOT NULL DEFAULT 0,
    custom_domain TEXT,
    domain_verified BOOLEAN NOT NULL DEFAULT FALSE,
    seo_artifacts JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS os_website_projects_workspace_idx
    ON os_website_projects (workspace_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS os_website_projects_subdomain_idx
    ON os_website_projects (subdomain) WHERE subdomain IS NOT NULL;

CREATE TABLE IF NOT EXISTS os_website_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES os_website_projects (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    page_type TEXT NOT NULL DEFAULT 'custom'
        CHECK (page_type IN ('home', 'about', 'services', 'pricing', 'contact', 'blog', 'faq', 'custom')),
    page_slug TEXT NOT NULL,
    landing_page_id UUID REFERENCES landing_pages (id) ON DELETE SET NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, page_slug)
);

CREATE INDEX IF NOT EXISTS os_website_pages_project_idx
    ON os_website_pages (project_id, order_index);

CREATE TABLE IF NOT EXISTS os_website_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL UNIQUE,
    thumbnail_url TEXT,
    pages_structure JSONB NOT NULL DEFAULT '[]'::jsonb,
    business_info_defaults JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_default BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE os_website_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_website_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS os_website_projects_tenant ON os_website_projects;
CREATE POLICY os_website_projects_tenant ON os_website_projects
    FOR ALL
    USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS os_website_projects_public_read ON os_website_projects;
CREATE POLICY os_website_projects_public_read ON os_website_projects
    FOR SELECT
    USING (status = 'published');

DROP POLICY IF EXISTS os_website_pages_tenant ON os_website_pages;
CREATE POLICY os_website_pages_tenant ON os_website_pages
    FOR ALL
    USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS os_website_pages_public_read ON os_website_pages;
CREATE POLICY os_website_pages_public_read ON os_website_pages
    FOR SELECT
    USING (
        is_published = TRUE
        AND project_id IN (SELECT id FROM os_website_projects WHERE status = 'published')
    );

DROP POLICY IF EXISTS os_website_templates_read ON os_website_templates;
CREATE POLICY os_website_templates_read ON os_website_templates
    FOR SELECT
    USING (TRUE);

ALTER TABLE os_website_templates ENABLE ROW LEVEL SECURITY;


-- === partner_rebilling.sql ===

-- P2a â€” Partner Stripe Connect + rebilling ledger (Agency Partners)

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


-- === performance_indexes.sql ===

-- Performance indexes for workspace-scoped list endpoints (FRENTE 45)

CREATE INDEX IF NOT EXISTS idx_dialer_calls_ws_created ON dialer_calls (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dialer_calls_ws_status ON dialer_calls (workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_tickets_ws_created ON tickets (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_ws_status ON tickets (workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_invoices_ws_created ON invoices (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_ws_status ON invoices (workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_forms_ws_created ON forms (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forms_ws_status ON forms (workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_form_responses_form ON form_responses (form_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_qr_codes_ws_created ON qr_codes (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_scans_qr ON qr_scans (qr_id, scanned_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_ws_created ON crm_contacts (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_deals_ws_created ON crm_deals (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_activities_ws_created ON crm_activities (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_ws_created ON bookings (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_ws_status ON bookings (workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_webinars_ws_created ON webinars (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_ws_status ON subscriptions (workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_marketplace_items_active ON marketplace_items (active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_buyer ON marketplace_purchases (buyer_workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_ws ON push_subscriptions (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint ON webhook_deliveries (endpoint_id, created_at DESC);


-- === push_subscriptions.sql ===

-- Web Push (PWA) subscription storage

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (workspace_id, user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS push_subscriptions_workspace_idx ON push_subscriptions (workspace_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_endpoint_idx ON push_subscriptions (endpoint);


-- === qr_codes.sql ===

-- NELVYON QR Code Generator â€” static & dynamic QRs

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    qr_type TEXT NOT NULL DEFAULT 'url',
    content TEXT NOT NULL DEFAULT '',
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    short_code TEXT UNIQUE,
    destination_url TEXT,
    image_base64 TEXT,
    is_dynamic BOOLEAN NOT NULL DEFAULT false,
    scan_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS qr_codes_workspace_idx ON qr_codes (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS qr_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_id UUID NOT NULL REFERENCES qr_codes (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    ip TEXT,
    user_agent TEXT,
    country TEXT,
    city TEXT,
    device_type TEXT,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS qr_scans_qr_idx ON qr_scans (qr_id, scanned_at DESC);

ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS qr_codes_tenant ON qr_codes;
CREATE POLICY qr_codes_tenant ON qr_codes
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS qr_codes_public_read ON qr_codes;
CREATE POLICY qr_codes_public_read ON qr_codes
    FOR SELECT USING (short_code IS NOT NULL);

DROP POLICY IF EXISTS qr_scans_tenant ON qr_scans;
CREATE POLICY qr_scans_tenant ON qr_scans
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS qr_scans_public_insert ON qr_scans;
CREATE POLICY qr_scans_public_insert ON qr_scans
    FOR INSERT WITH CHECK (true);


-- === report_schedules.sql ===

-- Frente 55 â€” Executive report schedules & history

CREATE TABLE IF NOT EXISTS executive_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    period VARCHAR(16) NOT NULL,
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
    pdf_path TEXT,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS executive_reports_ws_idx
    ON executive_reports (workspace_id, generated_at DESC);

CREATE TABLE IF NOT EXISTS report_schedules (
    workspace_id INTEGER PRIMARY KEY,
    weekly_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    monthly_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    send_day_of_week INTEGER NOT NULL DEFAULT 0,
    send_hour INTEGER NOT NULL DEFAULT 9,
    send_minute INTEGER NOT NULL DEFAULT 0,
    timezone VARCHAR(64) NOT NULL DEFAULT 'Europe/Madrid',
    recipient_emails JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_weekly_sent_at TIMESTAMPTZ,
    last_monthly_sent_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- === ses_suppressions.sql ===

-- SES bounce/complaint suppression list (do not resend to these addresses)

CREATE TABLE IF NOT EXISTS ses_suppressions (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    reason TEXT NOT NULL CHECK (reason IN ('bounce', 'complaint')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ses_suppressions_email_idx ON ses_suppressions (lower(email));


-- === sms_campaigns.sql ===

-- NELVYON SMS Marketing (Twilio)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS sms_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'pending_auth')),
    scheduled_at TIMESTAMPTZ,
    sent_count INTEGER NOT NULL DEFAULT 0,
    delivered_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    reply_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sms_campaigns_workspace_status_idx
    ON sms_campaigns (workspace_id, status, scheduled_at);

CREATE INDEX IF NOT EXISTS sms_campaigns_workspace_created_idx
    ON sms_campaigns (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS sms_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES sms_campaigns (id) ON DELETE SET NULL,
    workspace_id INTEGER NOT NULL,
    to_number TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'inbound', 'opt_out')),
    twilio_sid TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sms_messages_campaign_idx ON sms_messages (campaign_id);
CREATE INDEX IF NOT EXISTS sms_messages_workspace_idx ON sms_messages (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sms_messages_to_number_idx ON sms_messages (workspace_id, to_number);

CREATE TABLE IF NOT EXISTS sms_optouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    workspace_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (phone_number, workspace_id)
);

CREATE INDEX IF NOT EXISTS sms_optouts_workspace_idx ON sms_optouts (workspace_id);

-- Inbound replies (conversations)
CREATE TABLE IF NOT EXISTS sms_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    from_number TEXT NOT NULL,
    message TEXT NOT NULL,
    twilio_sid TEXT,
    campaign_id UUID REFERENCES sms_campaigns (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sms_conversations_workspace_idx
    ON sms_conversations (workspace_id, created_at DESC);

ALTER TABLE sms_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_optouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sms_campaigns_tenant ON sms_campaigns;
CREATE POLICY sms_campaigns_tenant ON sms_campaigns
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS sms_messages_tenant ON sms_messages;
CREATE POLICY sms_messages_tenant ON sms_messages
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS sms_optouts_tenant ON sms_optouts;
CREATE POLICY sms_optouts_tenant ON sms_optouts
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS sms_conversations_tenant ON sms_conversations;
CREATE POLICY sms_conversations_tenant ON sms_conversations
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());


-- === social_monitoring.sql ===

-- NELVYON social monitoring â€” alerts & mentions

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS social_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    keyword TEXT NOT NULL,
    platforms JSONB NOT NULL DEFAULT '[]'::jsonb,
    notify_email TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS social_alerts_workspace_idx ON social_alerts (workspace_id, is_active);

CREATE TABLE IF NOT EXISTS social_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES social_alerts (id) ON DELETE SET NULL,
    workspace_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    author TEXT,
    platform TEXT NOT NULL DEFAULT 'web',
    url TEXT,
    sentiment TEXT NOT NULL DEFAULT 'neutral'
        CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    sentiment_score REAL NOT NULL DEFAULT 0,
    is_handled BOOLEAN NOT NULL DEFAULT false,
    found_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS social_mentions_workspace_found_idx
    ON social_mentions (workspace_id, found_at DESC);
CREATE INDEX IF NOT EXISTS social_mentions_alert_idx ON social_mentions (alert_id);

ALTER TABLE social_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_mentions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS social_alerts_tenant ON social_alerts;
CREATE POLICY social_alerts_tenant ON social_alerts
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS social_mentions_tenant ON social_mentions;
CREATE POLICY social_mentions_tenant ON social_mentions
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());


-- === social_scheduler.sql ===

-- NELVYON social media scheduler

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS social_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id INTEGER NOT NULL,
    platform TEXT NOT NULL
        CHECK (platform IN ('instagram', 'linkedin', 'facebook', 'tiktok')),
    account_id TEXT NOT NULL,
    account_name TEXT NOT NULL,
    avatar_url TEXT,
    oauth_token TEXT NOT NULL,
    oauth_token_secret TEXT,
    token_expires_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'expired', 'disconnected')),
    follower_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, platform, account_id)
);

CREATE INDEX IF NOT EXISTS social_accounts_tenant_idx
    ON social_accounts (tenant_id, platform);

CREATE TABLE IF NOT EXISTS social_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id INTEGER NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    media_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    platform_post_ids JSONB NOT NULL DEFAULT '{}'::jsonb,
    account_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    post_type TEXT NOT NULL DEFAULT 'text'
        CHECK (post_type IN ('text', 'image', 'video', 'carousel')),
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'scheduled', 'published', 'failed', 'pending_auth')),
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS social_posts_tenant_status_scheduled_idx
    ON social_posts (tenant_id, status, scheduled_at);

CREATE INDEX IF NOT EXISTS social_posts_tenant_created_idx
    ON social_posts (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS social_post_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES social_posts (id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    likes INTEGER NOT NULL DEFAULT 0,
    comments INTEGER NOT NULL DEFAULT 0,
    shares INTEGER NOT NULL DEFAULT 0,
    reach INTEGER NOT NULL DEFAULT 0,
    impressions INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS social_post_analytics_post_platform_uidx
    ON social_post_analytics (post_id, platform);

CREATE INDEX IF NOT EXISTS social_post_analytics_post_idx
    ON social_post_analytics (post_id, platform);

ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_post_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS social_accounts_tenant ON social_accounts;
CREATE POLICY social_accounts_tenant ON social_accounts
    FOR ALL USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS social_posts_tenant ON social_posts;
CREATE POLICY social_posts_tenant ON social_posts
    FOR ALL USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS social_post_analytics_tenant ON social_post_analytics;
CREATE POLICY social_post_analytics_tenant ON social_post_analytics
    FOR ALL USING (
        post_id IN (SELECT id FROM social_posts WHERE tenant_id = current_tenant_id())
    )
    WITH CHECK (
        post_id IN (SELECT id FROM social_posts WHERE tenant_id = current_tenant_id())
    );


-- === templates.sql ===

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


-- === tenant_audit.sql ===

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

-- RLS: audit_logs â€” tenant isolation, no deletes
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_tenant_select ON audit_logs;
CREATE POLICY audit_logs_tenant_select ON audit_logs
    FOR SELECT
    USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS audit_logs_tenant_insert ON audit_logs;
CREATE POLICY audit_logs_tenant_insert ON audit_logs
    FOR INSERT
    WITH CHECK (tenant_id = current_tenant_id());

-- RLS: gdpr_user_consents â€” append-only per tenant
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


-- === user_language.sql ===

-- Frente 56 â€” User language preference

ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(8) NOT NULL DEFAULT 'es';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS date_format VARCHAR(32) NOT NULL DEFAULT 'DD/MM/YYYY';


-- === voice_commands.sql ===

-- NELVYON voice commands history

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS voice_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    transcript TEXT NOT NULL,
    action JSONB NOT NULL DEFAULT '{}'::jsonb,
    response TEXT,
    status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'error')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS voice_commands_workspace_created_idx
    ON voice_commands (workspace_id, created_at DESC);

ALTER TABLE voice_commands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS voice_commands_tenant ON voice_commands;
CREATE POLICY voice_commands_tenant ON voice_commands
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());


-- === web_performance.sql ===

-- Frente 59 â€” Web performance metrics + static export metadata

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


-- === webhooks.sql ===

-- NELVYON outbound webhooks & public API keys

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    events JSONB NOT NULL DEFAULT '[]'::jsonb,
    secret TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS webhook_endpoints_workspace_idx
    ON webhook_endpoints (workspace_id, active);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_id UUID NOT NULL REFERENCES webhook_endpoints (id) ON DELETE CASCADE,
    event TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'success', 'failed', 'retrying')),
    attempts INTEGER NOT NULL DEFAULT 0,
    response_code INTEGER,
    response_body TEXT,
    last_attempt_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS webhook_deliveries_endpoint_idx
    ON webhook_deliveries (endpoint_id, created_at DESC);

CREATE INDEX IF NOT EXISTS webhook_deliveries_retry_idx
    ON webhook_deliveries (status, next_retry_at)
    WHERE status IN ('pending', 'failed', 'retrying');

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS api_keys_hash_idx ON api_keys (key_hash);
CREATE INDEX IF NOT EXISTS api_keys_workspace_idx ON api_keys (workspace_id);


-- === webhooks_public.sql ===

-- Frente 54 â€” Public analytics events + webhook delivery extensions

CREATE TABLE IF NOT EXISTS public_analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    event_name TEXT NOT NULL,
    properties JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS public_analytics_events_ws_idx
    ON public_analytics_events (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS public_analytics_events_name_idx
    ON public_analytics_events (workspace_id, event_name);


-- === webinars.sql ===

-- NELVYON Webinars â€” events, registrations, live chat

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS webinars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    slug TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    host_name TEXT NOT NULL DEFAULT '',
    thumbnail_url TEXT,
    is_free BOOLEAN NOT NULL DEFAULT true,
    price_cents INTEGER NOT NULL DEFAULT 0,
    stripe_product_id TEXT,
    stripe_price_id TEXT,
    max_attendees INTEGER,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'live', 'ended')),
    recording_url TEXT,
    join_url TEXT,
    zoom_meeting_id TEXT,
    idioma TEXT NOT NULL DEFAULT 'es',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS webinars_slug_idx ON webinars (slug);
CREATE INDEX IF NOT EXISTS webinars_workspace_idx ON webinars (workspace_id, status, scheduled_at);

CREATE TABLE IF NOT EXISTS webinar_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webinar_id UUID NOT NULL REFERENCES webinars (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    payment_intent_id TEXT,
    attended BOOLEAN NOT NULL DEFAULT false,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS webinar_registrations_unique_idx
    ON webinar_registrations (webinar_id, email);

CREATE INDEX IF NOT EXISTS webinar_registrations_webinar_idx
    ON webinar_registrations (webinar_id, registered_at DESC);

CREATE TABLE IF NOT EXISTS webinar_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webinar_id UUID NOT NULL REFERENCES webinars (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    email TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS webinar_chat_webinar_idx
    ON webinar_chat_messages (webinar_id, created_at ASC);

ALTER TABLE webinars ENABLE ROW LEVEL SECURITY;
ALTER TABLE webinar_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE webinar_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webinars_tenant ON webinars;
CREATE POLICY webinars_tenant ON webinars
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS webinars_public_read ON webinars;
CREATE POLICY webinars_public_read ON webinars
    FOR SELECT USING (status IN ('published', 'live', 'ended'));

DROP POLICY IF EXISTS webinar_registrations_tenant ON webinar_registrations;
CREATE POLICY webinar_registrations_tenant ON webinar_registrations
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS webinar_registrations_public_insert ON webinar_registrations;
CREATE POLICY webinar_registrations_public_insert ON webinar_registrations
    FOR INSERT WITH CHECK (
        webinar_id IN (SELECT id FROM webinars WHERE status IN ('published', 'live'))
    );

DROP POLICY IF EXISTS webinar_chat_tenant ON webinar_chat_messages;
CREATE POLICY webinar_chat_tenant ON webinar_chat_messages
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS webinar_chat_public ON webinar_chat_messages;
CREATE POLICY webinar_chat_public ON webinar_chat_messages
    FOR ALL USING (
        webinar_id IN (SELECT id FROM webinars WHERE status IN ('published', 'live', 'ended'))
    );


-- === whitelabel.sql ===

-- NELVYON white-label branding per workspace

CREATE TABLE IF NOT EXISTS whitelabel_configs (
    workspace_id INTEGER PRIMARY KEY,
    custom_domain TEXT,
    brand_name TEXT,
    logo_url TEXT,
    favicon_url TEXT,
    colors JSONB NOT NULL DEFAULT '{}'::jsonb,
    email_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    hide_branding BOOLEAN NOT NULL DEFAULT FALSE,
    custom_css TEXT,
    verified_domain BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS whitelabel_configs_domain_idx
    ON whitelabel_configs (custom_domain)
    WHERE custom_domain IS NOT NULL;


-- === whitelabel_config.sql ===

-- Frente 57 â€” White-label extended config + partner sub-workspaces

ALTER TABLE whitelabel_configs ADD COLUMN IF NOT EXISTS font TEXT NOT NULL DEFAULT 'Inter';
ALTER TABLE whitelabel_configs ADD COLUMN IF NOT EXISTS support_email TEXT;
ALTER TABLE whitelabel_configs ADD COLUMN IF NOT EXISTS dns_txt_token TEXT;
ALTER TABLE whitelabel_configs ADD COLUMN IF NOT EXISTS ses_domain_verified BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS parent_workspace_id INTEGER;

CREATE INDEX IF NOT EXISTS workspaces_parent_ws_idx ON workspaces (parent_workspace_id);

CREATE TABLE IF NOT EXISTS whitelabel_partner_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_workspace_id INTEGER NOT NULL,
    client_workspace_id INTEGER NOT NULL UNIQUE,
    client_name TEXT NOT NULL,
    admin_email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS whitelabel_partner_clients_partner_idx
    ON whitelabel_partner_clients (partner_workspace_id);


-- === workflows.sql ===

-- Frente 51 â€” Visual workflow automation (nodes + edges + executions)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE workflows ADD COLUMN IF NOT EXISTS edges_json JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS workflow_nodes (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER NOT NULL REFERENCES workflows (id) ON DELETE CASCADE,
    node_id TEXT NOT NULL,
    node_type TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('trigger', 'action', 'logic', 'end')),
    label TEXT NOT NULL DEFAULT '',
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
    position_y DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (workflow_id, node_id)
);

CREATE INDEX IF NOT EXISTS workflow_nodes_wf_idx ON workflow_nodes (workflow_id);

CREATE TABLE IF NOT EXISTS visual_workflow_executions (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER NOT NULL REFERENCES workflows (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    trigger_type TEXT,
    trigger_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'running'
        CHECK (status IN ('running', 'completed', 'failed', 'waiting')),
    steps_log JSONB NOT NULL DEFAULT '[]'::jsonb,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS visual_workflow_executions_wf_idx
    ON visual_workflow_executions (workflow_id, started_at DESC);

CREATE TABLE IF NOT EXISTS workflow_trigger_registry (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER NOT NULL REFERENCES workflows (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    trigger_type TEXT NOT NULL,
    trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (workflow_id, trigger_type)
);

CREATE INDEX IF NOT EXISTS workflow_trigger_registry_lookup_idx
    ON workflow_trigger_registry (workspace_id, trigger_type, is_active);


-- === workspace_models.sql ===

-- Frente 53 â€” Workspace fine-tuned models

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

-- === inline Python-only tables ===

CREATE TABLE IF NOT EXISTS cpq_quotes (
    id TEXT PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    client_id TEXT NOT NULL DEFAULT 'default',
    lead_email TEXT NOT NULL,
    lead_name TEXT,
    sector TEXT,
    company_size TEXT,
    budget_hint TEXT,
    services_json TEXT NOT NULL DEFAULT '[]',
    price_breakdown_json TEXT NOT NULL DEFAULT '{}',
    total_eur DOUBLE PRECISION NOT NULL DEFAULT 0,
    roi_summary TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS text2pay_payments (
    id TEXT PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    client_id TEXT NOT NULL DEFAULT 'default',
    lead_phone TEXT NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    currency TEXT NOT NULL DEFAULT 'eur',
    description TEXT,
    channel TEXT NOT NULL DEFAULT 'sms',
    stripe_payment_link TEXT,
    stripe_session_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    send_result_json TEXT NOT NULL DEFAULT '{}',
    sent_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facebook_messenger_conversations (
    id TEXT PRIMARY KEY,
    workspace_id INTEGER NOT NULL DEFAULT 1,
    psid TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    bot_enabled INTEGER NOT NULL DEFAULT 1,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facebook_messenger_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    workspace_id INTEGER NOT NULL,
    direction TEXT NOT NULL,
    body TEXT NOT NULL,
    meta_json TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS instagram_dm_conversations (
    id TEXT PRIMARY KEY,
    workspace_id INTEGER NOT NULL DEFAULT 1,
    instagram_user_id TEXT NOT NULL,
    username TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    bot_enabled INTEGER NOT NULL DEFAULT 1,
    stage TEXT NOT NULL DEFAULT 'greeting',
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS instagram_dm_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    workspace_id INTEGER NOT NULL,
    direction TEXT NOT NULL,
    body TEXT NOT NULL,
    meta_json TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tiktok_dm_conversations (
    id TEXT PRIMARY KEY,
    workspace_id INTEGER NOT NULL DEFAULT 1,
    tiktok_user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    bot_enabled INTEGER NOT NULL DEFAULT 1,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tiktok_dm_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    workspace_id INTEGER NOT NULL,
    direction TEXT NOT NULL,
    body TEXT NOT NULL,
    meta_json TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apollo_lead_cache (
    id TEXT PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    apollo_id TEXT,
    payload_json TEXT NOT NULL,
    ai_score INTEGER,
    synced_contact_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS linkedin_outreach (
    id TEXT PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    contact_id TEXT,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS linkedin_inbox (
    id TEXT PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    thread_id TEXT NOT NULL,
    from_name TEXT,
    body TEXT NOT NULL,
    direction TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS intent_events (
    id TEXT PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    contact_id TEXT,
    event_type TEXT NOT NULL,
    payload_json TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS intent_scores (
    contact_id TEXT PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    signals_json TEXT NOT NULL DEFAULT '[]',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_warmup_accounts (
    id TEXT PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    provider TEXT,
    daily_limit INTEGER NOT NULL DEFAULT 20,
    status TEXT NOT NULL DEFAULT 'warming',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_warmup_logs (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    workspace_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    result_json TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pr_releases (
    id TEXT PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS snapchat_ads_campaigns (
    id TEXT PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    budget_cents INTEGER NOT NULL DEFAULT 0,
    metrics_json TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tiktok_ads_campaigns (
    id TEXT PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    budget_cents INTEGER NOT NULL DEFAULT 0,
    metrics_json TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS social_auto_posts (
    id SERIAL PRIMARY KEY,
    client_id TEXT NOT NULL,
    workspace_id INTEGER,
    platform TEXT NOT NULL,
    caption TEXT NOT NULL,
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled',
    frequency TEXT,
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    metrics_json TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS social_auto_settings (
    client_id TEXT PRIMARY KEY,
    workspace_id INTEGER,
    enabled INTEGER NOT NULL DEFAULT 0,
    frequency TEXT NOT NULL DEFAULT 'weekly',
    sector TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_module_permissions (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    user_id VARCHAR NOT NULL,
    email VARCHAR,
    module VARCHAR NOT NULL,
    actions_json TEXT NOT NULL DEFAULT '[]',
    granted_by VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id, module)
);

CREATE TABLE IF NOT EXISTS tenant_branding_activation_logs (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    actor_user_id VARCHAR NOT NULL,
    actor_email VARCHAR,
    from_enabled INTEGER NOT NULL DEFAULT 0,
    to_enabled INTEGER NOT NULL DEFAULT 0,
    note VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS advisor_session_usage (
    workspace_id INTEGER NOT NULL,
    month_key VARCHAR(7) NOT NULL,
    used_sessions INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    PRIMARY KEY (workspace_id, month_key)
);
