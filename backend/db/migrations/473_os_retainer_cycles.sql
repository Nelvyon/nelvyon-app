-- O25 — Retainer autopilot v2: verifiable monthly cycle per tenant
CREATE TABLE IF NOT EXISTS os_retainer_cycles (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL,
  workspace_id       INT,
  period_key         TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open','partial','verified','failed')),
  services_expected  JSONB NOT NULL DEFAULT '[]',
  services_delivered JSONB NOT NULL DEFAULT '[]',
  deliverable_ids    JSONB NOT NULL DEFAULT '[]',
  recurring_run_ids  JSONB NOT NULL DEFAULT '[]',
  certificate_ids    JSONB NOT NULL DEFAULT '[]',
  portal_visible     BOOLEAN NOT NULL DEFAULT true,
  verified_at        TIMESTAMPTZ,
  metadata           JSONB NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS os_retainer_cycles_tenant_period
  ON os_retainer_cycles (tenant_id, period_key);

CREATE INDEX IF NOT EXISTS os_retainer_cycles_status
  ON os_retainer_cycles (status, period_key DESC);
