CREATE TABLE IF NOT EXISTS iapredictiva_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iapredictiva_results_user_id ON iapredictiva_results(user_id);
CREATE INDEX IF NOT EXISTS idx_iapredictiva_results_agent_id ON iapredictiva_results(agent_id);
CREATE INDEX IF NOT EXISTS idx_iapredictiva_results_created_at ON iapredictiva_results(created_at);
