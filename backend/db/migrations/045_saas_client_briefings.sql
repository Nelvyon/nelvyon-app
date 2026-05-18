CREATE TABLE IF NOT EXISTS client_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES nelvyon_users(user_id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_briefings_user ON client_briefings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_briefings_created ON client_briefings(created_at DESC);
