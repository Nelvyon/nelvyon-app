-- Frente 52 — Unified omnichannel inbox

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
