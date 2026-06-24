-- Migration 432: Autonomous monthly recurring service deliverables
-- Stores monthly SEO report, social calendar refresh, and ads snapshot per tenant

CREATE TABLE IF NOT EXISTS saas_recurring_deliverables (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    TEXT NOT NULL,
  month        TEXT NOT NULL,  -- 'YYYY-MM', e.g. '2026-06'
  service_type TEXT NOT NULL
    CHECK (service_type IN ('seo_report', 'social_calendar', 'ads_snapshot')),
  payload      JSONB NOT NULL DEFAULT '{}',
  status       TEXT NOT NULL DEFAULT 'generated'
    CHECK (status IN ('generated', 'delivered', 'archived')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, month, service_type)
);

CREATE INDEX IF NOT EXISTS idx_saas_recurring_tenant_month
  ON saas_recurring_deliverables (tenant_id, month DESC);

CREATE INDEX IF NOT EXISTS idx_saas_recurring_status
  ON saas_recurring_deliverables (status);
