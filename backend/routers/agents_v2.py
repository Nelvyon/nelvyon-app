"""World-class specialized agents v2 — orchestrator API."""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional

from core.secrets import sanitize_text
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from dependencies.workspace import WorkspaceContext, require_workspace
from services.agent_orchestrator import get_agent_orchestrator, list_specialized_agents

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/agents/v2", tags=["agents-v2"])


class RunAgentRequest(BaseModel):
    agent_type: str = Field(..., min_length=1, description="e.g. SEOAgent, seo, content")
    task: str = Field(..., min_length=1)
    context: Dict[str, Any] = Field(default_factory=dict)


class ChainAgentsRequest(BaseModel):
    agents: List[str] = Field(..., min_length=1, max_length=8)
    task: str = Field(..., min_length=1)
    context: Dict[str, Any] = Field(default_factory=dict)


class AnalyzeRequest(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)
    focus: Optional[str] = Field(None, description="Optional focus area for the analysis")


def _orch(ws: WorkspaceContext):
    return get_agent_orchestrator(ws.workspace_id)


@router.get("/list")
async def list_agents_v2(
    _ws: WorkspaceContext = Depends(require_workspace),
):
    return {
        "agents": list_specialized_agents(),
        "model": "gpt-4o",
        "version": "v2",
    }


@router.post("/run")
async def run_agent_stream(
    body: RunAgentRequest,
    ws: WorkspaceContext = Depends(require_workspace),
):
    """Execute a specialized agent with SSE streaming."""
    orch = _orch(ws)

    async def generate():
        try:
            async for chunk in orch.stream_run_agent(
                body.agent_type,
                body.task,
                body.context,
            ):
                yield chunk
        except ValueError as e:
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


@router.post("/chain")
async def chain_agents_stream(
    body: ChainAgentsRequest,
    ws: WorkspaceContext = Depends(require_workspace),
):
    """Chain multiple specialized agents (SSE stream with agent boundaries)."""
    orch = _orch(ws)

    async def generate():
        try:
            async for chunk in orch.stream_chain_agents(
                body.agents,
                body.task,
                body.context,
            ):
                yield chunk
        except ValueError as e:
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


@router.post("/analyze")
async def analyze_business(
    body: AnalyzeRequest,
    ws: WorkspaceContext = Depends(require_workspace),
):
    """Full multi-agent business analysis (non-streaming JSON)."""
    orch = _orch(ws)
    ctx = dict(body.context)
    if body.focus:
        ctx["focus"] = body.focus
    try:
        return await orch.analyze_business(ctx)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("analyze_business: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Business analysis failed",
        ) from e
