-- NELVYON native live chat

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS chat_widget_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id INTEGER NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#6366f1',
    welcome_message TEXT NOT NULL DEFAULT '¡Hola! ¿En qué podemos ayudarte?',
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
