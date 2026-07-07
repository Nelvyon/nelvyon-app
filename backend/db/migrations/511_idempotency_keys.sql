-- Pack kickoff + manual workflow execute idempotency (FASE 2.1 closure)

ALTER TABLE nelvyon_pack_runs
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS nelvyon_pack_runs_workspace_idempotency_key
  ON nelvyon_pack_runs (workspace_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE saas_workflow_runs
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS saas_workflow_runs_tenant_workflow_idempotency
  ON saas_workflow_runs (tenant_id, workflow_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
