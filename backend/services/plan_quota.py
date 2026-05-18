"""
Plan / límites por workspace (NELVYON-REMEDIATION-1 FASE 2).

Usa `core.pricing_plans` + suscripción `active` del workspace (tabla subscriptions).
Sin billing real: solo enforcement coherente con definición de planes.
"""
from __future__ import annotations

import logging
from typing import Optional

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from core.pricing_plans import get_limit, get_plan_definition
from models.campaigns import Campaigns
from models.contacts import Contacts
from models.workflows import Workflows

logger = logging.getLogger(__name__)

_CAMPAIGN_TERMINAL_STATUSES = frozenset(
    {"sent", "completed", "cancelled", "archived", "failed"}
)


async def get_active_plan_id_for_workspace(db: AsyncSession, workspace_id: int) -> str:
    """Plan comercial del workspace desde la fila `subscriptions` activa más reciente (``ORDER BY id DESC``); fallback starter."""
    try:
        r = await db.execute(
            text(
                "SELECT plan_id FROM subscriptions "
                "WHERE workspace_id = :ws AND status = 'active' "
                "ORDER BY id DESC LIMIT 1"
            ),
            {"ws": workspace_id},
        )
        row = r.fetchone()
        if row and row[0]:
            return str(row[0]).lower()
    except Exception as e:
        logger.debug("plan_quota: no subscription row for ws=%s: %s", workspace_id, e)
    return "starter"


async def count_contacts_in_workspace(db: AsyncSession, workspace_id: int) -> int:
    q = select(func.count()).select_from(Contacts).where(Contacts.workspace_id == workspace_id)
    r = await db.execute(q)
    return int(r.scalar() or 0)


async def count_non_terminal_campaigns_in_workspace(db: AsyncSession, workspace_id: int) -> int:
    """Campañas que cuentan contra el cupo (no estado terminal)."""
    status_col = func.lower(func.coalesce(Campaigns.status, ""))
    q = select(func.count()).select_from(Campaigns).where(
        Campaigns.workspace_id == workspace_id,
        status_col.notin_(_CAMPAIGN_TERMINAL_STATUSES),
    )
    r = await db.execute(q)
    return int(r.scalar() or 0)


async def count_active_workflows_in_workspace(db: AsyncSession, workspace_id: int) -> int:
    q = select(func.count()).select_from(Workflows).where(
        Workflows.workspace_id == workspace_id,
        func.lower(func.coalesce(Workflows.status, "")) == "active",
    )
    r = await db.execute(q)
    return int(r.scalar() or 0)


def _module_allowed(plan_id: str, module: str) -> bool:
    mods = get_plan_definition(plan_id).get("modules") or {}
    return bool(mods.get(module))


def _terminal_campaign_status(status: Optional[str]) -> bool:
    s = (status or "").strip().lower()
    return s in _CAMPAIGN_TERMINAL_STATUSES


async def enforce_contact_headroom(db: AsyncSession, workspace_id: int, additional: int) -> None:
    """Comprueba módulo + cupo para `additional` contactos nuevos (n + additional <= lim)."""
    from fastapi import HTTPException

    plan_id = await get_active_plan_id_for_workspace(db, workspace_id)
    if not _module_allowed(plan_id, "contacts"):
        raise HTTPException(
            status_code=403,
            detail="Tu plan no incluye creación de contactos en este workspace.",
        )
    if additional <= 0:
        return
    lim: Optional[int] = get_limit(plan_id, "contacts")
    if lim is None:
        return
    n = await count_contacts_in_workspace(db, workspace_id)
    if n + additional > lim:
        raise HTTPException(
            status_code=403,
            detail=f"Límite de contactos del plan: máximo {lim}, actuales {n}, solicitados +{additional}.",
        )


async def enforce_contact_create_quota(db: AsyncSession, workspace_id: int) -> None:
    await enforce_contact_headroom(db, workspace_id, 1)


async def enforce_campaign_headroom(db: AsyncSession, workspace_id: int, additional: int) -> None:
    """Campañas no terminales: cupo para `additional` filas nuevas o que dejen de ser terminales."""
    from fastapi import HTTPException

    plan_id = await get_active_plan_id_for_workspace(db, workspace_id)
    if not _module_allowed(plan_id, "campaigns"):
        raise HTTPException(
            status_code=403,
            detail="Tu plan no incluye campañas en este workspace.",
        )
    if additional <= 0:
        return
    lim = get_limit(plan_id, "active_campaigns")
    if lim is None:
        return
    n = await count_non_terminal_campaigns_in_workspace(db, workspace_id)
    if n + additional > lim:
        raise HTTPException(
            status_code=403,
            detail=f"Límite de campañas no terminales del plan: máximo {lim}, actuales {n}, +{additional}.",
        )


async def enforce_campaign_create_quota(db: AsyncSession, workspace_id: int) -> None:
    await enforce_campaign_headroom(db, workspace_id, 1)


async def enforce_workflow_active_headroom(db: AsyncSession, workspace_id: int, additional_active: int) -> None:
    """Workflows con status active: cupo para `additional_active` activos nuevos."""
    from fastapi import HTTPException

    plan_id = await get_active_plan_id_for_workspace(db, workspace_id)
    if not _module_allowed(plan_id, "workflows"):
        raise HTTPException(
            status_code=403,
            detail="Tu plan no incluye workflows en este workspace.",
        )
    if additional_active <= 0:
        return
    lim = get_limit(plan_id, "active_workflows")
    if lim is None:
        return
    n = await count_active_workflows_in_workspace(db, workspace_id)
    if n + additional_active > lim:
        raise HTTPException(
            status_code=403,
            detail=f"Límite de workflows activos del plan: máximo {lim}, actuales {n}, +{additional_active}.",
        )


async def enforce_workflow_create_quota(db: AsyncSession, workspace_id: int) -> None:
    await enforce_workflow_active_headroom(db, workspace_id, 1)


async def enforce_workflow_activation_transition(
    db: AsyncSession,
    workspace_id: int,
    old_status: Optional[str],
    new_status: Optional[str],
) -> None:
    """Si pasa a active desde no-active, cuenta como +1 activo."""
    old_l = (old_status or "").strip().lower()
    new_l = (new_status or "").strip().lower()
    if new_l != "active" or old_l == "active":
        return
    await enforce_workflow_active_headroom(db, workspace_id, 1)


async def enforce_campaign_reopen_transition(
    db: AsyncSession,
    workspace_id: int,
    old_status: Optional[str],
    new_status: Optional[str],
) -> None:
    """Si sale de estado terminal a no terminal, cuenta como +1 campaña no terminal."""
    if not _terminal_campaign_status(old_status):
        return
    if _terminal_campaign_status(new_status):
        return
    await enforce_campaign_headroom(db, workspace_id, 1)


async def enforce_contacts_plan_module_for_crm_writes(db: AsyncSession, workspace_id: int) -> None:
    """Deals/merge CRM: no suben cupo de contactos pero exigen módulo contactos del plan."""
    await enforce_contact_headroom(db, workspace_id, 0)


async def enforce_helpdesk_module_allowed(db: AsyncSession, workspace_id: int) -> None:
    """Mensajes / inbox: requiere módulo helpdesk del plan activo."""
    from fastapi import HTTPException

    plan_id = await get_active_plan_id_for_workspace(db, workspace_id)
    if not _module_allowed(plan_id, "helpdesk"):
        raise HTTPException(
            status_code=403,
            detail="Tu plan no incluye helpdesk/mensajes en este workspace.",
        )


async def enforce_workflow_engine_rules_write_allowed(db: AsyncSession, workspace_id: int) -> None:
    """CRUD de reglas en `/workflow-engine/rules`: requiere módulo workflows (sin cupo de activos aquí)."""
    await enforce_workflow_active_headroom(db, workspace_id, 0)


async def enforce_workflow_engine_trigger_execute_allowed(db: AsyncSession, workspace_id: int) -> None:
    """
    POST `/workflow-engine/trigger` y `/execute/{id}`: módulo workflows + base CRM
    (contactos) porque las acciones persisten en deals/contactos/actividades/email queue.
    """
    await enforce_workflow_active_headroom(db, workspace_id, 0)
    await enforce_contacts_plan_module_for_crm_writes(db, workspace_id)
