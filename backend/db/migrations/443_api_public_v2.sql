-- S32: API Pública v1 — usage log para 7-day charts

CREATE TABLE IF NOT EXISTS api_key_usage_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id  UUID        NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  tenant_id   UUID        NOT NULL,
  endpoint    TEXT        NOT NULL,
  method      TEXT        NOT NULL DEFAULT 'GET',
  status_code INTEGER     NOT NULL DEFAULT 200,
  response_ms INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_key_usage_log_key     ON api_key_usage_log(api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_log_tenant  ON api_key_usage_log(tenant_id, created_at DESC);

-- Day-bucket view for 7d charts (used by /api/saas/api-keys/usage)
CREATE OR REPLACE VIEW api_key_usage_daily AS
SELECT
  api_key_id,
  tenant_id,
  DATE_TRUNC('day', created_at) AS day,
  COUNT(*)                       AS total_requests,
  COUNT(*) FILTER (WHERE status_code < 400) AS success_requests,
  COUNT(*) FILTER (WHERE status_code >= 400) AS error_requests,
  ROUND(AVG(response_ms))        AS avg_response_ms
FROM api_key_usage_log
GROUP BY api_key_id, tenant_id, DATE_TRUNC('day', created_at);
