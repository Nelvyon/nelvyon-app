CREATE TABLE IF NOT EXISTS chatbot_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  greeting TEXT NOT NULL DEFAULT '',
  system_prompt TEXT NOT NULL DEFAULT '',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  primary_color VARCHAR(32) NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_configs_user_id ON chatbot_configs(user_id);

CREATE TABLE IF NOT EXISTS chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chatbot_id UUID NOT NULL REFERENCES chatbot_configs(id) ON DELETE CASCADE,
  session_id VARCHAR(128) NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  captured_lead JSONB,
  escalated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (chatbot_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_chatbot_id ON chatbot_conversations(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_session_id ON chatbot_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_created_at ON chatbot_conversations(created_at DESC);
