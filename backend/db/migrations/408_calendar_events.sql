-- Migration 408: Calendar events (unified view)
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('appointment','campaign','task','deadline','reminder')),
  event_date DATE NOT NULL,
  event_time TIME,
  duration_minutes INTEGER,
  color TEXT,
  contact_id UUID REFERENCES saas_contacts(id) ON DELETE SET NULL,
  deal_id UUID,
  campaign_id UUID,
  assigned_to UUID,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant ON calendar_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(tenant_id, event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_assigned ON calendar_events(assigned_to);
