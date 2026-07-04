-- Legacy CRM + email queue (Alembic SSOT) for pack welcome email flow.
-- Required by localPackWelcomeEmail.ts (upsertContact + email_queue INSERT).

CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  workspace_id INTEGER,
  first_name VARCHAR NOT NULL,
  last_name VARCHAR,
  email VARCHAR NOT NULL,
  phone VARCHAR,
  company_name VARCHAR,
  tags VARCHAR,
  status VARCHAR,
  source VARCHAR,
  score INTEGER,
  avatar_url VARCHAR,
  notes VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_contacts_id ON contacts (id);
CREATE INDEX IF NOT EXISTS ix_contacts_workspace_id ON contacts (workspace_id);
CREATE INDEX IF NOT EXISTS ix_contacts_workspace_email ON contacts (workspace_id, email);

CREATE TABLE IF NOT EXISTS email_queue (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  workspace_id INTEGER,
  to_email VARCHAR NOT NULL,
  to_name VARCHAR,
  subject VARCHAR NOT NULL,
  body_html VARCHAR,
  body_text VARCHAR,
  email_type VARCHAR,
  status VARCHAR NOT NULL DEFAULT 'pending',
  error_message VARCHAR,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Legacy FastAPI email_queue may exist without newer columns — align before indexes.
ALTER TABLE email_queue ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
ALTER TABLE email_queue ADD COLUMN IF NOT EXISTS to_name VARCHAR;
ALTER TABLE email_queue ADD COLUMN IF NOT EXISTS body_html VARCHAR;
ALTER TABLE email_queue ADD COLUMN IF NOT EXISTS body_text VARCHAR;
ALTER TABLE email_queue ADD COLUMN IF NOT EXISTS email_type VARCHAR;
ALTER TABLE email_queue ADD COLUMN IF NOT EXISTS error_message VARCHAR;
ALTER TABLE email_queue ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE email_queue ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE email_queue ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS ix_email_queue_id ON email_queue (id);
CREATE INDEX IF NOT EXISTS ix_email_queue_workspace_id ON email_queue (workspace_id);
CREATE INDEX IF NOT EXISTS ix_email_queue_scheduled_at ON email_queue (status, scheduled_at);
