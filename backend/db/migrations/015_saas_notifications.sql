CREATE TABLE IF NOT EXISTS saas_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(500) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON saas_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_tenant ON saas_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notif_read ON saas_notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notif_created ON saas_notifications(created_at DESC);
