CREATE TABLE IF NOT EXISTS dragdrop_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dragdrop_workflows_user ON dragdrop_workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_dragdrop_workflows_active ON dragdrop_workflows(user_id, is_active);
