CREATE TABLE IF NOT EXISTS intent_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contact_id VARCHAR(255),
  signal_type VARCHAR(100),
  channel VARCHAR(50),
  score INTEGER DEFAULT 0,
  metadata JSONB,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intent_signals_user ON intent_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_intent_signals_contact ON intent_signals(user_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_intent_signals_detected ON intent_signals(user_id, detected_at DESC);

CREATE TABLE IF NOT EXISTS intent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  signal_id UUID NOT NULL,
  action_type VARCHAR(100),
  channel VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  executed_at TIMESTAMPTZ,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_intent_actions_user ON intent_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_intent_actions_signal ON intent_actions(signal_id);
