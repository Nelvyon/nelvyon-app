CREATE TABLE IF NOT EXISTS saas_client_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  full_name VARCHAR(500),
  company VARCHAR(500),
  website VARCHAR(500),
  phone VARCHAR(100),
  sector VARCHAR(200),
  timezone VARCHAR(100) DEFAULT 'Europe/Madrid',
  language VARCHAR(10) DEFAULT 'es',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

CREATE TABLE IF NOT EXISTS saas_profile_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  field VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_user ON saas_client_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_changelog_user ON saas_profile_changelog(user_id);
CREATE INDEX IF NOT EXISTS idx_changelog_date ON saas_profile_changelog(changed_at DESC);
