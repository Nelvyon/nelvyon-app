"""
PRODUCT-ONBOARD-1 FASE 1 — Resumen ligero del workspace para el dashboard inicial.

Solo conteos y metadatos; mismo aislamiento que el resto de la API (require_workspace).

Fase 1C — contactos: saas_contacts (bridge) + fallback legacy; checklist apunta a /saas/crm.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.deal_stages import SQL_TERMINAL_STAGE_VALUES
from dependencies.workspace import WorkspaceContext, require_workspace

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/workspace", tags=["workspace-home"])


_TERMINAL_STAGES_LOWER = tuple(s.lower() for s in SQL_TERMINAL_STAGE_VALUES)
_RESOLVED_TICKET = ("resolved", "closed", "done")


@router.get("/home-summary")
async def get_workspace_home_summary(
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """KPIs mínimos + checklist sugerida (derivada de datos reales, sin persistencia extra)."""
    from models.campaigns import Campaigns
    from models.deals import Deals
    from models.helpdesk_tickets import Helpdesk_tickets
    from models.workflows import Workflows
    from models.workspaces import Workspaces

    user_id = ws_ctx.user_id
    ws_id = ws_ctx.workspace_id

    ws_row = await db.execute(select(Workspaces.name).where(Workspaces.id == ws_id))
    workspace_name = ws_row.scalar_one_or_none() or "Workspace"

    stage_lower = func.lower(func.coalesce(Deals.stage, ""))
    ticket_status = func.lower(func.coalesce(Helpdesk_tickets.status, "open"))

    q_campaigns = (
        select(func.count(Campaigns.id))
        .where(Campaigns.user_id == user_id, Campaigns.workspace_id == ws_id)
    )
    q_deals_open = (
        select(func.count(Deals.id))
        .where(
            Deals.user_id == user_id,
            Deals.workspace_id == ws_id,
            ~stage_lower.in_(_TERMINAL_STAGES_LOWER),
        )
    )
    q_tickets_open = (
        select(func.count(Helpdesk_tickets.id))
        .where(
            Helpdesk_tickets.user_id == user_id,
            Helpdesk_tickets.workspace_id == ws_id,
            ~ticket_status.in_(_RESOLVED_TICKET),
        )
    )
    q_deals_any = (
        select(func.count(Deals.id))
        .where(Deals.user_id == user_id, Deals.workspace_id == ws_id)
    )
    q_tickets_any = (
        select(func.count(Helpdesk_tickets.id))
        .where(Helpdesk_tickets.user_id == user_id, Helpdesk_tickets.workspace_id == ws_id)
    )
    q_workflows_any = (
        select(func.count(Workflows.id))
        .where(Workflows.user_id == user_id, Workflows.workspace_id == ws_id)
    )

    try:
        from services.saas_contact_quota import count_contacts_for_workspace

        contacts_n = await count_contacts_for_workspace(db, ws_id, mode="hybrid")
        campaigns_n = int((await db.execute(q_campaigns)).scalar_one() or 0)
        deals_open_n = int((await db.execute(q_deals_open)).scalar_one() or 0)
        tickets_open_n = int((await db.execute(q_tickets_open)).scalar_one() or 0)
        deals_any_n = int((await db.execute(q_deals_any)).scalar_one() or 0)
        tickets_any_n = int((await db.execute(q_tickets_any)).scalar_one() or 0)
        workflows_any_n = int((await db.execute(q_workflows_any)).scalar_one() or 0)
    except Exception as e:
        logger.warning("workspace_home_summary query failed workspace_id=%s: %s", ws_id, e, exc_info=True)
        contacts_n = campaigns_n = deals_open_n = tickets_open_n = deals_any_n = tickets_any_n = workflows_any_n = 0

    first_steps: list[dict[str, Any]] = [
        {
            "id": "contacts",
            "title": "Añade tu primer contacto",
            "description": "El CRM es el núcleo de NELVYON en tu workspace.",
            "href": "/saas/crm",
            "done": contacts_n > 0,
        },
        {
            "id": "pipeline",
            "title": "Crea un deal en el pipeline",
            "description": "Da seguimiento a oportunidades reales, sin ruido.",
            "href": "/saas/pipelines",
            "done": deals_any_n > 0,
        },
        {
            "id": "campaign",
            "title": "Define una campaña (borrador)",
            "description": "Empieza en borrador; el envío lo decides después.",
            "href": "/saas/campaigns",
            "done": campaigns_n > 0,
        },
        {
            "id": "helpdesk",
            "title": "Prueba el helpdesk",
            "description": "Un ticket de prueba ayuda a ver el flujo completo.",
            "href": "/saas/helpdesk",
            "done": tickets_any_n > 0,
        },
        {
            "id": "workflows",
            "title": "Automatiza con workflows",
            "description": "Define disparadores y pasos básicos en tu workspace.",
            "href": "/saas/workflows",
            "done": workflows_any_n > 0,
        },
    ]

    return {
        "workspace_id": ws_id,
        "workspace_name": workspace_name,
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "counts": {
            "contacts": contacts_n,
            "campaigns": campaigns_n,
            "deals_open": deals_open_n,
            "helpdesk_open": tickets_open_n,
        },
        "first_steps": first_steps,
    }
