CREATE TABLE IF NOT EXISTS os_service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS os_upsell_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  suggested_service_id VARCHAR(100) NOT NULL,
  reason TEXT,
  score INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, suggested_service_id)
);

CREATE TABLE IF NOT EXISTS os_job_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  service_id VARCHAR(100) NOT NULL,
  result_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_upsell_tenant ON os_upsell_suggestions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_upsell_client ON os_upsell_suggestions(client_id);
CREATE INDEX IF NOT EXISTS idx_job_results_client ON os_job_results(client_id);
