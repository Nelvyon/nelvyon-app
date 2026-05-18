CREATE TABLE IF NOT EXISTS os_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  job_id VARCHAR(255),
  service_id VARCHAR(100),
  type VARCHAR(50) NOT NULL,
  name VARCHAR(500) NOT NULL,
  url TEXT NOT NULL,
  size_bytes BIGINT,
  mime_type VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_client ON os_assets(client_id);
CREATE INDEX IF NOT EXISTS idx_assets_tenant ON os_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON os_assets(type);
CREATE INDEX IF NOT EXISTS idx_assets_created ON os_assets(created_at DESC);
