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

CREATE INDEX IF NOT EXISTS ix_email_queue_id ON email_queue (id);
CREATE INDEX IF NOT EXISTS ix_email_queue_workspace_id ON email_queue (workspace_id);
CREATE INDEX IF NOT EXISTS ix_email_queue_scheduled_at ON email_queue (status, scheduled_at);
