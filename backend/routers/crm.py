"""NELVYON CRM API — contacts, deals pipeline, activities, scoring."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.i18n import request_language, t
from core.list_cache import list_cached
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.cache_service import cached
from services.crm_service import CRMService, PIPELINE_STAGES

router = APIRouter(prefix="/api/crm", tags=["crm"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class ContactCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=64)
    company: Optional[str] = Field(None, max_length=255)
    status: str = Field("active", max_length=64)
    tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ContactUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=64)
    company: Optional[str] = Field(None, max_length=255)
    status: Optional[str] = Field(None, max_length=64)
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None
    score: Optional[int] = Field(None, ge=0, le=100)


class DealCreate(BaseModel):
    contact_id: str
    title: str = Field(..., min_length=1, max_length=500)
    value: float = Field(0, ge=0)
    currency: str = Field("EUR", max_length=8)
    stage: str = Field("lead")
    probability: Optional[int] = Field(None, ge=0, le=100)
    close_date: Optional[date] = None
    notes: Optional[str] = None


class DealUpdate(BaseModel):
    contact_id: Optional[str] = None
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    value: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = Field(None, max_length=8)
    stage: Optional[str] = None
    probability: Optional[int] = Field(None, ge=0, le=100)
    close_date: Optional[date] = None
    notes: Optional[str] = None


class DealMoveStage(BaseModel):
    stage: str


class ActivityCreate(BaseModel):
    contact_id: str
    type: str = Field(..., min_length=1, max_length=64)
    description: str = Field(..., min_length=1)
    deal_id: Optional[str] = None
    outcome: Optional[str] = None
    scheduled_at: Optional[datetime] = None


class ActivityUpdate(BaseModel):
    type: Optional[str] = Field(None, min_length=1, max_length=64)
    description: Optional[str] = Field(None, min_length=1)
    deal_id: Optional[str] = None
    outcome: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class ActivityComplete(BaseModel):
    outcome: Optional[str] = None


async def _service(db: AsyncSession, ctx: WorkspaceContext) -> CRMService:
    if ctx.workspace_id is None:
        lang = request_language(None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=t("crm_workspace_required", lang),
        )
    await CRMService.ensure_db()
    return CRMService(db, ctx.workspace_id)


def _handle_value_error(exc: ValueError) -> HTTPException:
    msg = str(exc)
    lang = request_language(None)
    if "not found" in msg.lower():
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("not_found", lang))
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)


# ─── Contacts ─────────────────────────────────────────────────────────────────

@router.post("/contacts", status_code=status.HTTP_201_CREATED)
async def create_contact(
    body: ContactCreate,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = await _service(db, ctx)
    try:
        row = await svc.create_contact(
            name=body.name,
            email=str(body.email) if body.email else None,
            phone=body.phone,
            company=body.company,
            status=body.status,
            tags=body.tags,
            metadata=body.metadata,
        )
        await db.commit()
        return row
    except ValueError as e:
        await db.rollback()
        raise _handle_value_error(e) from e


@router.get("/contacts")
@list_cached("crm:contacts")
async def list_contacts(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = None,
    q: Optional[str] = None,
    ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = await _service(db, ctx)
    try:
        if q and q.strip():
            items = await svc.search_contacts(q.strip(), limit=limit)
            return {"total": len(items), "items": items, "skip": 0, "limit": limit, "q": q.strip()}
        return await svc.list_contacts(skip=skip, limit=limit, status=status)
    except ValueError as e:
        raise _handle_value_error(e) from e


@router.get("/contacts/{contact_id}")
async def get_contact(
    contact_id: str,
    ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = await _service(db, ctx)
    try:
        return await svc.get_contact_by_id(contact_id)
    except ValueError as e:
        raise _handle_value_error(e) from e


@router.patch("/contacts/{contact_id}")
async def update_contact(
    contact_id: str,
    body: ContactUpdate,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = await _service(db, ctx)
    try:
        row = await svc.update_contact(contact_id, **body.model_dump(exclude_unset=True))
        await db.commit()
        return row
    except ValueError as e:
        await db.rollback()
        raise _handle_value_error(e) from e


@router.delete("/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(
    contact_id: str,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = await _service(db, ctx)
    try:
        deleted = await svc.delete_contact(contact_id)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
        await db.commit()
    except ValueError as e:
        await db.rollback()
        raise _handle_value_error(e) from e


@router.post("/contacts/{contact_id}/score")
async def recalculate_contact_score(
    contact_id: str,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = await _service(db, ctx)
    try:
        result = await svc.recalculate_contact_score(contact_id)
        await db.commit()
        return result
    except ValueError as e:
        await db.rollback()
        raise _handle_value_error(e) from e


# ─── Deals ────────────────────────────────────────────────────────────────────

@router.post("/deals", status_code=status.HTTP_201_CREATED)
async def create_deal(
    body: DealCreate,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = await _service(db, ctx)
    try:
        row = await svc.create_deal(**body.model_dump())
        await db.commit()
        return row
    except ValueError as e:
        await db.rollback()
        raise _handle_value_error(e) from e


@router.get("/deals")
@list_cached("crm:deals")
async def list_deals(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    stage: Optional[str] = None,
    contact_id: Optional[str] = None,
    ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = await _service(db, ctx)
    try:
        return await svc.list_deals(skip=skip, limit=limit, stage=stage, contact_id=contact_id)
    except ValueError as e:
        raise _handle_value_error(e) from e


@router.get("/deals/{deal_id}")
async def get_deal(
    deal_id: str,
    ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = await _service(db, ctx)
    try:
        return await svc.get_deal_by_id(deal_id)
    except ValueError as e:
        raise _handle_value_error(e) from e


@router.patch("/deals/{deal_id}")
async def update_deal(
    deal_id: str,
    body: DealUpdate,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = await _service(db, ctx)
    try:
        row = await svc.update_deal(deal_id, **body.model_dump(exclude_unset=True))
        await db.commit()
        return row
    except ValueError as e:
        await db.rollback()
        raise _handle_value_error(e) from e


@router.post("/deals/{deal_id}/move-stage")
async def move_deal_stage(
    deal_id: str,
    body: DealMoveStage,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = await _service(db, ctx)
    try:
        row = await svc.move_stage(deal_id, body.stage)
        await db.commit()
        return row
    except ValueError as e:
        await db.rollback()
        raise _handle_value_error(e) from e


@router.delete("/deals/{deal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deal(
    deal_id: str,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = await _service(db, ctx)
    try:
        deleted = await svc.delete_deal(deal_id)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deal not found")
        await db.commit()
    except ValueError as e:
        await db.rollback()
        raise _handle_value_error(e) from e


# ─── Activities ───────────────────────────────────────────────────────────────

@router.post("/activities", status_code=status.HTTP_201_CREATED)
async def create_activity(
    body: ActivityCreate,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = await _service(db, ctx)
    try:
        row = await svc.create_activity(**body.model_dump())
        await db.commit()
        return row
    except ValueError as e:
        await db.rollback()
        raise _handle_value_error(e) from e


@router.get("/activities")
@list_cached("crm:activities")
async def list_activities(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    contact_id: Optional[str] = None,
    deal_id: Optional[str] = None,
    ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = await _service(db, ctx)
    return await svc.list_activities(skip=skip, limit=limit, contact_id=contact_id, deal_id=deal_id)


@router.get("/activities/{activity_id}")
async def get_activity(
    activity_id: str,
    ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = await _service(db, ctx)
    try:
        return await svc.get_activity_by_id(activity_id)
    except ValueError as e:
        raise _handle_value_error(e) from e


@router.patch("/activities/{activity_id}")
async def update_activity(
    activity_id: str,
    body: ActivityUpdate,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = await _service(db, ctx)
    try:
        row = await svc.update_activity(activity_id, **body.model_dump(exclude_unset=True))
        await db.commit()
        return row
    except ValueError as e:
        await db.rollback()
        raise _handle_value_error(e) from e


@router.post("/activities/{activity_id}/complete")
async def complete_activity(
    activity_id: str,
    body: ActivityComplete,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = await _service(db, ctx)
    try:
        row = await svc.complete_activity(activity_id, outcome=body.outcome)
        await db.commit()
        return row
    except ValueError as e:
        await db.rollback()
        raise _handle_value_error(e) from e


@router.delete("/activities/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_activity(
    activity_id: str,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = await _service(db, ctx)
    try:
        deleted = await svc.delete_activity(activity_id)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
        await db.commit()
    except ValueError as e:
        await db.rollback()
        raise _handle_value_error(e) from e


# ─── Pipeline & stats ─────────────────────────────────────────────────────────

@router.get("/pipeline")
async def pipeline_view(
    ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = await _service(db, ctx)
    return await svc.get_pipeline_view()


@router.get("/stats")
@cached(ttl=120, prefix="crm:stats")
async def crm_stats(
    ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = await _service(db, ctx)
    return await svc.get_stats()


@router.get("/stages")
async def list_stages():
    return {"stages": list(PIPELINE_STAGES)}
