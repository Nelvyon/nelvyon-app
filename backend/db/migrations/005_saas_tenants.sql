-- SaaS customer onboarding (independent from OS jobs)
CREATE TABLE IF NOT EXISTS saas_tenants (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES nelvyon_users(user_id) ON DELETE CASCADE,
  company_name            TEXT NOT NULL,
  industry                TEXT NOT NULL,
  plan                    TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'enterprise')),
  website                 TEXT,
  phone                   TEXT,
  employees               TEXT,
  goals                   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  onboarding_completed    BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_step         INTEGER NOT NULL DEFAULT 1 CHECK (onboarding_step >= 1 AND onboarding_step <= 4),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT saas_tenants_user_id_key UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_saas_tenants_user_id ON saas_tenants(user_id);
