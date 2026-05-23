"""NELVYON social media scheduler API."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.social_oauth_service import get_oauth_url, handle_oauth_callback, refresh_token
from services.social_posts import Social_postsService
from services.social_scheduler_service import get_social_scheduler_service

logger = logging.getLogger(__name__)

social_router = APIRouter(prefix="/api/social", tags=["social"])


class CreatePostBody(BaseModel):
    account_ids: list[str] = Field(..., min_length=1)
    content: str = ""
    media_urls: list[str] = Field(default_factory=list)
    scheduled_at: Optional[datetime] = None
    post_type: str = Field(default="text", pattern="^(text|image|video|carousel)$")
    status: Optional[str] = None


class UpdatePostBody(BaseModel):
    content: Optional[str] = None
    media_urls: Optional[list[str]] = None
    account_ids: Optional[list[str]] = None
    scheduled_at: Optional[datetime] = None
    post_type: Optional[str] = None
    status: Optional[str] = None


@social_router.get("/accounts")
async def list_accounts(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = get_social_scheduler_service(db, ws.workspace_id)
    return {"accounts": await svc.get_connected_accounts(ws.workspace_id)}


@social_router.delete("/accounts/{account_id}")
async def disconnect_account(
    account_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_social_scheduler_service(db, ws.workspace_id)
    ok = await svc.disconnect_account(ws.workspace_id, account_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"disconnected": True}


@social_router.post("/posts", status_code=201)
async def create_post(
    body: CreatePostBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_social_scheduler_service(db, ws.workspace_id)
    try:
        post = await svc.create_post(
            ws.workspace_id,
            body.account_ids,
            body.content,
            media_urls=body.media_urls,
            scheduled_at=body.scheduled_at,
            post_type=body.post_type,
            status=body.status,
        )
        return post
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@social_router.get("/posts")
async def list_posts(
    status: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    platform: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = get_social_scheduler_service(db, ws.workspace_id)
    return await svc.get_posts(
        ws.workspace_id,
        status=status,
        date_from=date_from,
        date_to=date_to,
        platform=platform,
        page=page,
        page_size=page_size,
    )


@social_router.get("/posts/{post_id}")
async def get_post(
    post_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = get_social_scheduler_service(db, ws.workspace_id)
    post = await svc.get_post(post_id, ws.workspace_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@social_router.put("/posts/{post_id}")
async def update_post(
    post_id: str,
    body: UpdatePostBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_social_scheduler_service(db, ws.workspace_id)
    existing = await svc.get_post(post_id, ws.workspace_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Post not found")
    updates = body.model_dump(exclude_unset=True)
    try:
        return await svc.update_post(post_id, updates)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@social_router.delete("/posts/{post_id}")
async def delete_post(
    post_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_social_scheduler_service(db, ws.workspace_id)
    existing = await svc.get_post(post_id, ws.workspace_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Post not found")
    await svc.delete_post(post_id)
    return {"deleted": True}


@social_router.post("/posts/{post_id}/publish")
async def publish_post_now(
    post_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_social_scheduler_service(db, ws.workspace_id)
    existing = await svc.get_post(post_id, ws.workspace_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Post not found")
    try:
        return await svc.publish_now(post_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@social_router.get("/calendar")
async def calendar_view(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = get_social_scheduler_service(db, ws.workspace_id)
    return await svc.get_calendar(ws.workspace_id, year, month)


@social_router.get("/analytics/post/{post_id}")
async def post_analytics(
    post_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = get_social_scheduler_service(db, ws.workspace_id)
    existing = await svc.get_post(post_id, ws.workspace_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"analytics": await svc.get_analytics(ws.workspace_id, post_id)}


@social_router.get("/analytics/account/{account_id}")
async def account_analytics(
    account_id: str,
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = get_social_scheduler_service(db, ws.workspace_id)
    try:
        return await svc.get_account_analytics(
            ws.workspace_id, account_id, date_from=date_from, date_to=date_to
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@social_router.post("/media/upload")
async def upload_media(
    file: UploadFile = File(...),
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    mime = file.content_type or "application/octet-stream"
    svc = get_social_scheduler_service(db, ws.workspace_id)
    try:
        return await svc.upload_media(
            ws.workspace_id, data, file.filename or "upload.bin", mime
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@social_router.get("/oauth/{platform}/url")
async def oauth_url(
    platform: str,
    redirect_uri: str = Query(...),
    ws: WorkspaceContext = Depends(require_workspace),
):
    return await get_oauth_url(platform, ws.workspace_id, redirect_uri)


@social_router.get("/oauth/{platform}/callback")
async def oauth_callback(
    platform: str,
    code: str = Query(...),
    state: str = Query(...),
    redirect_uri: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await handle_oauth_callback(db, platform, code, state, redirect_uri)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.warning("OAuth callback error: %s", exc)
        raise HTTPException(
            status_code=400,
            detail="OAuth callback failed. Check platform configuration.",
        ) from exc


@social_router.get("/feed")
async def social_feed(
    limit: int = Query(50, ge=1, le=100),
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Unified feed: scheduler posts + legacy social_posts."""
    scheduler = get_social_scheduler_service(db, ws.workspace_id)
    scheduled = await scheduler.get_posts(ws.workspace_id, page=1, page_size=limit)
    legacy_svc = Social_postsService(db)
    legacy = await legacy_svc.get_list(
        skip=0, limit=limit, user_id=ws.user_id, workspace_id=ws.workspace_id
    )
    posts: list[dict[str, Any]] = []
    for p in scheduled.get("items", []):
        if isinstance(p, dict):
            posts.append({**p, "source": "scheduler"})
    for item in legacy.get("items") or []:
        posts.append(Social_postsService.serialize_post(item))
    posts.sort(key=lambda x: str(x.get("created_at") or x.get("scheduled_at") or ""), reverse=True)
    return {"posts": posts[:limit], "count": len(posts[:limit])}


@social_router.get("/stats/overview")
async def social_stats_overview(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Aggregated social stats across networks."""
    scheduler = get_social_scheduler_service(db, ws.workspace_id)
    accounts = await scheduler.get_connected_accounts(ws.workspace_id)
    legacy_svc = Social_postsService(db)
    legacy_stats = await legacy_svc.get_aggregated_stats(ws.workspace_id, ws.user_id)
    return {
        "connected_accounts": len(accounts),
        "accounts": accounts,
        "legacy_posts": legacy_stats,
        "mentions": [],
    }
