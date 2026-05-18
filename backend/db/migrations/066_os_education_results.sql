CREATE TABLE education_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_education_results_user ON education_results(user_id);
CREATE INDEX idx_education_results_agent ON education_results(agent_id);
CREATE INDEX idx_education_results_created ON education_results(created_at DESC);
