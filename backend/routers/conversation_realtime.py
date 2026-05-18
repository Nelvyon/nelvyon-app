"""
Conversation Realtime Router — Send messages, get message history, SSE stream.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from routers.crm_http_helpers import raise_internal
from dependencies.quota_guards import enforce_helpdesk_module_allowed
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.conversation_realtime import ConversationRealtimeService, sse_stream

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/conversations", tags=["conversations-realtime"])


class SendMessageRequest(BaseModel):
    content: str
    sender_type: str = "agent"
    sender_name: Optional[str] = None


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_type: Optional[str] = None
    sender_name: Optional[str] = None
    content: str
    channel: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[str] = None


class StreamTokenResponse(BaseModel):
    stream_token: str
    expires_in_seconds: int


@router.post("/{conversation_id}/messages", response_model=MessageResponse)
async def send_message(
    conversation_id: int,
    data: SendMessageRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Send a message in a conversation (creates record + notifies SSE)."""
    await enforce_helpdesk_module_allowed(db, ws_ctx.workspace_id)
    service = ConversationRealtimeService(db)
    try:
        result = await service.send_message(
            conversation_id=conversation_id,
            user_id=ws_ctx.user_id,
            workspace_id=ws_ctx.workspace_id,
            content=data.content,
            sender_type=data.sender_type,
            sender_name=data.sender_name or "Agente",
        )
        return MessageResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise_internal(logger, "inbox realtime send_message", e)


@router.get("/{conversation_id}/messages")
async def get_messages(
    conversation_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get message history for a conversation."""
    service = ConversationRealtimeService(db)
    try:
        return await service.get_messages(
            conversation_id=conversation_id,
            user_id=ws_ctx.user_id,
            workspace_id=ws_ctx.workspace_id,
            skip=skip,
            limit=limit,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{conversation_id}/mark-read")
async def mark_read(
    conversation_id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Mark conversation as read (reset unread count)."""
    await enforce_helpdesk_module_allowed(db, ws_ctx.workspace_id)
    service = ConversationRealtimeService(db)
    success = await service.mark_read(
        conversation_id=conversation_id,
        user_id=ws_ctx.user_id,
        workspace_id=ws_ctx.workspace_id,
    )
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"status": "ok"}


@router.post("/{conversation_id}/stream-token", response_model=StreamTokenResponse)
async def create_stream_token(
    conversation_id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Mint short-lived token for EventSource stream auth."""
    await enforce_helpdesk_module_allowed(db, ws_ctx.workspace_id)
    service = ConversationRealtimeService(db)
    try:
        token_data = await service.create_stream_token(
            conversation_id=conversation_id,
            user_id=ws_ctx.user_id,
            workspace_id=ws_ctx.workspace_id,
        )
        return StreamTokenResponse(**token_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{conversation_id}/stream")
async def stream_messages(
    conversation_id: int,
    stream_token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    SSE endpoint for real-time message streaming.
    Auth via short-lived signed stream_token query param.
    Hardening next (C1-5+): optional Origin allowlist validation per environment.
    """
    if not stream_token:
        raise HTTPException(status_code=401, detail="Stream token is required")

    service = ConversationRealtimeService(db)
    try:
        await service.verify_stream_token(
            conversation_id=conversation_id,
            stream_token=stream_token,
        )
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    return StreamingResponse(
        sse_stream(conversation_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )