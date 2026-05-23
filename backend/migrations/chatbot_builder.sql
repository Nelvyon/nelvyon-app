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
