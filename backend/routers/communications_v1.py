"""
CANALES Y COMUNICACIONES NELVYON v1 — minimal real outbound flows (email).

- Signup / access confirmation (explicit send)
- Automatic notices wired from ticket and project creation (see services.communications_v1)
- Simple workspace day summary (read-only)

Voice and mass campaigns are explicitly out of scope for this version.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from models.workspaces import Workspaces
from schemas.auth import UserResponse
from services.communications_v1 import build_workspace_day_summary, send_signup_confirmation_email
from services.email_service import validate_email

router = APIRouter(prefix="/api/v1/communications/v1", tags=["communications-v1"])


class SignupConfirmationRequest(BaseModel):
    to_email: Optional[str] = None
    to_name: Optional[str] = None


class SignupConfirmationResponse(BaseModel):
    email_id: Optional[int] = None
    status: str
    to: str
    message: str


@router.post("/flows/signup-confirmation", response_model=SignupConfirmationResponse)
async def post_signup_confirmation(
    body: SignupConfirmationRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a transactional confirmation that workspace access is active."""
    to_email = (body.to_email or current_user.email or "").strip()
    if not validate_email(to_email):
        return SignupConfirmationResponse(
            email_id=None,
            status="validation_error",
            to=to_email,
            message="Invalid recipient email",
        )
    ws_name = (
        await db.execute(select(Workspaces.name).where(Workspaces.id == ctx.workspace_id))
    ).scalar_one_or_none()
    label = str(ws_name or "Your workspace")
    result = await send_signup_confirmation_email(
        db,
        user_id=str(current_user.id),
        workspace_id=int(ctx.workspace_id),
        to_email=to_email,
        to_name=body.to_name,
        workspace_label=label,
    )
    return SignupConfirmationResponse(
        email_id=result.get("email_id"),
        status=str(result.get("status") or "unknown"),
        to=str(result.get("to") or to_email),
        message=str(result.get("message") or ""),
    )


class CommunicationsSummaryResponse(BaseModel):
    period_utc_date: str
    tickets_created_today: int
    projects_created_today: int
    email: dict
    recent_email_events: list[dict]
    scope_note: str = Field(
        default="Transactional email only for v1. No voice. No mass campaign sends from this surface."
    )


@router.get("/summary", response_model=CommunicationsSummaryResponse)
async def get_communications_summary(
    ctx: WorkspaceContext = Depends(require_workspace),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Read-only snapshot for the active workspace (UTC day window)."""
    payload = await build_workspace_day_summary(
        db,
        workspace_id=int(ctx.workspace_id),
        stats_user_id=str(current_user.id),
    )
    return CommunicationsSummaryResponse(**payload)
