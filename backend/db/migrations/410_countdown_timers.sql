-- Migration 410: Countdown timers
CREATE TABLE IF NOT EXISTS countdown_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('datetime','duration','evergreen')),
  target_datetime TIMESTAMPTZ,
  duration_seconds INTEGER,
  evergreen_seconds INTEGER,
  timezone TEXT NOT NULL DEFAULT 'Europe/Madrid',
  action_on_end TEXT NOT NULL DEFAULT 'hide' CHECK (action_on_end IN ('hide','show_message','redirect')),
  action_value TEXT,
  scans INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_countdown_tenant ON countdown_timers(tenant_id);
