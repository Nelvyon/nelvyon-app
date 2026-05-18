CREATE TABLE IF NOT EXISTS agent_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES nelvyon_users(user_id) ON DELETE CASCADE,
  job_id UUID NOT NULL,
  result_id UUID REFERENCES saas_service_results(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback_text TEXT,
  sector VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_quality_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type VARCHAR(255) NOT NULL,
  sector VARCHAR(100) NOT NULL DEFAULT '',
  avg_rating NUMERIC(3,2),
  total_feedback INTEGER DEFAULT 0,
  last_computed TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_quality_scores_service_sector
  ON agent_quality_scores(service_type, sector);

CREATE INDEX IF NOT EXISTS idx_agent_feedback_service_sector_created
  ON agent_feedback(sector, created_at DESC);
