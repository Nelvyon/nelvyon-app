-- 499 — Unified audit export helper view (read-only union for reporting)
CREATE OR REPLACE VIEW saas_unified_audit_v1 AS
SELECT
  id::text AS id,
  tenant_id::text AS tenant_id,
  'audit_log'::text AS source,
  action,
  module,
  resource_id::text AS resource_id,
  created_at
FROM audit_logs
UNION ALL
SELECT
  id::text,
  tenant_id::text,
  'agent_run'::text,
  status AS action,
  ('agent:' || COALESCE(agent_id, '')) AS module,
  agent_id AS resource_id,
  created_at
FROM saas_agent_runs;
