-- O19 — Recurring services run log (per-tenant monthly idempotency + audit)
CREATE TABLE IF NOT EXISTS os_recurring_run_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  workspace_id    INT,
  service_type    TEXT NOT NULL CHECK (service_type IN ('seo','social','ads','reputation')),
  period_key      TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued','running','completed','failed','skipped')),
  deliverable_id  TEXT,
  error_message   TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS os_recurring_run_log_tenant_period
  ON os_recurring_run_log (tenant_id, service_type, period_key);
