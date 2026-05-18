CREATE TABLE fiscalbilling_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  sector text NOT NULL,
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_fiscalbilling_results_user_id ON fiscalbilling_results(user_id);
CREATE INDEX idx_fiscalbilling_results_agent_id ON fiscalbilling_results(agent_id);
CREATE INDEX idx_fiscalbilling_results_created_at ON fiscalbilling_results(created_at DESC);
