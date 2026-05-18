CREATE TABLE IF NOT EXISTS saas_gdpr_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('export', 'delete', 'rectify')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  data_url TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gdpr_user ON saas_gdpr_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_type ON saas_gdpr_requests(type);
CREATE INDEX IF NOT EXISTS idx_gdpr_status ON saas_gdpr_requests(status);
