CREATE TABLE IF NOT EXISTS saas_service_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  job_id VARCHAR(255),
  service_id VARCHAR(100) NOT NULL,
  service_name VARCHAR(500) NOT NULL,
  summary TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  asset_urls JSONB DEFAULT '[]',
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_results_user ON saas_service_results(user_id);
CREATE INDEX IF NOT EXISTS idx_results_tenant ON saas_service_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_results_service ON saas_service_results(service_id);
CREATE INDEX IF NOT EXISTS idx_results_status ON saas_service_results(status);
CREATE INDEX IF NOT EXISTS idx_results_created ON saas_service_results(created_at DESC);
