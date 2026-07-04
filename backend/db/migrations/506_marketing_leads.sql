-- Marketing site contact form leads (public /api/contact)
CREATE TABLE IF NOT EXISTS marketing_leads (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  company    TEXT,
  phone      TEXT,
  message    TEXT NOT NULL,
  plan       TEXT,
  source     TEXT DEFAULT 'contact-form',
  status     TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_leads_created ON marketing_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_email ON marketing_leads (email);
