CREATE TABLE crypto_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_crypto_results_user_id ON crypto_results(user_id);
CREATE INDEX idx_crypto_results_agent_id ON crypto_results(agent_id);
CREATE INDEX idx_crypto_results_created_at ON crypto_results(created_at DESC);
