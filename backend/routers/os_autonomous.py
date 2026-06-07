"""Phase D — internal autonomous publish endpoint (controlled staging, never client auto-publish)."""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Union

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace_operator
from services.os_autonomous_publish_service import OsAutonomousPublishService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/os/autonomous", tags=["os_autonomous"])


class OsDeliverableDraftBody(BaseModel):
    type: str = Field(..., min_length=1)
    label: str = Field(..., min_length=1)
    value: str = Field(..., min_length=1)
    visibility: str = "internal"


class OsRefsBody(BaseModel):
    client_id: str = Field(..., min_length=1)
    project_id: str = Field(..., min_length=1)
    project_slug: Optional[str] = None
    workspace_id: Union[str, int]


class HandoffEmailDraftBody(BaseModel):
    subject: str
    body_markdown: str


class OsActionBody(BaseModel):
    entity: str
    action: str
    status: Optional[str] = None
    task_key: Optional[str] = None


class OsPublishPayloadBody(BaseModel):
    dry_run: bool = True
    project_id: str = Field(..., min_length=1)
    os_refs: OsRefsBody
    deliverables: List[OsDeliverableDraftBody] = Field(..., min_length=1)
    qa_score: float
    autonomous_job_id: str = Field(..., min_length=1)
    artifacts: Optional[Dict[str, Any]] = None
    handoff_email_draft: Optional[HandoffEmailDraftBody] = None
    os_actions: Optional[List[OsActionBody]] = None
    note: Optional[str] = None


class CreatedDeliverableResponse(BaseModel):
    id: str
    title: str
    status: str
    visibility: str
    type: Optional[str] = None


class OsAutonomousPublishResponse(BaseModel):
    dry_run: bool
    production_enabled: bool
    written: bool
    qa_score: float
    created: List[CreatedDeliverableResponse] = Field(default_factory=list)
    deliverables_preview: List[Dict[str, Any]] = Field(default_factory=list)
    message: str


@router.post(
    "/publish",
    response_model=OsAutonomousPublishResponse,
    summary="Autonomous OsPublishPayload → os_deliverables (staging only)",
)
async def autonomous_publish(
    body: OsPublishPayloadBody,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
) -> OsAutonomousPublishResponse:
    """
    Controlled internal publish for autonomous pipelines.

    Security defaults:
    - dry_run=true → no DB writes
    - AUTONOMOUS_PRODUCTION=false (default) → blocks non-dry-run writes
    - visibility always forced to internal; status in_review
    - owner/admin/operator only; workspace-scoped FK validation
    """
    service = OsAutonomousPublishService(db)
    payload = body.model_dump()

    try:
        result = await service.publish(
            payload,
            workspace_id=ws_ctx.workspace_id,
            actor_user_id=ws_ctx.user_id,
            actor_email=ws_ctx.user_email,
        )
    except LookupError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="workspace or resource not found",
        )
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        )
    except ValueError as exc:
        msg = str(exc)
        if "not found" in msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=msg,
            )
        if "qa_score" in msg:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=msg,
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg,
        )

    return OsAutonomousPublishResponse(**result)
