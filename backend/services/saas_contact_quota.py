"""
Fase 1B — conteo de contactos para cuotas/métricas con bridge SaaS.

Cuando existe saas_tenants.workspace_id para el workspace activo, el conteo oficial
es saas_contacts. Durante la transición se usa GREATEST(saas, legacy) para no
reducir cuotas de forma abrupta.
"""

from __future__ import annotations

# SQL fragment: :ws = workspace_id (int)
CONTACTS_QUOTA_COUNT_SQL = """
SELECT GREATEST(
    COALESCE((
        SELECT COUNT(*)::int
        FROM saas_contacts sc
        INNER JOIN saas_tenants st ON st.id = sc.tenant_id AND st.workspace_id = :ws
    ), 0),
    COALESCE((
        SELECT COUNT(*)::int FROM crm_contacts WHERE workspace_id = :ws
    ), 0) + COALESCE((
        SELECT COUNT(*)::int FROM contacts WHERE workspace_id = :ws
    ), 0)
) AS c
"""

# Conteo solo SaaS (post-migración completa)
CONTACTS_QUOTA_SAAS_ONLY_SQL = """
SELECT COALESCE((
    SELECT COUNT(*)::int
    FROM saas_contacts sc
    INNER JOIN saas_tenants st ON st.id = sc.tenant_id AND st.workspace_id = :ws
), 0) AS c
"""
