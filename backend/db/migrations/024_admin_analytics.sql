CREATE TABLE IF NOT EXISTS admin_metrics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key VARCHAR(255) UNIQUE NOT NULL,
  metric_value JSONB NOT NULL,
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_metrics_cache_key ON admin_metrics_cache(metric_key);
