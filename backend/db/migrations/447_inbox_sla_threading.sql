-- Migration 447: Inbox SLA + threading + round-robin routing
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS thread_id         UUID,
  ADD COLUMN IF NOT EXISTS subject           TEXT,
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_due_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_breached      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS priority          TEXT NOT NULL DEFAULT 'normal'
                           CHECK (priority IN ('low','normal','high','urgent'));

ALTER TABLE conversation_messages
  ADD COLUMN IF NOT EXISTS parent_message_id UUID REFERENCES conversation_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS channel           TEXT,
  ADD COLUMN IF NOT EXISTS metadata          JSONB NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS saas_inbox_sla_policies (
  tenant_id                TEXT PRIMARY KEY,
  first_response_minutes   INT  NOT NULL DEFAULT 60,
  resolution_minutes       INT  NOT NULL DEFAULT 480,
  business_hours_only      BOOLEAN NOT NULL DEFAULT false,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saas_inbox_routing (
  tenant_id                TEXT PRIMARY KEY,
  round_robin_enabled      BOOLEAN NOT NULL DEFAULT true,
  last_assigned_member_id  TEXT,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast thread lookups
CREATE INDEX IF NOT EXISTS idx_conversations_thread_id
  ON conversations (thread_id) WHERE thread_id IS NOT NULL;

-- SLA breach monitoring
CREATE INDEX IF NOT EXISTS idx_conversations_sla_due
  ON conversations (sla_due_at) WHERE status = 'open';

-- Group by contact+thread
CREATE INDEX IF NOT EXISTS idx_conversations_contact_thread
  ON conversations (contact_id, thread_id) WHERE contact_id IS NOT NULL;
