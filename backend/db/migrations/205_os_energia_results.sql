CREATE TABLE energia_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_energia_results_user_id ON energia_results(user_id);
CREATE INDEX idx_energia_results_agent_id ON energia_results(agent_id);
CREATE INDEX idx_energia_results_created_at ON energia_results(created_at DESC);
