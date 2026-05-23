-- NELVYON Webinars — events, registrations, live chat

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
