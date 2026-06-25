-- Migration 451: Membership hub — plans, members, access gating
CREATE TABLE IF NOT EXISTS saas_membership_plans (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                TEXT NOT NULL,
  name                     TEXT NOT NULL,
  slug                     TEXT NOT NULL,
  price_amount             NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_currency           TEXT NOT NULL DEFAULT 'EUR',
  billing_interval         TEXT NOT NULL DEFAULT 'month'
                             CHECK (billing_interval IN ('month','year','lifetime')),
  includes                 JSONB NOT NULL DEFAULT '{"courses":[],"communities":[],"features":[]}',
  affiliate_commission_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_active                BOOLEAN NOT NULL DEFAULT true,
  stripe_price_id          TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS saas_membership_members (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              TEXT NOT NULL,
  plan_id                UUID NOT NULL REFERENCES saas_membership_plans(id) ON DELETE CASCADE,
  contact_id             UUID,
  contact_email          TEXT NOT NULL,
  status                 TEXT NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active','cancelled','expired')),
  stripe_subscription_id TEXT,
  starts_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at             TIMESTAMPTZ,
  affiliate_ref          TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, contact_email, plan_id)
);

CREATE TABLE IF NOT EXISTS saas_membership_access (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL,
  member_id     UUID NOT NULL REFERENCES saas_membership_members(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('course','community')),
  resource_id   UUID NOT NULL,
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Gating columns
ALTER TABLE saas_lms_courses ADD COLUMN IF NOT EXISTS membership_plan_id UUID
  REFERENCES saas_membership_plans(id) ON DELETE SET NULL;

ALTER TABLE communities ADD COLUMN IF NOT EXISTS required_plan_id UUID
  REFERENCES saas_membership_plans(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_membership_members_tenant_plan
  ON saas_membership_members (tenant_id, plan_id);
CREATE INDEX IF NOT EXISTS idx_membership_members_contact
  ON saas_membership_members (tenant_id, contact_email);
CREATE INDEX IF NOT EXISTS idx_membership_access_member
  ON saas_membership_access (member_id);
CREATE INDEX IF NOT EXISTS idx_membership_plans_tenant
  ON saas_membership_plans (tenant_id);
