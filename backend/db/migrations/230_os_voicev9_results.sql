CREATE TABLE voicev9_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_voicev9_results_user_id ON voicev9_results(user_id);
CREATE INDEX idx_voicev9_results_agent_id ON voicev9_results(agent_id);
CREATE INDEX idx_voicev9_results_created_at ON voicev9_results(created_at);
