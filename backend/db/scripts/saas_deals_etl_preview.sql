-- Fase 3A: vista previa ETL deals legacy → saas_deals (SOLO LECTURA)
-- Ejecutar en psql; la migración real es POST /api/saas/deals/etl con mode dry-run|apply

-- 1) Conteos por fuente legacy
SELECT 'deals' AS source, COUNT(*) AS n FROM deals WHERE workspace_id IS NOT NULL
UNION ALL
SELECT 'crm_deals', COUNT(*) FROM crm_deals WHERE workspace_id IS NOT NULL
UNION ALL
SELECT 'pipeline_deals', COUNT(*) FROM pipeline_deals WHERE workspace_id IS NOT NULL;

-- 2) Workspaces sin bridge tenant
SELECT d.workspace_id, COUNT(*) AS legacy_deals
FROM deals d
LEFT JOIN saas_tenants st ON st.workspace_id = d.workspace_id
WHERE st.id IS NULL
GROUP BY d.workspace_id
ORDER BY legacy_deals DESC
LIMIT 20;

-- 3) Deals legacy con contact_id sin saas_contacts ETL
SELECT d.id, d.workspace_id, d.contact_id, d.title
FROM deals d
INNER JOIN saas_tenants st ON st.workspace_id = d.workspace_id
WHERE d.contact_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM saas_contacts sc
    WHERE sc.tenant_id = st.id
      AND 'etl:legacy_id:contacts:' || d.contact_id::text = ANY (sc.tags)
  )
LIMIT 50;

-- 4) Ya migrados (source etl tag)
SELECT COUNT(*) AS saas_deals_from_etl
FROM saas_deals
WHERE source LIKE 'etl:legacy_id:%';
