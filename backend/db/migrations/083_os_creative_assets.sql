CREATE TABLE creative_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text,
  asset_type text NOT NULL,
  provider text NOT NULL,
  prompt text NOT NULL,
  url text,
  status text NOT NULL DEFAULT 'pending',
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_creative_assets_user ON creative_assets(user_id);
CREATE INDEX idx_creative_assets_type ON creative_assets(asset_type);
CREATE INDEX idx_creative_assets_status ON creative_assets(status);
