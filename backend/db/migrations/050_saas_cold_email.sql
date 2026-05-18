CREATE TABLE IF NOT EXISTS cold_email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  target_company VARCHAR(512) NOT NULL,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  sequence JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cold_email_campaigns_user_id ON cold_email_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_cold_email_campaigns_status ON cold_email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_cold_email_campaigns_created_at ON cold_email_campaigns(created_at DESC);

CREATE TABLE IF NOT EXISTS cold_email_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES cold_email_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name VARCHAR(512) NOT NULL,
  email VARCHAR(512) NOT NULL,
  company VARCHAR(512),
  role VARCHAR(512),
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  current_step INTEGER NOT NULL DEFAULT 0,
  send_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cold_email_prospects_user_id ON cold_email_prospects(user_id);
CREATE INDEX IF NOT EXISTS idx_cold_email_prospects_campaign_id ON cold_email_prospects(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cold_email_prospects_status ON cold_email_prospects(status);
CREATE INDEX IF NOT EXISTS idx_cold_email_prospects_send_at ON cold_email_prospects(send_at);
