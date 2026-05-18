CREATE TABLE IF NOT EXISTS neuromarketing_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_neuromarketing_results_user_id ON neuromarketing_results(user_id);
CREATE INDEX IF NOT EXISTS idx_neuromarketing_results_agent_id ON neuromarketing_results(agent_id);
