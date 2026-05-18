CREATE TABLE IF NOT EXISTS sentiment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES nelvyon_users(user_id) ON DELETE CASCADE,
  channel VARCHAR(100) NOT NULL,
  text TEXT NOT NULL,
  score NUMERIC(6,4) NOT NULL DEFAULT 0,
  label VARCHAR(20) NOT NULL DEFAULT 'neutral',
  confidence NUMERIC(6,4) NOT NULL DEFAULT 0.5,
  topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sentiment_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES nelvyon_users(user_id) ON DELETE CASCADE,
  avg_score NUMERIC(6,4) NOT NULL,
  window_hours INTEGER NOT NULL DEFAULT 24,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sentiment_mentions_user_created ON sentiment_mentions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sentiment_mentions_user_channel ON sentiment_mentions(user_id, channel);
CREATE INDEX IF NOT EXISTS idx_sentiment_alerts_user_status ON sentiment_alerts(user_id, status, created_at DESC);
