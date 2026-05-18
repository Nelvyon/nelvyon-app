CREATE TABLE IF NOT EXISTS integration_linkedin_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  ad_account_id VARCHAR(50),
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_linkedin_ads_user ON integration_linkedin_ads(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_linkedin_ads_active ON integration_linkedin_ads(user_id, is_active) WHERE is_active = true;
