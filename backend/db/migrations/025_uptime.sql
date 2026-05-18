CREATE TABLE IF NOT EXISTS uptime_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'operational',
  response_ms INTEGER,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS uptime_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  status VARCHAR(50) DEFAULT 'investigating',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  description TEXT
);

CREATE INDEX IF NOT EXISTS idx_uptime_checks_service_checked_at ON uptime_checks(service_name, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_uptime_incidents_active ON uptime_incidents(service_name, started_at DESC) WHERE resolved_at IS NULL;
