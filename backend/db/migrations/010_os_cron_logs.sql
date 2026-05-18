-- Active service contracts scanned by OS monthly maintenance cron
CREATE TABLE IF NOT EXISTS os_service_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  service_id VARCHAR(128) NOT NULL,
  client_id TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_os_service_contracts_status ON os_service_contracts(status);
CREATE INDEX IF NOT EXISTS idx_os_service_contracts_tenant ON os_service_contracts(tenant_id);

-- Cron run audit trail
CREATE TABLE IF NOT EXISTS os_cron_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(100) NOT NULL,
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  services_processed INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_os_cron_logs_type ON os_cron_logs(type);
CREATE INDEX IF NOT EXISTS idx_os_cron_logs_run_at ON os_cron_logs(run_at);
