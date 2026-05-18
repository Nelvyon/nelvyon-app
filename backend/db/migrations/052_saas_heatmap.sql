CREATE TABLE IF NOT EXISTS heatmap_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  domain VARCHAR(512) NOT NULL,
  site_id VARCHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_heatmap_sites_user_id ON heatmap_sites(user_id);
CREATE INDEX IF NOT EXISTS idx_heatmap_sites_site_id ON heatmap_sites(site_id);

CREATE TABLE IF NOT EXISTS heatmap_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id VARCHAR(64) NOT NULL REFERENCES heatmap_sites(site_id) ON DELETE CASCADE,
  session_id VARCHAR(128) NOT NULL,
  user_agent TEXT,
  device VARCHAR(32) NOT NULL DEFAULT 'desktop',
  page TEXT,
  referrer TEXT,
  duration INTEGER DEFAULT 0,
  scroll_depth INTEGER DEFAULT 0,
  pages_viewed INTEGER NOT NULL DEFAULT 1,
  has_rage_click BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (site_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_heatmap_sessions_site_id ON heatmap_sessions(site_id);
CREATE INDEX IF NOT EXISTS idx_heatmap_sessions_session_id ON heatmap_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_heatmap_sessions_created_at ON heatmap_sessions(created_at DESC);

CREATE TABLE IF NOT EXISTS heatmap_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id VARCHAR(64) NOT NULL REFERENCES heatmap_sites(site_id) ON DELETE CASCADE,
  session_id VARCHAR(128) NOT NULL,
  type VARCHAR(32) NOT NULL,
  x INTEGER,
  y INTEGER,
  page TEXT NOT NULL,
  element TEXT,
  timestamp_ms BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_heatmap_events_site_id ON heatmap_events(site_id);
CREATE INDEX IF NOT EXISTS idx_heatmap_events_session_id ON heatmap_events(session_id);
CREATE INDEX IF NOT EXISTS idx_heatmap_events_page ON heatmap_events(page);
CREATE INDEX IF NOT EXISTS idx_heatmap_events_type ON heatmap_events(type);
CREATE INDEX IF NOT EXISTS idx_heatmap_events_created_at ON heatmap_events(created_at DESC);

CREATE TABLE IF NOT EXISTS heatmap_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id VARCHAR(64) NOT NULL REFERENCES heatmap_sites(site_id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type VARCHAR(64) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(32) NOT NULL DEFAULT 'warning',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_heatmap_alerts_site_id ON heatmap_alerts(site_id);
CREATE INDEX IF NOT EXISTS idx_heatmap_alerts_user_id ON heatmap_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_heatmap_alerts_created_at ON heatmap_alerts(created_at DESC);
