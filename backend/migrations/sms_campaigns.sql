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
