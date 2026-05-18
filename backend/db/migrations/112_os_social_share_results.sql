CREATE TABLE social_share_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  sector text NOT NULL,
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_social_share_results_user_id ON social_share_results(user_id);
CREATE INDEX idx_social_share_results_agent_id ON social_share_results(agent_id);
CREATE INDEX idx_social_share_results_created_at ON social_share_results(created_at DESC);

CREATE TABLE social_share_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  red text NOT NULL,
  url_compartida text NOT NULL,
  clicks int NOT NULL DEFAULT 0,
  conversiones int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_social_share_events_user_id ON social_share_events(user_id);
CREATE INDEX idx_social_share_events_red ON social_share_events(red);
CREATE INDEX idx_social_share_events_created_at ON social_share_events(created_at DESC);
