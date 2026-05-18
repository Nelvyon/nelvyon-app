CREATE TABLE seo_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  sector text NOT NULL,
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_seo_results_user_id ON seo_results(user_id);
CREATE INDEX idx_seo_results_agent_id ON seo_results(agent_id);
CREATE INDEX idx_seo_results_created_at ON seo_results(created_at DESC);
