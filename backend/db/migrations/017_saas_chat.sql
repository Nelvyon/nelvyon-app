CREATE TABLE IF NOT EXISTS saas_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_user ON saas_chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_tenant ON saas_chat_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_created ON saas_chat_messages(created_at ASC);
