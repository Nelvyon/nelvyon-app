"""Apply idempotent performance indexes at startup (migration-owned)."""

from __future__ import annotations


async def ensure_performance_indexes() -> None:
    """Schema owned by backend/db/migrations — no runtime DDL."""
    return
