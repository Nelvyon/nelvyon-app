CREATE TABLE IF NOT EXISTS os_health_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'healthy',
  jobs_last_week INTEGER DEFAULT 0,
  error_rate NUMERIC(5,4) DEFAULT 0,
  avg_duration_ms NUMERIC(10,2) DEFAULT 0,
  pending_upsells INTEGER DEFAULT 0,
  issues JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_client ON os_health_reports(client_id);
CREATE INDEX IF NOT EXISTS idx_health_tenant ON os_health_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_health_status ON os_health_reports(status);

ALTER TABLE os_jobs ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
ALTER TABLE os_jobs ADD COLUMN IF NOT EXISTS tenant_id UUID;
