"""Redis queue management API."""

from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from dependencies.workspace import WorkspaceContext, require_workspace_admin
from services.queue_service import PREDEFINED_QUEUES, get_queue_service

router = APIRouter(prefix="/api/queue", tags=["queue"])


class EnqueueBody(BaseModel):
    queue_name: str = Field(..., min_length=1)
    task_name: str = Field(..., min_length=1)
    payload: Dict[str, Any] = Field(default_factory=dict)
    delay_seconds: int = Field(0, ge=0, le=86400)


@router.get("/stats")
async def queue_stats(
    _ctx: WorkspaceContext = Depends(require_workspace_admin),
):
    return await get_queue_service().get_all_stats()


@router.post("/enqueue", status_code=status.HTTP_201_CREATED)
async def enqueue_task(
    body: EnqueueBody,
    _ctx: WorkspaceContext = Depends(require_workspace_admin),
):
    if body.queue_name not in PREDEFINED_QUEUES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"queue_name must be one of: {', '.join(sorted(PREDEFINED_QUEUES))}",
        )
    try:
        return await get_queue_service().enqueue(
            body.queue_name,
            body.task_name,
            body.payload,
            delay_seconds=body.delay_seconds,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.delete("/{queue_name}/flush")
async def flush_queue(
    queue_name: str,
    _ctx: WorkspaceContext = Depends(require_workspace_admin),
):
    if queue_name not in PREDEFINED_QUEUES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"queue_name must be one of: {', '.join(sorted(PREDEFINED_QUEUES))}",
        )
    removed = await get_queue_service().flush_queue(queue_name)
    return {"queue": queue_name, "removed": removed, "ok": True}
