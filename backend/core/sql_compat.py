"""Dialect-aware SQL fragments for JSON columns (Postgres jsonb vs SQLite TEXT)."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession


def json_bind(session: AsyncSession, param: str) -> str:
    bind = session.get_bind()
    dialect = bind.dialect.name if bind is not None else "postgresql"
    if dialect == "sqlite":
        return f":{param}"
    return f"CAST(:{param} AS jsonb)"


def uuid_bind(session: AsyncSession, param: str = "id") -> str:
    bind = session.get_bind()
    dialect = bind.dialect.name if bind is not None else "postgresql"
    if dialect == "sqlite":
        return f":{param}"
    return f"CAST(:{param} AS uuid)"
