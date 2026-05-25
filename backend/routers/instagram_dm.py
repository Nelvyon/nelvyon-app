"""F63 — Instagram DM webhook + dashboard API."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.instagram_dm_service import get_instagram_dm_service

router = APIRouter(prefix="/api/instagram-dm", tags=["instagram-dm"])


class SendDMBody(BaseModel):
    recipient_id: str = Field(..., min_length=1)
    text: str = Field(..., min_length=1, max_length=2000)
    conversation_id: str | None = None


class BotToggleBody(BaseModel):
    enabled: bool


@router.get("/webhook")
async def verify_webhook(
    hub_mode: str | None = Query(None, alias="hub.mode"),
    hub_verify_token: str | None = Query(None, alias="hub.verify_token"),
    hub_challenge: str | None = Query(None, alias="hub.challenge"),
    db: AsyncSession = Depends(get_db),
):
    svc = get_instagram_dm_service(db, 1)
    challenge = svc.verify_webhook(hub_mode, hub_verify_token, hub_challenge)
    if challenge is None:
        raise HTTPException(status_code=403, detail="Verification failed")
    return PlainTextResponse(challenge)


@router.post("/webhook")
async def receive_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    payload = await request.json()
    return await get_instagram_dm_service(db, 1).handle_webhook(payload)


@router.get("/conversations")
async def list_conversations(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_instagram_dm_service(db, ws.workspace_id).list_conversations()


@router.post("/send")
async def send_dm(
    body: SendDMBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await get_instagram_dm_service(db, ws.workspace_id).send_message(
            body.recipient_id, body.text, conversation_id=body.conversation_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/conversations/{conversation_id}/bot")
async def toggle_bot(
    conversation_id: str,
    body: BotToggleBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    return await get_instagram_dm_service(db, ws.workspace_id).set_bot_enabled(
        conversation_id, body.enabled
    )
