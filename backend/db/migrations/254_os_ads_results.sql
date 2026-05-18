CREATE TABLE IF NOT EXISTS ads_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ads_results_user_id ON ads_results(user_id);
CREATE INDEX IF NOT EXISTS idx_ads_results_agent_id ON ads_results(agent_id);
