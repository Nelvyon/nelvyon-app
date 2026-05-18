CREATE TABLE IF NOT EXISTS integration_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  phone_number_id VARCHAR(50),
  waba_id VARCHAR(50),
  access_token TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  recipient VARCHAR(50) NOT NULL,
  message_type VARCHAR(50),
  content TEXT,
  status VARCHAR(50) DEFAULT 'sent',
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_whatsapp_user ON integration_whatsapp(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_whatsapp_active ON integration_whatsapp(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_sent ON whatsapp_messages(user_id, sent_at DESC);
