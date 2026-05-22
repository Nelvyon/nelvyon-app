"""GPT-4o premium AI chat API with persistent client context."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from core.secrets import sanitize_text
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from dependencies.workspace import WorkspaceContext, require_workspace
from services.ai_service import get_ai_service, list_agents
from services.cache_service import cached

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai"])

AI_CACHE_TTL = 3600  # 1 hour


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str = Field(..., min_length=1)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    agent_type: str = Field("content_agent", min_length=1)
    model: Optional[str] = Field(None)
    history: List[ChatMessage] = Field(default_factory=list)


class ContextSaveBody(BaseModel):
    key: str = Field(..., min_length=1, max_length=128)
    value: Any = None


def _svc(ws: WorkspaceContext):
    return get_ai_service(ws.workspace_id)


@router.get("/agents")
@cached(ttl=AI_CACHE_TTL, prefix="ai:agents")
async def ai_agents(
    _ws: WorkspaceContext = Depends(require_workspace),
):
    return {"agents": list_agents(), "default_model": "gpt-4o"}


@router.get("/context")
@cached(ttl=AI_CACHE_TTL, prefix="ai:context")
async def get_ai_context(
    ws: WorkspaceContext = Depends(require_workspace),
):
    return await _svc(ws).get_context()


@router.post("/context", status_code=status.HTTP_201_CREATED)
async def save_ai_context(
    body: ContextSaveBody,
    ws: WorkspaceContext = Depends(require_workspace),
):
    try:
        return await _svc(ws).save_context(body.key, body.value)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e


@router.delete("/context")
async def clear_ai_context(
    ws: WorkspaceContext = Depends(require_workspace),
):
    return await _svc(ws).clear_context()


@router.post("/chat")
async def ai_chat_stream(
    body: ChatRequest,
    ws: WorkspaceContext = Depends(require_workspace),
):
    """Chat with GPT-4o + client context (SSE stream)."""
    svc = _svc(ws)
    history = [m.model_dump() for m in body.history]

    async def generate():
        async for chunk in svc.stream_chat_with_context(
            body.message,
            body.agent_type,
            model=body.model or "gpt-4o",
            history=history,
        ):
            yield chunk

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/chat/simple")
async def ai_chat_simple(
    body: ChatRequest,
    ws: WorkspaceContext = Depends(require_workspace),
):
    """Chat with GPT-4o + client context (non-streaming JSON)."""
    try:
        return await _svc(ws).chat_with_context(
            body.message,
            body.agent_type,
            model=body.model or "gpt-4o",
            history=[m.model_dump() for m in body.history],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("ai_chat_simple: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI chat failed",
        ) from e
