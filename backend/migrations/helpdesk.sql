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
