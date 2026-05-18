CREATE TABLE IF NOT EXISTS integration_shopify (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  shop_domain VARCHAR(255),
  access_token TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_shopify_user ON integration_shopify(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_shopify_active ON integration_shopify(user_id, is_active) WHERE is_active = true;
