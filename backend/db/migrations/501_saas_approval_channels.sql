-- 501 — Slack / Teams approval channel settings for pack deliverables
CREATE TABLE IF NOT EXISTS saas_approval_channel_settings (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  channel                   TEXT NOT NULL CHECK (channel IN ('slack', 'teams')),
  slack_team_id             TEXT,
  slack_channel_id          TEXT,
  teams_webhook_url         TEXT,
  pack_approve_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  deliverable_approve_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_approval_channels_tenant
  ON saas_approval_channel_settings(tenant_id);
