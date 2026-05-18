"""
Agent Actions Router — Enables AI agents to execute real actions in NELVYON.
Actions: create_contact, move_deal, create_report, create_blog_post, schedule_event.

Política Fase 2 (producto):
- Siempre `require_workspace_operator`: mismo umbral que mutaciones CRM/inbox manual.
- Plan / módulos vía `plan_quota` cuando el plan define módulo aplicable:
  • create_contact → cupo/módulo contactos.
  • move_deal → módulo contactos/CRM (escritura deal).
  • create_report, create_blog_post, schedule_event → sin clave de módulo en
    `pricing_plans` para “reportes/calendario/blog” genéricos: solo workspace
    + operator (sin duplicar reglas inventadas en el router).
"""

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from dependencies.workspace import WorkspaceContext, require_workspace_operator
from schemas.auth import UserResponse
from services.plan_quota import (
    enforce_contact_create_quota,
    enforce_contacts_plan_module_for_crm_writes,
)
from models.contacts import Contacts
from models.deals import Deals
from models.report_items import Report_items
from models.blog_posts import Blog_posts
from models.calendar_events import Calendar_events
from models.activities import Activities

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/agent-actions", tags=["agent-actions"])


# ─── Schemas ───

class AgentActionRequest(BaseModel):
    action: str  # create_contact, move_deal, create_report, create_blog_post, schedule_event
    params: Dict[str, Any] = {}


class AgentActionResponse(BaseModel):
    success: bool
    action: str
    message: str
    data: Dict[str, Any] = {}


# ─── Main Dispatch ───

@router.post("", response_model=AgentActionResponse)
async def execute_agent_action(
    request: AgentActionRequest,
    current_user: UserResponse = Depends(get_current_user),
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Execute a real action requested by an AI agent."""
    user_id = str(current_user.id)
    workspace_id = ws_ctx.workspace_id
    action = request.action
    params = request.params

    try:
        if action == "create_contact":
            await enforce_contact_create_quota(db, workspace_id)
            result = await _create_contact(db, user_id, workspace_id, params)
        elif action == "move_deal":
            await enforce_contacts_plan_module_for_crm_writes(db, workspace_id)
            result = await _move_deal(db, user_id, workspace_id, params)
        elif action == "create_report":
            result = await _create_report(db, user_id, workspace_id, params)
        elif action == "create_blog_post":
            result = await _create_blog_post(db, user_id, workspace_id, params)
        elif action == "schedule_event":
            result = await _schedule_event(db, user_id, workspace_id, params)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown action: {action}")

        # Log the action as an activity
        activity = Activities(
            user_id=user_id,
            workspace_id=workspace_id,
            type="agent_action",
            title=f"Agent: {action}",
            description=f"Agent executed {action}. Result: {json.dumps(result.get('data', {}), default=str)[:500]}",
            is_completed=True,
            created_at=datetime.now(timezone.utc),
        )
        db.add(activity)
        await db.commit()

        return AgentActionResponse(success=True, action=action, **result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Agent action failed: {action}, error: {e}", exc_info=True)
        await db.rollback()
        return AgentActionResponse(
            success=False, action=action,
            message=f"Error executing {action}: {str(e)}",
            data={"error": str(e)},
        )


# ─── Action Implementations ───

async def _create_contact(db: AsyncSession, user_id: str, workspace_id: int, params: Dict) -> Dict:
    first_name = params.get("first_name", "")
    if not first_name:
        raise HTTPException(status_code=400, detail="first_name is required")

    contact = Contacts(
        user_id=user_id,
        workspace_id=workspace_id,
        first_name=first_name,
        last_name=params.get("last_name", ""),
        email=params.get("email", ""),
        phone=params.get("phone", ""),
        company_name=params.get("company", ""),
        status=params.get("status", "active"),
        source="agent",
        tags=params.get("tags", ""),
        notes=params.get("notes", "Created by AI agent"),
        created_at=datetime.now(timezone.utc),
    )
    db.add(contact)
    await db.flush()
    await db.refresh(contact)

    return {
        "message": f"Contacto '{first_name} {params.get('last_name', '')}' creado exitosamente (ID: {contact.id})",
        "data": {"contact_id": contact.id, "name": f"{first_name} {params.get('last_name', '')}"},
    }


async def _move_deal(db: AsyncSession, user_id: str, workspace_id: int, params: Dict) -> Dict:
    deal_id = params.get("deal_id")
    new_stage = params.get("stage")
    if not deal_id or not new_stage:
        raise HTTPException(status_code=400, detail="deal_id and stage are required")

    result = await db.execute(
        select(Deals).where(
            Deals.id == int(deal_id),
            Deals.user_id == user_id,
            Deals.workspace_id == workspace_id,
        )
    )
    deal = result.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail=f"Deal {deal_id} not found")

    old_stage = deal.stage
    deal.stage = new_stage
    deal.updated_at = datetime.now(timezone.utc)
    await db.flush()

    return {
        "message": f"Deal '{deal.title}' movido de '{old_stage}' a '{new_stage}'",
        "data": {"deal_id": deal.id, "title": deal.title, "old_stage": old_stage, "new_stage": new_stage},
    }


async def _create_report(db: AsyncSession, user_id: str, workspace_id: int, params: Dict) -> Dict:
    name = params.get("name", "Reporte del Agente")
    report = Report_items(
        user_id=user_id,
        workspace_id=workspace_id,
        name=name,
        report_type=params.get("report_type", "general"),
        status="generated",
        data_json=json.dumps(params.get("data", {}), default=str),
        metrics_json=json.dumps(params.get("metrics", {}), default=str),
        period=params.get("period", "custom"),
        generated_by="ai_agent",
        created_at=datetime.now(timezone.utc),
    )
    db.add(report)
    await db.flush()
    await db.refresh(report)

    return {
        "message": f"Reporte '{name}' generado exitosamente (ID: {report.id})",
        "data": {"report_id": report.id, "name": name},
    }


async def _create_blog_post(db: AsyncSession, user_id: str, workspace_id: int, params: Dict) -> Dict:
    title = params.get("title", "")
    if not title:
        raise HTTPException(status_code=400, detail="title is required")

    post = Blog_posts(
        user_id=user_id,
        workspace_id=workspace_id,
        title=title,
        slug=params.get("slug", title.lower().replace(" ", "-")[:80]),
        content=params.get("content", ""),
        excerpt=params.get("excerpt", ""),
        category=params.get("category", "general"),
        tags=params.get("tags", ""),
        status=params.get("status", "draft"),
        author="AI Agent",
        seo_title=params.get("seo_title", title),
        seo_description=params.get("seo_description", ""),
        views_count=0,
        created_at=datetime.now(timezone.utc),
    )
    db.add(post)
    await db.flush()
    await db.refresh(post)

    return {
        "message": f"Blog post '{title}' creado exitosamente (ID: {post.id})",
        "data": {"post_id": post.id, "title": title, "status": post.status},
    }


async def _schedule_event(db: AsyncSession, user_id: str, workspace_id: int, params: Dict) -> Dict:
    title = params.get("title", "")
    if not title:
        raise HTTPException(status_code=400, detail="title is required")

    start_str = params.get("start_time")
    if not start_str:
        raise HTTPException(status_code=400, detail="start_time is required (ISO format)")

    try:
        start_time = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid start_time format. Use ISO 8601.")

    end_str = params.get("end_time")
    end_time = None
    if end_str:
        try:
            end_time = datetime.fromisoformat(end_str.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            pass

    event = Calendar_events(
        user_id=user_id,
        workspace_id=workspace_id,
        title=title,
        client_name=params.get("client_name", ""),
        event_type=params.get("event_type", "meeting"),
        start_time=start_time,
        end_time=end_time,
        duration_minutes=params.get("duration_minutes", 60),
        status="scheduled",
        channel=params.get("channel", "video"),
        notes=params.get("notes", "Scheduled by AI agent"),
        created_at=datetime.now(timezone.utc),
    )
    db.add(event)
    await db.flush()
    await db.refresh(event)

    return {
        "message": f"Evento '{title}' programado exitosamente para {start_time.strftime('%Y-%m-%d %H:%M')} (ID: {event.id})",
        "data": {"event_id": event.id, "title": title, "start_time": str(start_time)},
    }