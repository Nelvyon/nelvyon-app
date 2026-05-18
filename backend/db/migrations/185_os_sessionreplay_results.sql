CREATE TABLE sessionreplay_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  sector text NOT NULL,
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_sessionreplay_results_user_id ON sessionreplay_results(user_id);
CREATE INDEX idx_sessionreplay_results_agent_id ON sessionreplay_results(agent_id);
CREATE INDEX idx_sessionreplay_results_created_at ON sessionreplay_results(created_at DESC);
