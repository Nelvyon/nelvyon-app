CREATE TABLE IF NOT EXISTS geo_ai_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  brand_name VARCHAR(255),
  query_used TEXT,
  platform VARCHAR(50),
  response_text TEXT,
  brand_mentioned BOOLEAN DEFAULT false,
  mention_position INTEGER,
  sentiment VARCHAR(50),
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geo_ai_checks_user ON geo_ai_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_geo_ai_checks_brand ON geo_ai_checks(user_id, brand_name);
CREATE INDEX IF NOT EXISTS idx_geo_ai_checks_platform ON geo_ai_checks(user_id, platform);

CREATE TABLE IF NOT EXISTS geo_ai_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  brand_name VARCHAR(255),
  platform VARCHAR(50),
  visibility_score NUMERIC(5,2),
  total_checks INTEGER DEFAULT 0,
  mentions INTEGER DEFAULT 0,
  avg_position NUMERIC(5,2),
  last_computed TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geo_ai_scores_user ON geo_ai_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_geo_ai_scores_brand ON geo_ai_scores(user_id, brand_name);
CREATE INDEX IF NOT EXISTS idx_geo_ai_scores_platform ON geo_ai_scores(user_id, platform);
