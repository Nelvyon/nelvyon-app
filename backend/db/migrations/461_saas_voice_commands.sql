-- S55 — Voice Command log (web speech navigation + actions, SaaS tenant-scoped)
CREATE TABLE IF NOT EXISTS saas_voice_commands (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL,
  user_id         TEXT,
  transcript      TEXT NOT NULL,
  matched_intent  TEXT,
  action_type     TEXT NOT NULL DEFAULT 'navigate'
                  CHECK (action_type IN ('navigate','action','query','unknown')),
  action_payload  JSONB NOT NULL DEFAULT '{}',
  success         BOOLEAN NOT NULL DEFAULT true,
  error_message   TEXT,
  source          TEXT NOT NULL DEFAULT 'web_speech'
                  CHECK (source IN ('web_speech','media_upload')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS saas_voice_commands_tenant_created
  ON saas_voice_commands (tenant_id, created_at DESC);
