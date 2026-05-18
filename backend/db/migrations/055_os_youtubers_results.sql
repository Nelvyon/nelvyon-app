CREATE TABLE IF NOT EXISTS youtubers_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_id VARCHAR(64) NOT NULL,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_youtubers_results_user_id ON youtubers_results(user_id);
CREATE INDEX IF NOT EXISTS idx_youtubers_results_agent_id ON youtubers_results(agent_id);
CREATE INDEX IF NOT EXISTS idx_youtubers_results_created_at ON youtubers_results(created_at DESC);
