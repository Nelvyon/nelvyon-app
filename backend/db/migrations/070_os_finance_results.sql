CREATE TABLE finance_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_finance_results_user ON finance_results(user_id);
CREATE INDEX idx_finance_results_agent ON finance_results(agent_id);
CREATE INDEX idx_finance_results_created ON finance_results(created_at DESC);
