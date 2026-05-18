-- MIG 271: uptime status checks + public incidents
CREATE TABLE IF NOT EXISTS status_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text NOT NULL,
  status text NOT NULL,
  latency_ms integer,
  checked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status_checks_service ON status_checks(service);
CREATE INDEX IF NOT EXISTS idx_status_checks_checked_at ON status_checks(checked_at);

CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'minor',
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
