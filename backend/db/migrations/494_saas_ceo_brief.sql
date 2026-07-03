-- 494 — CEO morning brief settings + delivery runs
CREATE TABLE IF NOT EXISTS saas_ceo_brief_settings (
  tenant_id         UUID PRIMARY KEY REFERENCES saas_tenants(id) ON DELETE CASCADE,
  enabled           BOOLEAN NOT NULL DEFAULT TRUE,
  delivery_hour_utc SMALLINT NOT NULL DEFAULT 7 CHECK (delivery_hour_utc >= 0 AND delivery_hour_utc <= 23),
  channels          JSONB NOT NULL DEFAULT '["email","voice"]'::jsonb,
  voice_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saas_ceo_brief_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  summary_text      TEXT NOT NULL,
  metrics_snapshot  JSONB NOT NULL DEFAULT '{}'::jsonb,
  delivered_via     TEXT[] NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ceo_brief_runs_tenant_created
  ON saas_ceo_brief_runs(tenant_id, created_at DESC);
