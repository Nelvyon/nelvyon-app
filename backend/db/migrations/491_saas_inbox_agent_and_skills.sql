-- S57 — Inbox AI agent settings + message schema align for SaaS inbox service
ALTER TABLE conversation_messages
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES saas_tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS external_id TEXT;

UPDATE conversation_messages SET body = content WHERE body IS NULL AND content IS NOT NULL;

UPDATE conversation_messages SET direction = 'inbound' WHERE direction = 'in';
UPDATE conversation_messages SET direction = 'outbound' WHERE direction = 'out';

ALTER TABLE conversation_messages DROP CONSTRAINT IF EXISTS conversation_messages_direction_check;
ALTER TABLE conversation_messages
  ADD CONSTRAINT conversation_messages_direction_check
  CHECK (direction IN ('in', 'out', 'inbound', 'outbound'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_conv_messages_external_id
  ON conversation_messages (external_id) WHERE external_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS saas_inbox_agent_settings (
  tenant_id                  UUID PRIMARY KEY REFERENCES saas_tenants(id) ON DELETE CASCADE,
  enabled                    BOOLEAN NOT NULL DEFAULT false,
  auto_reply_enabled         BOOLEAN NOT NULL DEFAULT false,
  auto_reply_min_confidence  NUMERIC(4, 3) NOT NULL DEFAULT 0.850
    CHECK (auto_reply_min_confidence >= 0 AND auto_reply_min_confidence <= 1),
  system_prompt              TEXT,
  escalate_keywords          TEXT[] NOT NULL DEFAULT ARRAY[
    'abogado', 'demanda', 'cancelar suscripcion', 'reembolso', 'denuncia', 'urgente legal'
  ],
  active_skill_ids           TEXT[] NOT NULL DEFAULT ARRAY[
    'inbox_support', 'crm_assist', 'nelvyon_services'
  ],
  speak_responses            BOOLEAN NOT NULL DEFAULT true,
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saas_inbox_agent_suggestions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  conversation_id     UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  suggested_body      TEXT NOT NULL,
  confidence          NUMERIC(4, 3) NOT NULL DEFAULT 0,
  skill_id            TEXT,
  escalated           BOOLEAN NOT NULL DEFAULT false,
  auto_sent           BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbox_agent_suggestions_tenant
  ON saas_inbox_agent_suggestions (tenant_id, created_at DESC);
