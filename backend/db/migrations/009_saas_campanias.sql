-- SaaS campanias multicanal
CREATE TABLE IF NOT EXISTS saas_campanias (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT,
  status           TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','scheduled','running','paused','completed','cancelled')),
  channel          TEXT NOT NULL
                   CHECK (channel IN ('email','sms','notification','multi')),
  subject          TEXT,
  body             TEXT NOT NULL,
  cta_text         TEXT,
  cta_url          TEXT,
  audience_filter  JSONB NOT NULL DEFAULT '{}'::jsonb,
  scheduled_at     TIMESTAMPTZ,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count       INTEGER NOT NULL DEFAULT 0,
  opened_count     INTEGER NOT NULL DEFAULT 0,
  clicked_count    INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_campanias_tenant ON saas_campanias(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saas_campanias_status ON saas_campanias(tenant_id, status);

CREATE TABLE IF NOT EXISTS saas_campania_recipients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campania_id UUID NOT NULL REFERENCES saas_campanias(id) ON DELETE CASCADE,
  contact_id  UUID NOT NULL REFERENCES saas_contacts(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','sent','opened','clicked','bounced','unsubscribed')),
  sent_at     TIMESTAMPTZ,
  opened_at   TIMESTAMPTZ,
  clicked_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_saas_campania_recipients_campania
  ON saas_campania_recipients(campania_id, tenant_id);
