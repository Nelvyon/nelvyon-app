CREATE TABLE marketplace_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  sector text NOT NULL,
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_marketplace_results_user_id ON marketplace_results(user_id);
CREATE INDEX idx_marketplace_results_agent_id ON marketplace_results(agent_id);
CREATE INDEX idx_marketplace_results_created_at ON marketplace_results(created_at DESC);

CREATE TABLE marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL,
  developer_id uuid NOT NULL,
  nombre text NOT NULL,
  categoria text NOT NULL,
  precio numeric NOT NULL,
  installs int NOT NULL DEFAULT 0,
  rating numeric,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_marketplace_listings_agent_id ON marketplace_listings(agent_id);
CREATE INDEX idx_marketplace_listings_developer_id ON marketplace_listings(developer_id);
CREATE INDEX idx_marketplace_listings_categoria ON marketplace_listings(categoria);
