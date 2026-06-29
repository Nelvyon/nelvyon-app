-- Core platform tables (FastAPI/Alembic SSOT) for clean Node-only migrate path.
-- Fresh Railway Postgres has no Alembic history; smokes, portal and SaaS need workspaces.

CREATE TABLE IF NOT EXISTS workspaces (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  slug VARCHAR,
  logo_url VARCHAR,
  primary_color VARCHAR,
  domain VARCHAR,
  plan VARCHAR,
  status VARCHAR,
  timezone VARCHAR,
  locale VARCHAR,
  industry VARCHAR,
  billing_email VARCHAR,
  max_users INTEGER,
  features_json TEXT,
  created_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_workspaces_id ON workspaces (id);
CREATE INDEX IF NOT EXISTS ix_workspaces_user_id ON workspaces (user_id);

CREATE TABLE IF NOT EXISTS workspace_members (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL,
  user_id VARCHAR NOT NULL,
  email VARCHAR,
  role VARCHAR NOT NULL,
  status VARCHAR NOT NULL,
  invited_by VARCHAR,
  joined_at VARCHAR,
  created_at VARCHAR
);

CREATE INDEX IF NOT EXISTS ix_workspace_members_id ON workspace_members (id);
CREATE INDEX IF NOT EXISTS ix_workspace_members_workspace_user ON workspace_members (workspace_id, user_id);
