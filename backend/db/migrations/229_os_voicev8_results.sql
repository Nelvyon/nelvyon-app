CREATE TABLE voicev8_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_voicev8_results_user_id ON voicev8_results(user_id);
CREATE INDEX idx_voicev8_results_agent_id ON voicev8_results(agent_id);
CREATE INDEX idx_voicev8_results_created_at ON voicev8_results(created_at);
