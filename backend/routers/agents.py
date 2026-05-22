"""
Agent streaming — real-time SSE output from OpenAI-compatible chat completions.
"""

import json
import logging
import os
from typing import Any, AsyncGenerator, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI

from core.config import settings
from dependencies.workspace import WorkspaceContext, require_workspace
from schemas.agents import AgentStreamRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/agents", tags=["agents"])

_DEFAULT_MODEL = "gpt-4o"


def _openai_client() -> AsyncOpenAI:
    if not settings.app_ai_base_url or not settings.app_ai_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service not configured. Set APP_AI_BASE_URL and APP_AI_KEY.",
        )
    return AsyncOpenAI(
        api_key=settings.app_ai_key,
        base_url=settings.app_ai_base_url.rstrip("/"),
    )


def _resolve_model(request: AgentStreamRequest) -> str:
    if request.model and request.model.strip():
        return request.model.strip()
    env_model = os.environ.get("APP_AI_MODEL", "").strip()
    return env_model or _DEFAULT_MODEL


def _build_messages(request: AgentStreamRequest) -> List[Dict[str, Any]]:
    messages: List[Dict[str, Any]] = list(request.messages)
    if request.client_context:
        context_line = json.dumps(request.client_context, ensure_ascii=False, default=str)
        messages.insert(
            0,
            {
                "role": "system",
                "content": f"Client context (service_id={request.service_id or 'default'}): {context_line}",
            },
        )
    elif request.service_id:
        messages.insert(
            0,
            {"role": "system", "content": f"NELVYON agent service_id: {request.service_id}"},
        )
    return messages


@router.post("/stream")
async def stream_agent(
    request: AgentStreamRequest,
    _ctx: WorkspaceContext = Depends(require_workspace),
):
    """Stream agent LLM output as Server-Sent Events (data: {json}\\n\\n, terminal [DONE])."""
    client = _openai_client()
    model = _resolve_model(request)
    messages = _build_messages(request)

    async def generate() -> AsyncGenerator[str, None]:
        try:
            stream = await client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True,
            )
            async for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta.content
                if delta:
                    yield f"data: {json.dumps({'content': delta})}\n\n"
        except Exception as e:
            logger.warning("Agent stream error: %s", e)
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
