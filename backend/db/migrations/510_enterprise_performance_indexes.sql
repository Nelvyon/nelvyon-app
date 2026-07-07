-- FASE 2.1 — additive indexes for OS audit tables + deliverable pack_run lookups

CREATE INDEX IF NOT EXISTS os_delivery_certificates_tenant_id_idx
  ON os_delivery_certificates (tenant_id);

CREATE INDEX IF NOT EXISTS os_delivery_certificates_workspace_id_idx
  ON os_delivery_certificates (workspace_id);

CREATE INDEX IF NOT EXISTS os_competitor_gap_runs_tenant_id_idx
  ON os_competitor_gap_runs (tenant_id);

CREATE INDEX IF NOT EXISTS os_competitor_gap_runs_workspace_id_idx
  ON os_competitor_gap_runs (workspace_id);

CREATE INDEX IF NOT EXISTS os_brief_diff_runs_tenant_id_idx
  ON os_brief_diff_runs (tenant_id);

CREATE INDEX IF NOT EXISTS os_deliverables_metadata_pack_run_id_idx
  ON os_deliverables ((metadata->>'pack_run_id'))
  WHERE metadata->>'pack_run_id' IS NOT NULL;
