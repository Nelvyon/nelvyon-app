"""
Campaign Sender Router — Send campaigns to contacts, preview recipients, get stats.
"""

import logging
from typing import Optional

from core.secrets import safe_client_error_detail, sanitize_text
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.audit_events import write_audit_event
from services.campaign_sender import CampaignSenderService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/campaign-sender", tags=["campaign-sender"])


class SegmentFilters(BaseModel):
    status: Optional[str] = None
    tags: Optional[str] = None
    source: Optional[str] = None
    score_min: Optional[int] = Field(default=None)
    score_max: Optional[int] = Field(default=None)


class SendCampaignRequest(BaseModel):
    campaign_id: int
    segment_filters: Optional[SegmentFilters] = None


class SendCampaignResponse(BaseModel):
    campaign_id: int
    status: str
    recipients_count: int = 0
    sent_count: int = 0
    failed_count: int = 0
    sendgrid_configured: bool = False
    applied_filters: Optional[dict] = None
    error: Optional[str] = None


@router.post("/send", response_model=SendCampaignResponse)
async def send_campaign(
    data: SendCampaignRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Send a campaign to all user contacts with email."""
    service = CampaignSenderService(db)
    try:
        segment_filters = data.segment_filters.model_dump() if data.segment_filters else None
        result = await service.send_campaign(
            data.campaign_id,
            ws_ctx.user_id,
            ws_ctx.workspace_id,
            segment_filters=segment_filters,
        )
        await write_audit_event(
            db,
            actor_user_id=ws_ctx.user_id,
            actor_email=ws_ctx.user_email,
            workspace_id=ws_ctx.workspace_id,
            action="send",
            resource_type="campaign",
            resource_id=str(data.campaign_id),
            result="ok",
            event_type="saas.campaign.send",
            commit=True,
        )
        return SendCampaignResponse(**{k: v for k, v in result.items() if k in SendCampaignResponse.model_fields})
    except ValueError as e:
        await write_audit_event(
            db,
            actor_user_id=ws_ctx.user_id,
            actor_email=ws_ctx.user_email,
            workspace_id=ws_ctx.workspace_id,
            action="send",
            resource_type="campaign",
            resource_id=str(data.campaign_id),
            result="error",
            event_type="saas.campaign.send",
            commit=True,
        )
        raise HTTPException(status_code=400, detail=safe_client_error_detail(e, fallback="Invalid campaign request"))
    except Exception as e:
        await write_audit_event(
            db,
            actor_user_id=ws_ctx.user_id,
            actor_email=ws_ctx.user_email,
            workspace_id=ws_ctx.workspace_id,
            action="send",
            resource_type="campaign",
            resource_id=str(data.campaign_id),
            result="error",
            event_type="saas.campaign.send",
            commit=True,
        )
        logger.error("Error sending campaign: %s", sanitize_text(str(e)))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/preview-recipients")
async def preview_recipients(
    status: Optional[str] = Query(None),
    tags: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    score_min: Optional[int] = Query(None),
    score_max: Optional[int] = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Preview how many contacts will receive the campaign."""
    service = CampaignSenderService(db)
    return await service.preview_recipients(
        ws_ctx.user_id,
        ws_ctx.workspace_id,
        segment_filters={
            "status": status,
            "tags": tags,
            "source": source,
            "score_min": score_min,
            "score_max": score_max,
        },
    )


@router.get("/stats/{campaign_id}")
async def get_campaign_stats(
    campaign_id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed sending stats for a campaign."""
    service = CampaignSenderService(db)
    try:
        return await service.get_campaign_stats(campaign_id, ws_ctx.user_id, ws_ctx.workspace_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=safe_client_error_detail(e, fallback="Campaign not found"))