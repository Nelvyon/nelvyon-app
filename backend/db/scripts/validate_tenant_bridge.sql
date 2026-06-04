-- Fase 1B: validación post-migración 310/311 (ejecutar en SQL editor o vía validateTenantBridge.ts)

-- 1) Tenants sin workspace vinculado
SELECT id, user_id, company_name, created_at
FROM saas_tenants
WHERE workspace_id IS NULL
ORDER BY created_at;

-- 2) workspace_id duplicados (debe devolver 0 filas)
SELECT workspace_id, COUNT(*) AS n, array_agg(id::text) AS tenant_ids
FROM saas_tenants
WHERE workspace_id IS NOT NULL
GROUP BY workspace_id
HAVING COUNT(*) > 1;

-- 3) Conteo saas_tenants por workspace
SELECT workspace_id, COUNT(*) AS tenant_count
FROM saas_tenants
WHERE workspace_id IS NOT NULL
GROUP BY workspace_id
ORDER BY workspace_id;

-- 4) Resumen bridge
SELECT
  COUNT(*) AS total_tenants,
  COUNT(workspace_id) AS with_workspace,
  COUNT(*) - COUNT(workspace_id) AS without_workspace
FROM saas_tenants;

-- 5) Workspaces sin tenant SaaS (opcional)
SELECT w.id AS workspace_id, w.user_id
FROM workspaces w
LEFT JOIN saas_tenants st ON st.workspace_id = w.id
WHERE st.id IS NULL
ORDER BY w.id
LIMIT 100;
