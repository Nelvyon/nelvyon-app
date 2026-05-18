CREATE TABLE IF NOT EXISTS integration_search_console (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  site_url VARCHAR(500),
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_search_console_user ON integration_search_console(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_search_console_active ON integration_search_console(user_id, is_active) WHERE is_active = true;
