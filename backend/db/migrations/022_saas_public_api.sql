CREATE TABLE IF NOT EXISTS saas_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES nelvyon_users(user_id) ON DELETE CASCADE,
  key_hash VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  rate_limit_per_hour INTEGER DEFAULT 100,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saas_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES saas_api_keys(id) ON DELETE CASCADE,
  endpoint VARCHAR(255),
  method VARCHAR(10),
  status_code INTEGER,
  response_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
