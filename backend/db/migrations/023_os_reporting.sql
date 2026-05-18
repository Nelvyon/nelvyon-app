CREATE TABLE IF NOT EXISTS os_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES nelvyon_users(user_id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  report_type VARCHAR(50) DEFAULT 'monthly',
  status VARCHAR(50) DEFAULT 'pending',
  content JSONB,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_os_reports_user_id ON os_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_os_reports_period_start ON os_reports(period_start DESC);
CREATE INDEX IF NOT EXISTS idx_os_reports_status ON os_reports(status);
