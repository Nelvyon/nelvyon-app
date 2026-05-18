CREATE TABLE IF NOT EXISTS integration_twilio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  account_sid VARCHAR(100),
  auth_token TEXT,
  from_number VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_twilio_user ON integration_twilio(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_twilio_active ON integration_twilio(user_id, is_active) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS twilio_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  to_number VARCHAR(20),
  message_type VARCHAR(10) DEFAULT 'sms',
  content TEXT,
  twilio_sid VARCHAR(100),
  status VARCHAR(50),
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_twilio_messages_user ON twilio_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_twilio_messages_sent ON twilio_messages(user_id, sent_at DESC);
