-- Migration 413: Lead scoring rules & grades
CREATE TABLE IF NOT EXISTS lead_scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  condition TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  fires_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE saas_contacts
  ADD COLUMN IF NOT EXISTS lead_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lead_grade TEXT CHECK (lead_grade IN ('A','B','C','D'));

CREATE INDEX IF NOT EXISTS idx_lead_scoring_rules_tenant ON lead_scoring_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_lead_score ON saas_contacts(tenant_id, lead_score DESC);
