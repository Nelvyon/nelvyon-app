CREATE TABLE IF NOT EXISTS usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  agent_id text NOT NULL,
  sector text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_events_user_id ON usage_events(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_created_at ON usage_events(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_events_user_month
  ON usage_events(user_id, date_trunc('month', created_at));

CREATE TABLE IF NOT EXISTS usage_limits (
  plan text PRIMARY KEY,
  monthly_calls integer NOT NULL
);

INSERT INTO usage_limits (plan, monthly_calls) VALUES
  ('free',    10),
  ('starter', 500),
  ('pro',     2000),
  ('agency',  10000)
ON CONFLICT (plan) DO NOTHING;
