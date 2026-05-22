"""
Persistent client memory via pgvector (Supabase / Postgres).

Stores interaction snippets with OpenAI text-embedding-3-small for cosine similarity search.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union

from openai import AsyncOpenAI
from sqlalchemy import text

from core.config import settings
from core.database import db_manager

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIM = 1536
_WORKSPACE_NS = uuid.UUID("a3f8c2e1-5b4d-4e9a-8f1c-2d6e7b9a0c1d")

WorkspaceId = Union[int, str]


def _normalize_workspace_id(workspace_id: WorkspaceId) -> str:
    """Map integer workspace headers to a stable UUID for the client_memory table."""
    if isinstance(workspace_id, int):
        return str(uuid.uuid5(_WORKSPACE_NS, f"workspace:{workspace_id}"))
    raw = str(workspace_id).strip()
    if raw.isdigit():
        return str(uuid.uuid5(_WORKSPACE_NS, f"workspace:{raw}"))
    return raw


def _embedding_to_pgvector(embedding: List[float]) -> str:
    return "[" + ",".join(str(float(x)) for x in embedding) + "]"


def _openai_client() -> AsyncOpenAI:
    if not settings.app_ai_base_url or not settings.app_ai_key:
        raise ValueError("AI service not configured. Set APP_AI_BASE_URL and APP_AI_KEY.")
    return AsyncOpenAI(
        api_key=settings.app_ai_key,
        base_url=settings.app_ai_base_url.rstrip("/"),
    )


async def _embed(text_input: str) -> List[float]:
    client = _openai_client()
    response = await client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text_input,
    )
    vector = response.data[0].embedding
    if len(vector) != EMBEDDING_DIM:
        logger.warning("Unexpected embedding dimension: %s", len(vector))
    return vector


async def save_memory(
    workspace_id: WorkspaceId,
    client_id: str,
    content: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> Optional[str]:
    """Generate embedding and persist a memory row. Returns row id or None on failure."""
    if not content or not str(content).strip():
        return None
    if not db_manager.async_session_maker:
        await db_manager.ensure_initialized()
    if not db_manager.async_session_maker:
        logger.warning("save_memory skipped: database not initialized")
        return None

    try:
        embedding = await _embed(content.strip())
        ws_uuid = _normalize_workspace_id(workspace_id)
        meta_json = json.dumps(metadata or {}, ensure_ascii=False, default=str)
        emb_literal = _embedding_to_pgvector(embedding)

        async with db_manager.async_session_maker() as session:
            result = await session.execute(
                text(
                    """
                    INSERT INTO client_memory (
                        workspace_id, client_id, content, embedding, metadata, updated_at
                    )
                    VALUES (
                        CAST(:workspace_id AS uuid),
                        :client_id,
                        :content,
                        CAST(:embedding AS vector),
                        CAST(:metadata AS jsonb),
                        now()
                    )
                    RETURNING id::text
                    """
                ),
                {
                    "workspace_id": ws_uuid,
                    "client_id": str(client_id),
                    "content": content.strip(),
                    "embedding": emb_literal,
                    "metadata": meta_json,
                },
            )
            row_id = result.scalar_one()
            await session.commit()
            return str(row_id)
    except Exception as e:
        logger.warning("save_memory failed: %s", e)
        return None


async def search_memory(
    workspace_id: WorkspaceId,
    client_id: str,
    query: str,
    limit: int = 5,
) -> List[Dict[str, Any]]:
    """Return top memories by cosine similarity to the query embedding."""
    if not query or not str(query).strip():
        return []
    if not db_manager.async_session_maker:
        await db_manager.ensure_initialized()
    if not db_manager.async_session_maker:
        return []

    try:
        query_embedding = await _embed(query.strip())
        ws_uuid = _normalize_workspace_id(workspace_id)
        emb_literal = _embedding_to_pgvector(query_embedding)

        async with db_manager.async_session_maker() as session:
            result = await session.execute(
                text(
                    """
                    SELECT
                        id::text AS id,
                        content,
                        metadata,
                        created_at,
                        updated_at,
                        1 - (embedding <=> CAST(:query_embedding AS vector)) AS score
                    FROM client_memory
                    WHERE workspace_id = CAST(:workspace_id AS uuid)
                      AND client_id = :client_id
                      AND embedding IS NOT NULL
                    ORDER BY embedding <=> CAST(:query_embedding AS vector)
                    LIMIT :limit
                    """
                ),
                {
                    "workspace_id": ws_uuid,
                    "client_id": str(client_id),
                    "query_embedding": emb_literal,
                    "limit": int(limit),
                },
            )
            rows = result.mappings().all()
            return [dict(row) for row in rows]
    except Exception as e:
        logger.warning("search_memory failed: %s", e)
        return []


async def get_client_context(
    workspace_id: WorkspaceId,
    client_id: str,
    max_items: int = 30,
) -> str:
    """Full client memory context string for agent system prompts."""
    if not db_manager.async_session_maker:
        await db_manager.ensure_initialized()
    if not db_manager.async_session_maker:
        return ""

    try:
        ws_uuid = _normalize_workspace_id(workspace_id)
        async with db_manager.async_session_maker() as session:
            result = await session.execute(
                text(
                    """
                    SELECT content, metadata, created_at, updated_at
                    FROM client_memory
                    WHERE workspace_id = CAST(:workspace_id AS uuid)
                      AND client_id = :client_id
                    ORDER BY updated_at DESC
                    LIMIT :max_items
                    """
                ),
                {
                    "workspace_id": ws_uuid,
                    "client_id": str(client_id),
                    "max_items": int(max_items),
                },
            )
            rows = result.mappings().all()
    except Exception as e:
        logger.warning("get_client_context failed: %s", e)
        return ""

    if not rows:
        return ""

    parts: List[str] = []
    for idx, row in enumerate(rows, start=1):
        created = row.get("created_at")
        ts = created.isoformat() if isinstance(created, datetime) else str(created or "")
        meta = row.get("metadata")
        meta_suffix = ""
        if meta and meta != {}:
            meta_suffix = f" | metadata={json.dumps(meta, ensure_ascii=False, default=str)}"
        parts.append(f"{idx}. [{ts}] {row['content']}{meta_suffix}")

    return "\n".join(parts)


async def list_client_memories(
    workspace_id: WorkspaceId,
    client_id: str,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    """List stored memories for API GET (no vector search)."""
    if not db_manager.async_session_maker:
        await db_manager.ensure_initialized()
    if not db_manager.async_session_maker:
        return []

    try:
        ws_uuid = _normalize_workspace_id(workspace_id)
        async with db_manager.async_session_maker() as session:
            result = await session.execute(
                text(
                    """
                    SELECT
                        id::text AS id,
                        content,
                        metadata,
                        created_at,
                        updated_at
                    FROM client_memory
                    WHERE workspace_id = CAST(:workspace_id AS uuid)
                      AND client_id = :client_id
                    ORDER BY updated_at DESC
                    LIMIT :limit
                    """
                ),
                {
                    "workspace_id": ws_uuid,
                    "client_id": str(client_id),
                    "limit": int(limit),
                },
            )
            return [dict(row) for row in result.mappings().all()]
    except Exception as e:
        logger.warning("list_client_memories failed: %s", e)
        return []


async def delete_client_memories(workspace_id: WorkspaceId, client_id: str) -> int:
    """Delete all memories for a client in a workspace. Returns rows deleted."""
    if not db_manager.async_session_maker:
        await db_manager.ensure_initialized()
    if not db_manager.async_session_maker:
        return 0

    try:
        ws_uuid = _normalize_workspace_id(workspace_id)
        async with db_manager.async_session_maker() as session:
            result = await session.execute(
                text(
                    """
                    DELETE FROM client_memory
                    WHERE workspace_id = CAST(:workspace_id AS uuid)
                      AND client_id = :client_id
                    """
                ),
                {"workspace_id": ws_uuid, "client_id": str(client_id)},
            )
            await session.commit()
            return int(result.rowcount or 0)
    except Exception as e:
        logger.warning("delete_client_memories failed: %s", e)
        return 0


def format_relevant_memories(memories: List[Dict[str, Any]]) -> str:
    """Format search hits for injection into the agent system prompt."""
    if not memories:
        return "(sin recuerdos previos relevantes)"
    lines: List[str] = []
    for idx, mem in enumerate(memories, start=1):
        score = mem.get("score")
        score_txt = f" (relevancia {float(score):.2f})" if score is not None else ""
        lines.append(f"- {mem.get('content', '')}{score_txt}")
    return "\n".join(lines)
