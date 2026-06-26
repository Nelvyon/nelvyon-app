-- S51 — Sector Benchmark snapshots (tenant KPIs vs industry medians)
CREATE TABLE IF NOT EXISTS saas_benchmark_snapshots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         TEXT NOT NULL,
  sector_key        TEXT NOT NULL,
  sector_label      TEXT NOT NULL,
  period_days       INT NOT NULL DEFAULT 30,
  client_metrics    JSONB NOT NULL DEFAULT '{}',
  industry_metrics  JSONB NOT NULL DEFAULT '{}',
  comparisons       JSONB NOT NULL DEFAULT '[]',
  summary           JSONB NOT NULL DEFAULT '{}',
  data_sources      JSONB NOT NULL DEFAULT '[]',
  degraded          BOOLEAN NOT NULL DEFAULT false,
  computed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS saas_benchmark_snapshots_tenant_computed
  ON saas_benchmark_snapshots (tenant_id, computed_at DESC);
