CREATE TABLE videomarketing_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_videomarketing_results_user_id ON videomarketing_results(user_id);
CREATE INDEX idx_videomarketing_results_agent_id ON videomarketing_results(agent_id);
CREATE INDEX idx_videomarketing_results_created_at ON videomarketing_results(created_at);
