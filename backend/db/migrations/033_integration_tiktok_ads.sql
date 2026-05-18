CREATE TABLE IF NOT EXISTS integration_tiktok_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  advertiser_id VARCHAR(50),
  access_token TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_tiktok_ads_user ON integration_tiktok_ads(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_tiktok_ads_active ON integration_tiktok_ads(user_id, is_active) WHERE is_active = true;
