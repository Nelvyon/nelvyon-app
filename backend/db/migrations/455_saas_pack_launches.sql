-- S49: saas_pack_launches — tracks brief-to-launch runs from SaaS UI
CREATE TABLE IF NOT EXISTS saas_pack_launches (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT        NOT NULL,
  pack_id       TEXT        NOT NULL,
  pack_run_id   UUID        REFERENCES nelvyon_pack_runs(id) ON DELETE SET NULL,
  brief         JSONB       NOT NULL DEFAULT '{}',
  status        TEXT        NOT NULL DEFAULT 'queued'
                            CHECK (status IN ('queued','running','completed','failed','cancelled')),
  progress_pct  INT         NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  error_message TEXT,
  portal_url    TEXT,
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS saas_pack_launches_tenant_created
  ON saas_pack_launches (tenant_id, created_at DESC);
