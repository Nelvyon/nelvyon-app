CREATE TABLE IF NOT EXISTS roi_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  channel VARCHAR(50),
  source VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roi_events_user ON roi_events(user_id);
CREATE INDEX IF NOT EXISTS idx_roi_events_session ON roi_events(session_id);
CREATE INDEX IF NOT EXISTS idx_roi_events_user_created ON roi_events(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS roi_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id UUID NOT NULL,
  revenue NUMERIC(12,2),
  conversion_type VARCHAR(100),
  attributed_channel VARCHAR(50),
  attributed_source VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roi_conversions_user ON roi_conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_roi_conversions_session ON roi_conversions(session_id);
CREATE INDEX IF NOT EXISTS idx_roi_conversions_user_created ON roi_conversions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS roi_loops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  total_spend NUMERIC(12,2) DEFAULT 0,
  total_revenue NUMERIC(12,2) DEFAULT 0,
  roi_percentage NUMERIC(8,2) DEFAULT 0,
  loop_start TIMESTAMPTZ DEFAULT NOW(),
  loop_end TIMESTAMPTZ,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_roi_loops_user ON roi_loops(user_id);
CREATE INDEX IF NOT EXISTS idx_roi_loops_status ON roi_loops(user_id, status);
