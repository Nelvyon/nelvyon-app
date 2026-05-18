CREATE TABLE uiux_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_uiux_results_user_id ON uiux_results(user_id);
CREATE INDEX idx_uiux_results_agent_id ON uiux_results(agent_id);
CREATE INDEX idx_uiux_results_created_at ON uiux_results(created_at);
