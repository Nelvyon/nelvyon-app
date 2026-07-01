-- Migration 485: Dashboard widget layout per tenant (drag/toggle persistence)

ALTER TABLE saas_tenants
  ADD COLUMN IF NOT EXISTS dashboard_layout JSONB NOT NULL DEFAULT '{
    "widgets": ["health", "activation", "pipeline", "modules", "kpis", "activity", "quickActions"]
  }'::jsonb;
