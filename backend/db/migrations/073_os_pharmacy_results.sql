CREATE TABLE pharmacy_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_pharmacy_results_user ON pharmacy_results(user_id);
CREATE INDEX idx_pharmacy_results_agent ON pharmacy_results(agent_id);
CREATE INDEX idx_pharmacy_results_created ON pharmacy_results(created_at DESC);
