"""
Helpdesk SLA Router — SLA monitoring, ticket lifecycle, and notification endpoints.

Provides:
- POST /transition       → Transition ticket status with validation
- GET  /sla-breaches     → Check SLA breaches across open tickets
- GET  /sla-targets      → Get SLA target definitions
- GET  /ticket-flow      → Get allowed ticket status transitions
- POST /assign           → Assign ticket and trigger notification
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.quota_guards import enforce_helpdesk_module_allowed
from dependencies.workspace import (
    WorkspaceContext,
    require_workspace,
    require_workspace_operator,
)
from services.helpdesk_notifications import (
    HelpdeskNotificationService,
    SLA_TARGETS,
    VALID_TICKET_TRANSITIONS,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/helpdesk", tags=["helpdesk-sla"])


# ─── Schemas ───

class TransitionRequest(BaseModel):
    ticket_id: int
    new_status: str
    resolution_notes: str = ""


class AssignRequest(BaseModel):
    ticket_id: int
    assigned_to: str


class TransitionResponse(BaseModel):
    ticket_id: int
    previous_status: Optional[str] = None
    new_status: str
    allowed_next_statuses: List[str] = []
    resolved_at: Optional[str] = None
    resolution_minutes: Optional[int] = None
    notification_queued: Optional[bool] = None


class SLABreachItem(BaseModel):
    ticket_id: int
    subject: Optional[str] = None
    type: str
    priority: str
    target_minutes: int
    elapsed_minutes: int


class SLABreachResponse(BaseModel):
    total_open_tickets: int
    breaches: List[SLABreachItem]
    warnings: List[SLABreachItem]
    breach_count: int
    warning_count: int
    checked_at: str


# ─── Endpoints ───

@router.post("/transition", response_model=TransitionResponse)
async def transition_ticket(
    data: TransitionRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Transition a ticket status with validation and notifications."""
    await enforce_helpdesk_module_allowed(db, ws_ctx.workspace_id)
    service = HelpdeskNotificationService(db)
    try:
        result = await service.transition_ticket(
            ticket_id=data.ticket_id,
            user_id=ws_ctx.user_id,
            workspace_id=ws_ctx.workspace_id,
            new_status=data.new_status,
            resolution_notes=data.resolution_notes,
        )
        return TransitionResponse(**result)
    except ValueError as e:
        detail = str(e)
        if "not found" in detail.lower():
            raise HTTPException(status_code=404, detail=detail)
        raise HTTPException(status_code=400, detail=detail)
    except Exception:
        logger.error(
            "helpdesk transition failed ticket_id=%s",
            data.ticket_id,
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Failed to transition ticket")


@router.post("/assign")
async def assign_ticket(
    data: AssignRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Assign a ticket to a team member and trigger notification."""
    await enforce_helpdesk_module_allowed(db, ws_ctx.workspace_id)
    service = HelpdeskNotificationService(db)
    try:
        result = await service.on_ticket_assigned(
            ticket_id=data.ticket_id,
            user_id=ws_ctx.user_id,
            workspace_id=ws_ctx.workspace_id,
            assigned_to=data.assigned_to,
        )
        return result
    except ValueError as e:
        detail = str(e)
        if "not found" in detail.lower():
            raise HTTPException(status_code=404, detail=detail)
        raise HTTPException(status_code=400, detail=detail)
    except Exception:
        logger.error(
            "helpdesk assign failed ticket_id=%s",
            data.ticket_id,
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Failed to assign ticket")


@router.get("/sla-breaches", response_model=SLABreachResponse)
async def check_sla_breaches(
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Check for SLA breaches across all open tickets."""
    await enforce_helpdesk_module_allowed(db, ws_ctx.workspace_id)
    service = HelpdeskNotificationService(db)
    result = await service.check_sla_breaches(
        user_id=ws_ctx.user_id,
        workspace_id=ws_ctx.workspace_id,
    )
    return SLABreachResponse(**result)


@router.get("/sla-targets")
async def get_sla_targets(ws_ctx: WorkspaceContext = Depends(require_workspace)):
    """Get SLA target definitions by priority (authenticated, workspace-scoped reference)."""
    assert ws_ctx.workspace_id is not None
    return {
        "targets": SLA_TARGETS,
        "description": {
            "first_response": "Maximum minutes until first agent response",
            "resolution": "Maximum minutes until ticket is resolved",
        },
        "priorities": ["urgent", "high", "medium", "low"],
    }


@router.get("/ticket-flow")
async def get_ticket_flow(ws_ctx: WorkspaceContext = Depends(require_workspace)):
    """Get the complete ticket status flow diagram (authenticated, workspace context)."""
    assert ws_ctx.workspace_id is not None
    return {
        "transitions": VALID_TICKET_TRANSITIONS,
        "initial_state": "open",
        "terminal_states": ["closed"],
        "description": {
            "open": "Ticket is open and awaiting first response",
            "in_progress": "Ticket is being worked on by an agent",
            "waiting": "Ticket is waiting for customer response or external input",
            "resolved": "Ticket has been resolved (can be reopened)",
            "closed": "Ticket is closed (can be reopened)",
        },
    }