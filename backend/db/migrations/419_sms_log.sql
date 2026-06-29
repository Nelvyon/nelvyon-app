-- Migration 419: SaaS-level SMS log (tenant-scoped, env Twilio credentials)
CREATE TABLE IF NOT EXISTS saas_sms_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  to_number TEXT NOT NULL,
  body TEXT NOT NULL,
  twilio_sid TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','failed','queued')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_sms_log_tenant ON saas_sms_log(tenant_id, created_at DESC);
