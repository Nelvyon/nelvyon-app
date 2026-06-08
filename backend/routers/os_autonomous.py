"""Phase D — internal autonomous publish endpoint (controlled staging, never client auto-publish)."""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Union

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace_operator
from services.os_autonomous_publish_service import OsAutonomousPublishService
from services.os_autonomous_learning_service import OsAutonomousLearningService

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
    sector: Optional[str] = None
    sku: Optional[str] = None
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


class LearningTemplateItem(BaseModel):
    template_id: str
    sector: str
    service: str
    category: str
    rank_position: int
    final_template_score: float
    conversion_score: float
    quality_score: float
    sample_size: int
    qa_score: float
    conversion_rate: Optional[float] = None
    lead_count: int = 0
    approved_by_client: bool = False
    approved_by_client_rate: float = 0
    revisions_count: float = 0
    cold_start: bool = False


class LearningGroupItem(BaseModel):
    sector: Optional[str] = None
    service: Optional[str] = None
    templates_count: int
    top_template_id: str
    top_final_score: float
    avg_conversion_score: float
    templates: List[LearningTemplateItem] = Field(default_factory=list)


class LearningTrendPoint(BaseModel):
    date: str
    outcomes_count: int
    conversion_rate_avg: Optional[float] = None
    lead_count_total: int = 0


class Ga4DashboardStatus(BaseModel):
    mode: str
    real_enabled: bool
    mock_realistic: bool
    property_configured: bool
    credentials_configured: bool
    message: str


class LearningAlertItem(BaseModel):
    id: str
    type: str
    severity: str
    template_id: Optional[str] = None
    sector: Optional[str] = None
    service: Optional[str] = None
    message: str
    value: Optional[float] = None
    threshold: Optional[float] = None
    previous_value: Optional[float] = None
    at: str


class LearningRefreshStatus(BaseModel):
    computed_at: Optional[str] = None
    source: Optional[str] = None
    steps_completed: List[str] = Field(default_factory=list)
    success: Optional[bool] = None
    storage_mode: Optional[str] = None
    alerts_count: Optional[int] = None
    exports: List[str] = Field(default_factory=list)


class OsAutonomousLearningResponse(BaseModel):
    computed_at: Optional[str] = None
    storage_mode: str
    ga4: Ga4DashboardStatus
    outcomes_count: int
    enriched_count: int = 0
    autonomy_pct: Optional[int] = None
    top_templates: List[LearningTemplateItem] = Field(default_factory=list)
    by_sector: List[LearningGroupItem] = Field(default_factory=list)
    by_service: List[LearningGroupItem] = Field(default_factory=list)
    trend_30d: List[LearningTrendPoint] = Field(default_factory=list)
    has_rankings_file: bool = False
    alerts: List[LearningAlertItem] = Field(default_factory=list)
    alerts_count: int = 0
    refresh_status: Optional[LearningRefreshStatus] = None
    exports_available: Dict[str, bool] = Field(default_factory=dict)


@router.get(
    "/learning",
    response_model=OsAutonomousLearningResponse,
    summary="Internal Learning Engine dashboard (operator+ only)",
)
async def autonomous_learning_dashboard(
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
) -> OsAutonomousLearningResponse:
    """
    Read-only learning rankings for internal OS operators.

    Data sources: template_outcomes (DB when flagged) or local-outcomes.json + rankings.json.
    No client PII, no GA4 secrets.
    """
    if ws_ctx.workspace_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Workspace-Id header required",
        )
    service = OsAutonomousLearningService(db)
    payload = await service.get_dashboard(ws_ctx.workspace_id)
    return OsAutonomousLearningResponse(**payload)


@router.get(
    "/learning/export/{export_key}",
    summary="Download learning CSV export (operator+ only)",
)
async def autonomous_learning_export(
    export_key: str,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    if ws_ctx.workspace_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Workspace-Id header required",
        )
    allowed = {"rankings", "outcomes", "sector_summary"}
    if export_key not in allowed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="export not found")

    service = OsAutonomousLearningService(db)
    path = service.get_export_path(export_key)
    if not path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="export file not generated — run autonomous:learning-refresh",
        )
    return FileResponse(
        path,
        media_type="text/csv",
        filename=f"{export_key}.csv",
    )


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
