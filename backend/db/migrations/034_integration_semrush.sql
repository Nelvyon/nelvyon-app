CREATE TABLE IF NOT EXISTS integration_semrush (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  api_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_semrush_user ON integration_semrush(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_semrush_active ON integration_semrush(user_id, is_active) WHERE is_active = true;
