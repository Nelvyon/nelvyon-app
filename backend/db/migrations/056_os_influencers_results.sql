CREATE TABLE IF NOT EXISTS influencers_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_id VARCHAR(64) NOT NULL,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_influencers_results_user_id ON influencers_results(user_id);
CREATE INDEX IF NOT EXISTS idx_influencers_results_agent_id ON influencers_results(agent_id);
CREATE INDEX IF NOT EXISTS idx_influencers_results_created_at ON influencers_results(created_at DESC);
