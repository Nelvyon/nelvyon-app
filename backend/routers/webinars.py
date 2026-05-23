"""NELVYON Webinars API."""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.list_cache import list_cached
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.webinar_service import WebinarService, get_webinar_service

logger = logging.getLogger(__name__)

webinar_router = APIRouter(prefix="/api/webinars", tags=["webinars"])
router = webinar_router


class CreateWebinarBody(BaseModel):
    title: str = Field(..., min_length=1)
    description: str = ""
    scheduled_at: Optional[str] = None
    duration_minutes: int = Field(default=60, ge=1)
    host_name: str = ""
    thumbnail_url: Optional[str] = None
    is_free: bool = True
    price_cents: int = Field(default=0, ge=0)
    max_attendees: Optional[int] = Field(default=None, ge=1)
    idioma: str = "es"


class UpdateWebinarBody(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_at: Optional[str] = None
    duration_minutes: Optional[int] = Field(None, ge=1)
    host_name: Optional[str] = None
    thumbnail_url: Optional[str] = None
    is_free: Optional[bool] = None
    price_cents: Optional[int] = Field(None, ge=0)
    max_attendees: Optional[int] = Field(None, ge=1)
    idioma: Optional[str] = None


class RegisterBody(BaseModel):
    email: str = Field(..., min_length=3)
    name: str = ""
    payment_intent_id: Optional[str] = None
    checkout_session_id: Optional[str] = None
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


class EndWebinarBody(BaseModel):
    recording_url: Optional[str] = None


class ChatBody(BaseModel):
    email: str = Field(..., min_length=3)
    name: str = ""
    message: str = Field(..., min_length=1, max_length=2000)


class JoinBody(BaseModel):
    email: str = Field(..., min_length=3)


def _svc(db: AsyncSession, ws: WorkspaceContext | None = None) -> WebinarService:
    return get_webinar_service(db, ws.workspace_id if ws else None)


@webinar_router.get("/public/list")
@list_cached("webinars:public")
async def public_list(db: AsyncSession = Depends(get_db)):
    await WebinarService.ensure_schema()
    items = await get_webinar_service(db).list_public_webinars()
    return {"items": items}


@webinar_router.get("/public/{slug}")
async def public_detail(slug: str, db: AsyncSession = Depends(get_db)):
    await WebinarService.ensure_schema()
    try:
        return await get_webinar_service(db).get_public_webinar(slug)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@webinar_router.post("/{webinar_id}/register")
async def register(webinar_id: str, body: RegisterBody, db: AsyncSession = Depends(get_db)):
    await WebinarService.ensure_schema()
    svc = get_webinar_service(db)
    try:
        if body.success_url and body.cancel_url and not body.payment_intent_id and not body.checkout_session_id:
            wb = await svc.get_webinar(webinar_id)
            if not bool(wb.get("is_free")) and int(wb.get("price_cents") or 0) > 0:
                checkout = await svc.create_checkout_session(
                    webinar_id, body.email, body.name, body.success_url, body.cancel_url
                )
                if checkout.get("checkout_url"):
                    return checkout
        return await svc.register_attendee(
            webinar_id,
            body.email,
            body.name,
            body.payment_intent_id,
            body.checkout_session_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@webinar_router.get("/public/{slug}/chat")
async def public_chat(slug: str, since: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    await WebinarService.ensure_schema()
    try:
        items = await get_webinar_service(db).get_chat_messages(slug, since)
        return {"items": items}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@webinar_router.post("/public/{slug}/chat")
async def public_chat_post(slug: str, body: ChatBody, db: AsyncSession = Depends(get_db)):
    await WebinarService.ensure_schema()
    try:
        return await get_webinar_service(db).post_chat_message(slug, body.email, body.name, body.message)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@webinar_router.post("/public/{slug}/join")
async def public_join(slug: str, body: JoinBody, db: AsyncSession = Depends(get_db)):
    await WebinarService.ensure_schema()
    svc = get_webinar_service(db)
    try:
        wb = await svc.get_public_webinar(slug)
        return await svc.mark_attended(str(wb["id"]), body.email)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@webinar_router.post("", status_code=201)
async def create_webinar(
    body: CreateWebinarBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await WebinarService.ensure_schema()
    return await _svc(db, ws).create_webinar(ws.workspace_id, **body.model_dump())


@webinar_router.get("")
@list_cached("webinars")
async def list_webinars(ws: WorkspaceContext = Depends(require_workspace), db: AsyncSession = Depends(get_db)):
    await WebinarService.ensure_schema()
    items = await _svc(db, ws).list_webinars(ws.workspace_id)
    summary = await _svc(db, ws).get_workspace_summary(ws.workspace_id)
    return {"items": items, "summary": summary}


@webinar_router.get("/{webinar_id}")
async def get_webinar(
    webinar_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    await WebinarService.ensure_schema()
    try:
        return await _svc(db, ws).get_webinar(webinar_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@webinar_router.put("/{webinar_id}")
async def update_webinar(
    webinar_id: str,
    body: UpdateWebinarBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await WebinarService.ensure_schema()
    try:
        return await _svc(db, ws).update_webinar(webinar_id, **body.model_dump(exclude_unset=True))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@webinar_router.delete("/{webinar_id}")
async def delete_webinar(
    webinar_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await WebinarService.ensure_schema()
    ok = await _svc(db, ws).delete_webinar(webinar_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Webinar not found")
    return {"ok": True}


@webinar_router.post("/{webinar_id}/publish")
async def publish_webinar(
    webinar_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await WebinarService.ensure_schema()
    try:
        return await _svc(db, ws).publish_webinar(webinar_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@webinar_router.post("/{webinar_id}/start")
async def start_webinar(
    webinar_id: str,
    request: Request,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await WebinarService.ensure_schema()
    base = str(request.base_url).rstrip("/")
    try:
        return await _svc(db, ws).start_webinar(webinar_id, base)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@webinar_router.post("/{webinar_id}/end")
async def end_webinar(
    webinar_id: str,
    body: EndWebinarBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await WebinarService.ensure_schema()
    try:
        return await _svc(db, ws).end_webinar(webinar_id, body.recording_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@webinar_router.post("/{webinar_id}/reminder")
async def send_reminder(
    webinar_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await WebinarService.ensure_schema()
    try:
        return await _svc(db, ws).send_reminder(webinar_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@webinar_router.get("/{webinar_id}/stats")
async def webinar_stats(
    webinar_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    await WebinarService.ensure_schema()
    try:
        return await _svc(db, ws).get_stats(webinar_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
