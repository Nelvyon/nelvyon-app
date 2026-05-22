"""Web Push (PWA) API — VAPID subscribe, send, broadcast."""

from __future__ import annotations

import logging
from typing import Optional

from core.secrets import sanitize_text
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import (
    WorkspaceContext,
    require_workspace,
    require_workspace_admin,
    require_workspace_operator,
)
from services.push_service import get_push_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/push", tags=["push"])


class SubscriptionKeys(BaseModel):
    p256dh: str = Field(..., min_length=1)
    auth: str = Field(..., min_length=1)


class SubscribeBody(BaseModel):
    endpoint: str = Field(..., min_length=8)
    keys: SubscriptionKeys
    expirationTime: Optional[int] = None


class SendBody(BaseModel):
    user_id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1, max_length=256)
    body: str = Field(..., min_length=1, max_length=1024)
    url: Optional[str] = Field(None, max_length=2048)
    icon: Optional[str] = Field(None, max_length=2048)


class BroadcastBody(BaseModel):
    title: str = Field(..., min_length=1, max_length=256)
    body: str = Field(..., min_length=1, max_length=1024)
    url: Optional[str] = Field(None, max_length=2048)
    icon: Optional[str] = Field(None, max_length=2048)


def _svc(db: AsyncSession, ws: WorkspaceContext):
    return get_push_service(db, ws.workspace_id)


@router.get("/vapid-public-key")
async def vapid_public_key(
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = _svc(db, ws_ctx)
    return {
        "public_key": svc.get_public_key(),
        "mock": svc.is_mock,
    }


@router.post("/subscribe", status_code=status.HTTP_201_CREATED)
async def subscribe_push(
    body: SubscribeBody,
    request: Request,
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = _svc(db, ws_ctx)
    user_agent = request.headers.get("user-agent")
    try:
        return await svc.subscribe(
            ws_ctx.user_id,
            body.model_dump(),
            user_agent=user_agent,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.delete("/unsubscribe")
async def unsubscribe_push(
    endpoint: str = Query(..., min_length=8),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = _svc(db, ws_ctx)
    try:
        return await svc.unsubscribe(ws_ctx.user_id, endpoint)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.post("/send")
async def send_push(
    body: SendBody,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = _svc(db, ws_ctx)
    try:
        return await svc.send_notification(
            body.user_id,
            body.title,
            body.body,
            url=body.url,
            icon=body.icon,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        logger.error("send_push failed: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to send push notification",
        ) from e


@router.post("/broadcast")
async def broadcast_push(
    body: BroadcastBody,
    ws_ctx: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
):
    svc = _svc(db, ws_ctx)
    try:
        return await svc.send_to_workspace(
            body.title,
            body.body,
            url=body.url,
            icon=body.icon,
        )
    except Exception as e:
        logger.error("broadcast_push failed: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to broadcast push notifications",
        ) from e
