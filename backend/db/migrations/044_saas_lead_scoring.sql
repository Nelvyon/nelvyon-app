CREATE TABLE IF NOT EXISTS scored_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES nelvyon_users(user_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(320) NOT NULL,
  company VARCHAR(255),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  score INTEGER NOT NULL DEFAULT 0,
  category VARCHAR(20) NOT NULL DEFAULT 'cold',
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_action TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scored_leads_user ON scored_leads(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scored_leads_category ON scored_leads(user_id, category);
CREATE INDEX IF NOT EXISTS idx_scored_leads_score ON scored_leads(user_id, score DESC);
