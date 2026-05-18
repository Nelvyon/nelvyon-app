CREATE TABLE voicev10_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_voicev10_results_user_id ON voicev10_results(user_id);
CREATE INDEX idx_voicev10_results_agent_id ON voicev10_results(agent_id);
CREATE INDEX idx_voicev10_results_created_at ON voicev10_results(created_at);
