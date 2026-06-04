"""
Fase 1B/1C — conteo de contactos para cuotas, métricas y billing.

Modo transición (por defecto): saas-first con fallback legacy — max(saas, legacy)
para no reducir cupos ni KPIs de golpe mientras coexisten datos.

Modo futuro: CONTACTS_QUOTA_SAAS_ONLY_SQL / saas_only=True tras ETL completo.
Ver docs/PHASE_1C_QUOTAS.md.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Literal, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

ContactsCountMode = Literal["hybrid", "saas_only"]

# SQL fragment: :ws = workspace_id (int) — GREATEST en una sola query (Postgres)
CONTACTS_QUOTA_COUNT_SQL = """
SELECT GREATEST(
    COALESCE((
        SELECT COUNT(*)        FROM saas_contacts sc
        INNER JOIN saas_tenants st ON st.id = sc.tenant_id AND st.workspace_id = :ws
    ), 0),
    COALESCE((
        SELECT COUNT(*) FROM crm_contacts WHERE workspace_id = :ws
    ), 0) + COALESCE((
        SELECT COUNT(*) FROM contacts WHERE workspace_id = :ws
    ), 0)
) AS c
"""

CONTACTS_QUOTA_SAAS_ONLY_SQL = """
SELECT COALESCE((
    SELECT COUNT(*)    FROM saas_contacts sc
    INNER JOIN saas_tenants st ON st.id = sc.tenant_id AND st.workspace_id = :ws
), 0) AS c
"""

_SAAS_COUNT_SQL = """
SELECT COUNT(*) AS c
FROM saas_contacts sc
INNER JOIN saas_tenants st ON st.id = sc.tenant_id AND st.workspace_id = :ws
"""

_CRM_CONTACTS_COUNT_SQL = """
SELECT COUNT(*) AS c FROM crm_contacts WHERE workspace_id = :ws
"""

_CONTACTS_COUNT_SQL = """
SELECT COUNT(*) AS c FROM contacts WHERE workspace_id = :ws
"""

_SAAS_LEADS_SQL = """
SELECT COUNT(*) AS c
FROM saas_contacts sc
INNER JOIN saas_tenants st ON st.id = sc.tenant_id AND st.workspace_id = :ws
WHERE sc.status = 'lead'
"""

_LEGACY_LEADS_SQL = """
SELECT COUNT(*) AS c FROM contacts
WHERE workspace_id = :ws AND status = 'lead'
"""

_SAAS_PERIOD_SQL = """
SELECT COUNT(*) AS c
FROM saas_contacts sc
INNER JOIN saas_tenants st ON st.id = sc.tenant_id AND st.workspace_id = :ws
WHERE sc.created_at >= :since
"""

_LEGACY_PERIOD_SQL = """
SELECT COUNT(*) AS c FROM contacts
WHERE workspace_id = :ws AND created_at >= :since
"""


async def _scalar_c(db: AsyncSession, sql: str, params: dict[str, Any]) -> Optional[int]:
    try:
        r = await db.execute(text(sql), params)
        row = r.mappings().first()
        if row is None:
            return None
        return int(row.get("c", 0) or 0)
    except Exception as exc:
        logger.debug("saas_contact_quota query skipped: %s", exc)
        return None


async def count_saas_contacts_in_workspace(db: AsyncSession, workspace_id: int) -> int:
    n = await _scalar_c(db, _SAAS_COUNT_SQL, {"ws": workspace_id})
    return n if n is not None else 0


async def count_legacy_contacts_in_workspace(db: AsyncSession, workspace_id: int) -> int:
    """Suma crm_contacts + contacts; cada tabla se consulta por separado (SQLite tests)."""
    crm_n = await _scalar_c(db, _CRM_CONTACTS_COUNT_SQL, {"ws": workspace_id})
    contacts_n = await _scalar_c(db, _CONTACTS_COUNT_SQL, {"ws": workspace_id})
    return (crm_n or 0) + (contacts_n or 0)


async def count_contacts_for_workspace(
    db: AsyncSession,
    workspace_id: int,
    *,
    mode: ContactsCountMode = "hybrid",
) -> int:
    """
    Conteo oficial para cuotas/billing/métricas SaaS.

    hybrid: max(saas vía bridge, legacy crm_contacts + contacts)
    saas_only: solo saas_contacts (activar tras migración — ver PHASE_1C_QUOTAS.md)
    """
    if mode == "saas_only":
        return await count_saas_contacts_in_workspace(db, workspace_id)

    saas_n = await count_saas_contacts_in_workspace(db, workspace_id)
    legacy_n = await count_legacy_contacts_in_workspace(db, workspace_id)
    return max(saas_n, legacy_n)


async def count_contacts_breakdown(
    db: AsyncSession, workspace_id: int
) -> dict[str, int]:
    """Desglose para telemetría en dashboards (contacts_source)."""
    saas_n = await count_saas_contacts_in_workspace(db, workspace_id)
    legacy_n = await count_legacy_contacts_in_workspace(db, workspace_id)
    hybrid = max(saas_n, legacy_n)
    return {"saas": saas_n, "legacy": legacy_n, "hybrid": hybrid}


async def count_contacts_leads_hybrid(db: AsyncSession, workspace_id: int) -> int:
    saas_n = await _scalar_c(db, _SAAS_LEADS_SQL, {"ws": workspace_id})
    legacy_n = await _scalar_c(db, _LEGACY_LEADS_SQL, {"ws": workspace_id})
    return max(saas_n or 0, legacy_n or 0)


async def count_contacts_period_hybrid(
    db: AsyncSession,
    workspace_id: int,
    since: datetime,
    *,
    until: Optional[datetime] = None,
    user_id: Optional[str] = None,
) -> int:
    """Contactos creados en [since, until) (transición: max saas, legacy contacts)."""
    saas_sql = _SAAS_PERIOD_SQL
    saas_params: dict[str, Any] = {"ws": workspace_id, "since": since}
    if until is not None:
        saas_sql = """
        SELECT COUNT(*) AS c
        FROM saas_contacts sc
        INNER JOIN saas_tenants st ON st.id = sc.tenant_id AND st.workspace_id = :ws
        WHERE sc.created_at >= :since AND sc.created_at < :until
        """
        saas_params["until"] = until
    saas_n = await _scalar_c(db, saas_sql, saas_params)

    if user_id:
        legacy_sql = """
        SELECT COUNT(*) AS c FROM contacts
        WHERE workspace_id = :ws AND user_id = :uid
          AND created_at >= :since
        """
        params: dict[str, Any] = {"ws": workspace_id, "since": since, "uid": user_id}
        if until is not None:
            legacy_sql += " AND created_at < :until"
            params["until"] = until
    else:
        legacy_sql = _LEGACY_PERIOD_SQL
        params = {"ws": workspace_id, "since": since}
        if until is not None:
            legacy_sql = """
            SELECT COUNT(*) AS c FROM contacts
            WHERE workspace_id = :ws AND created_at >= :since AND created_at < :until
            """
            params["until"] = until
    legacy_n = await _scalar_c(db, legacy_sql, params)
    return max(saas_n or 0, legacy_n or 0)


def contacts_count_source_label(saas_n: int, legacy_n: int) -> str:
    if saas_n > 0 and legacy_n > 0:
        return "hybrid"
    if saas_n > 0:
        return "saas"
    if legacy_n > 0:
        return "legacy"
    return "empty"
