CREATE TABLE publicapi_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  sector text NOT NULL,
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_publicapi_results_user_id ON publicapi_results(user_id);
CREATE INDEX idx_publicapi_results_agent_id ON publicapi_results(agent_id);
CREATE INDEX idx_publicapi_results_created_at ON publicapi_results(created_at DESC);

CREATE TABLE api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  key_hash text NOT NULL,
  plan text NOT NULL,
  req_count bigint NOT NULL DEFAULT 0,
  last_used timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE UNIQUE INDEX idx_api_keys_key_hash ON api_keys(key_hash);

CREATE TABLE webhook_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event text NOT NULL,
  url text NOT NULL,
  secret text NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_webhook_subscriptions_user_id ON webhook_subscriptions(user_id);
CREATE INDEX idx_webhook_subscriptions_event ON webhook_subscriptions(event);
CREATE INDEX idx_webhook_subscriptions_activo ON webhook_subscriptions(activo);
