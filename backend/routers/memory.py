"""Client memory API — pgvector-backed persistent context per client."""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from dependencies.workspace import WorkspaceContext, require_workspace
from services import memory_service

router = APIRouter(prefix="/api/memory", tags=["memory"])


class MemoryCreateRequest(BaseModel):
    content: str = Field(..., min_length=1)
    metadata: Optional[Dict[str, Any]] = None


class MemoryListResponse(BaseModel):
    client_id: str
    workspace_id: int
    items: List[Dict[str, Any]]
    context: str


class MemorySaveResponse(BaseModel):
    client_id: str
    id: Optional[str] = None
    saved: bool


class MemoryDeleteResponse(BaseModel):
    client_id: str
    deleted_count: int


class MemorySearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    limit: int = Field(5, ge=1, le=20)


@router.get("")
async def list_workspace_memories(
    limit: int = 50,
    ctx: WorkspaceContext = Depends(require_workspace),
):
    """List all memories in the workspace (across clients)."""
    items = await memory_service.list_workspace_memories(ctx.workspace_id, limit=limit)
    return {"workspace_id": ctx.workspace_id, "items": items, "count": len(items)}


@router.get("/{client_id}", response_model=MemoryListResponse)
async def get_client_memory(
    client_id: str,
    ctx: WorkspaceContext = Depends(require_workspace),
):
    """Obtain all stored memories and formatted context for a client."""
    items = await memory_service.list_client_memories(ctx.workspace_id, client_id)
    context = await memory_service.get_client_context(ctx.workspace_id, client_id)
    return MemoryListResponse(
        client_id=client_id,
        workspace_id=ctx.workspace_id,
        items=items,
        context=context,
    )


@router.post("/{client_id}", response_model=MemorySaveResponse, status_code=201)
async def create_client_memory(
    client_id: str,
    body: MemoryCreateRequest,
    ctx: WorkspaceContext = Depends(require_workspace),
):
    """Save a new memory entry for the client."""
    row_id = await memory_service.save_memory(
        ctx.workspace_id,
        client_id,
        body.content,
        metadata=body.metadata,
    )
    if not row_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not save memory (database or embedding unavailable)",
        )
    return MemorySaveResponse(client_id=client_id, id=row_id, saved=True)


@router.post("/{client_id}/search")
async def search_client_memory(
    client_id: str,
    body: MemorySearchRequest,
    ctx: WorkspaceContext = Depends(require_workspace),
):
    """Semantic search over client memories."""
    items = await memory_service.search_memory(
        ctx.workspace_id, client_id, body.query, limit=body.limit
    )
    return {"client_id": client_id, "query": body.query, "items": items}


@router.delete("/{client_id}", response_model=MemoryDeleteResponse)
async def delete_client_memory(
    client_id: str,
    ctx: WorkspaceContext = Depends(require_workspace),
):
    """Delete all memories for the client in the active workspace."""
    deleted = await memory_service.delete_client_memories(ctx.workspace_id, client_id)
    return MemoryDeleteResponse(client_id=client_id, deleted_count=deleted)
