-- SaaS CRM core tables (contacts + activities)
CREATE TABLE IF NOT EXISTS saas_contacts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  email            TEXT,
  phone            TEXT,
  company          TEXT,
  position         TEXT,
  status           TEXT NOT NULL DEFAULT 'lead'
                    CHECK (status IN ('lead','prospect','client','churned')),
  pipeline_stage   TEXT NOT NULL DEFAULT 'new'
                    CHECK (pipeline_stage IN ('new','contacted','qualified','proposal','won','lost')),
  value            NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes            TEXT,
  tags             TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_contacts_tenant ON saas_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saas_contacts_status ON saas_contacts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_saas_contacts_stage ON saas_contacts(tenant_id, pipeline_stage);

CREATE TABLE IF NOT EXISTS saas_contact_activities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id    UUID NOT NULL REFERENCES saas_contacts(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL,
  activity_type TEXT NOT NULL
                CHECK (activity_type IN ('note','call','email','meeting','task')),
  description   TEXT NOT NULL,
  scheduled_at  TIMESTAMPTZ,
  completed     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_contact_activities_contact ON saas_contact_activities(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saas_contact_activities_tenant ON saas_contact_activities(tenant_id, created_at DESC);
