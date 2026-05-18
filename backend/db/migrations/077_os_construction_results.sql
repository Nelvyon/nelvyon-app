CREATE TABLE construction_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_construction_results_user ON construction_results(user_id);
CREATE INDEX idx_construction_results_agent ON construction_results(agent_id);
CREATE INDEX idx_construction_results_created ON construction_results(created_at DESC);
