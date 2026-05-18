import json
import logging
from typing import List, Optional

from datetime import datetime, date

from core.secrets import sanitize_text
from fastapi import APIRouter, Body, Depends, HTTPException, Query, Response
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.campaigns import CampaignsService
from dependencies.auth import get_current_user
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from dependencies.quota_guards import (
    enforce_campaign_headroom,
    enforce_campaign_reopen_transition,
)
from services.plan_quota import enforce_campaign_create_quota
from schemas.auth import UserResponse

logger = logging.getLogger(__name__)


def _mark_official_campaign_domain(response: Response):
    """Mark campaigns as the official product domain for Fase 1."""
    response.headers["X-Campaign-Domain"] = "official_campaigns"
    response.headers["X-Campaign-Official-Domain"] = "campaigns"


router = APIRouter(
    prefix="/api/v1/entities/campaigns",
    tags=["campaigns"],
    dependencies=[Depends(_mark_official_campaign_domain)],
)


# ---------- Pydantic Schemas ----------
class CampaignsData(BaseModel):
    workspace_id: int = None
    name: str
    type: str = None
    status: str = None
    subject: str = None
    content: str = None
    recipients_count: int = None
    sent_count: int = None
    open_count: int = None
    click_count: int = None
    reply_count: int = None
    scheduled_at: Optional[datetime] = None
    # E2E relationship fields
    contact_id: int = None
    deal_id: int = None
    project_id: int = None
    client_id: int = None
    created_at: Optional[datetime] = None


class CampaignsUpdateData(BaseModel):
    workspace_id: Optional[int] = None
    name: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    subject: Optional[str] = None
    content: Optional[str] = None
    recipients_count: Optional[int] = None
    sent_count: Optional[int] = None
    open_count: Optional[int] = None
    click_count: Optional[int] = None
    reply_count: Optional[int] = None
    scheduled_at: Optional[datetime] = None
    # E2E relationship fields
    contact_id: Optional[int] = None
    deal_id: Optional[int] = None
    project_id: Optional[int] = None
    client_id: Optional[int] = None


class CampaignsResponse(BaseModel):
    id: int
    user_id: str
    workspace_id: Optional[int] = None
    name: str
    type: Optional[str] = None
    status: Optional[str] = None
    subject: Optional[str] = None
    content: Optional[str] = None
    recipients_count: Optional[int] = None
    sent_count: Optional[int] = None
    open_count: Optional[int] = None
    click_count: Optional[int] = None
    reply_count: Optional[int] = None
    scheduled_at: Optional[datetime] = None
    # E2E relationship fields
    contact_id: Optional[int] = None
    deal_id: Optional[int] = None
    project_id: Optional[int] = None
    client_id: Optional[int] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CampaignsListResponse(BaseModel):
    items: List[CampaignsResponse]
    total: int
    skip: int
    limit: int


class CampaignsBatchCreateRequest(BaseModel):
    items: List[CampaignsData]


class CampaignsBatchUpdateItem(BaseModel):
    id: int
    updates: CampaignsUpdateData


class CampaignsBatchUpdateRequest(BaseModel):
    items: List[CampaignsBatchUpdateItem]


class CampaignsBatchDeleteRequest(BaseModel):
    ids: List[int]


# ---------- Routes (workspace-aware — Sprint 2.5) ----------
@router.get("", response_model=CampaignsListResponse)
async def query_campaigns(
    query: str = Query(None),
    sort: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=2000),
    fields: str = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Query campaigns with workspace isolation."""
    service = CampaignsService(db)
    try:
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")
        result = await service.get_list(
            skip=skip, limit=limit, query_dict=query_dict, sort=sort,
            user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error querying campaigns: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/all", response_model=CampaignsListResponse)
async def query_campaigns_all(
    query: str = Query(None),
    sort: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=2000),
    fields: str = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Query all campaigns within workspace (auth required, workspace-scoped)."""
    service = CampaignsService(db)
    try:
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")
        result = await service.get_list(
            skip=skip, limit=limit, query_dict=query_dict, sort=sort,
            workspace_id=ws_ctx.workspace_id,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error querying campaigns (all): %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{id}", response_model=CampaignsResponse)
async def get_campaigns(
    id: int,
    fields: str = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    service = CampaignsService(db)
    try:
        result = await service.get_by_id(id, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
        if not result:
            raise HTTPException(status_code=404, detail="Campaign not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error fetching campaign %s: %s", id, sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("", response_model=CampaignsResponse, status_code=201)
async def create_campaigns(
    data: CampaignsData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_campaign_create_quota(db, ws_ctx.workspace_id)
    service = CampaignsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create campaign")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Error creating campaign: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=List[CampaignsResponse], status_code=201)
async def create_campaigns_batch(
    request: CampaignsBatchCreateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_campaign_headroom(db, ws_ctx.workspace_id, len(request.items))
    service = CampaignsService(db)
    results = []
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
            if result:
                results.append(result)
        return results
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error("Batch create campaigns: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail="Batch create failed")


@router.put("/batch", response_model=List[CampaignsResponse])
async def update_campaigns_batch(
    request: CampaignsBatchUpdateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = CampaignsService(db)
    results = []
    try:
        for item in request.items:
            existing = await service.get_by_id(item.id, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
            if not existing:
                continue
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            new_status = update_dict["status"] if "status" in update_dict else existing.status
            await enforce_campaign_reopen_transition(
                db, ws_ctx.workspace_id, existing.status, new_status
            )
            result = await service.update(item.id, update_dict, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
            if result:
                results.append(result)
        return results
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error("Batch update campaigns: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail="Batch update failed")


@router.put("/{id}", response_model=CampaignsResponse)
async def update_campaigns(
    id: int,
    data: CampaignsUpdateData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = CampaignsService(db)
    try:
        existing = await service.get_by_id(id, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Campaign not found")
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        new_status = update_dict["status"] if "status" in update_dict else existing.status
        await enforce_campaign_reopen_transition(db, ws_ctx.workspace_id, existing.status, new_status)
        result = await service.update(id, update_dict, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
        if not result:
            raise HTTPException(status_code=404, detail="Campaign not found")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Error updating campaign %s: %s", id, sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/batch")
async def delete_campaigns_batch(
    request: CampaignsBatchDeleteRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = CampaignsService(db)
    deleted_count = 0
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
            if success:
                deleted_count += 1
        return {"message": f"Successfully deleted {deleted_count} campaigns", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error("Batch delete campaigns: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail="Batch delete failed")


@router.delete("/{id}")
async def delete_campaigns(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = CampaignsService(db)
    try:
        success = await service.delete(id, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
        if not success:
            raise HTTPException(status_code=404, detail="Campaign not found")
        return {"message": "Campaign deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error deleting campaign %s: %s", id, sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")