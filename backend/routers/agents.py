"""
Agent streaming — real-time SSE output from OpenAI-compatible chat completions.
"""

import json
import logging
import os
from typing import Any, AsyncGenerator, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI

from core.config import settings
from dependencies.workspace import WorkspaceContext, require_workspace
from schemas.agents import AgentStreamRequest
from services import memory_service

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


def _resolve_client_id(request: AgentStreamRequest) -> str:
    if request.client_id and str(request.client_id).strip():
        return str(request.client_id).strip()
    ctx = request.client_context or {}
    for key in ("client_id", "clientId", "user_id", "userId", "tenant_id", "tenantId"):
        val = ctx.get(key)
        if val is not None and str(val).strip():
            return str(val).strip()
    return "default"


def _extract_user_query(messages: List[Dict[str, Any]]) -> str:
    for msg in reversed(messages):
        if msg.get("role") != "user":
            continue
        content = msg.get("content")
        if isinstance(content, str) and content.strip():
            return content.strip()
        if isinstance(content, list):
            parts: List[str] = []
            for part in content:
                if isinstance(part, dict) and part.get("type") == "text":
                    text_val = part.get("text")
                    if text_val:
                        parts.append(str(text_val))
            if parts:
                return "\n".join(parts).strip()
    return ""


def _build_messages(
    request: AgentStreamRequest,
    memory_context: Optional[str] = None,
) -> List[Dict[str, Any]]:
    messages: List[Dict[str, Any]] = list(request.messages)

    system_parts: List[str] = []
    if memory_context and memory_context.strip():
        system_parts.append(f"Contexto del cliente: {memory_context.strip()}")

    if request.client_context:
        context_line = json.dumps(request.client_context, ensure_ascii=False, default=str)
        system_parts.append(f"Client context (service_id={request.service_id or 'default'}): {context_line}")
    elif request.service_id:
        system_parts.append(f"NELVYON agent service_id: {request.service_id}")

    if system_parts:
        messages.insert(0, {"role": "system", "content": "\n\n".join(system_parts)})

    return messages


@router.post("/stream")
async def stream_agent(
    request: AgentStreamRequest,
    ctx: WorkspaceContext = Depends(require_workspace),
):
    """Stream agent LLM output as Server-Sent Events (data: {json}\\n\\n, terminal [DONE])."""
    client = _openai_client()
    model = _resolve_model(request)
    client_id = _resolve_client_id(request)
    user_query = _extract_user_query(request.messages)

    relevant_memories = await memory_service.search_memory(
        ctx.workspace_id,
        client_id,
        user_query or "contexto del cliente",
        limit=5,
    )
    memory_prompt = memory_service.format_relevant_memories(relevant_memories)
    messages = _build_messages(request, memory_context=memory_prompt)

    async def generate() -> AsyncGenerator[str, None]:
        assistant_parts: List[str] = []
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
                    assistant_parts.append(delta)
                    yield f"data: {json.dumps({'content': delta})}\n\n"
        except Exception as e:
            logger.warning("Agent stream error: %s", e)
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            assistant_text = "".join(assistant_parts).strip()
            if user_query or assistant_text:
                interaction = ""
                if user_query:
                    interaction += f"Usuario: {user_query}\n"
                if assistant_text:
                    interaction += f"Asistente: {assistant_text}"
                await memory_service.save_memory(
                    ctx.workspace_id,
                    client_id,
                    interaction.strip(),
                    metadata={
                        "type": "agent_stream_interaction",
                        "service_id": request.service_id,
                        "model": model,
                    },
                )
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
