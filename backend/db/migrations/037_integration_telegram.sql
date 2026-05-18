CREATE TABLE IF NOT EXISTS integration_telegram (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  bot_token TEXT,
  chat_id VARCHAR(100),
  bot_username VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_telegram_user ON integration_telegram(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_telegram_active ON integration_telegram(user_id, is_active) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS telegram_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  chat_id VARCHAR(100),
  content TEXT,
  message_id INTEGER,
  status VARCHAR(50) DEFAULT 'sent',
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_messages_user ON telegram_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_sent ON telegram_messages(user_id, sent_at DESC);
