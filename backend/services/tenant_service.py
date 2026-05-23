"""Multi-tenant isolation — RLS session context and tenant-scoped queries."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import db_manager
from core.tenant_context import get_tenant_context

logger = logging.getLogger(__name__)

_SCHEMA_READY = False


class TenantService:
    """Tenant (workspace) isolation helpers."""

    def __init__(self, session: AsyncSession):
        self.session = session

    @staticmethod
    async def ensure_schema() -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        if not db_manager.async_session_maker:
            await db_manager.ensure_initialized()
        sql_path = Path(__file__).resolve().parent.parent / "migrations" / "tenant_audit.sql"
        if not sql_path.exists():
            logger.warning("tenant_audit.sql not found")
            return
        raw = sql_path.read_text(encoding="utf-8")
        async with db_manager.async_session_maker() as session:
            for stmt in [s.strip() for s in raw.split(";") if s.strip()]:
                try:
                    await session.execute(text(stmt))
                except Exception as exc:
                    msg = str(exc).lower()
                    if "already exists" not in msg and "duplicate" not in msg:
                        logger.debug("tenant_audit schema stmt skipped: %s", exc)
            await session.commit()
        _SCHEMA_READY = True

    async def set_tenant_context(self, tenant_id: int) -> None:
        """Set Postgres session variable for Supabase RLS policies."""
        await self.ensure_schema()
        await self.session.execute(
            text("SELECT set_tenant_context(:tid)"),
            {"tid": int(tenant_id)},
        )

    async def apply_request_tenant(self) -> int | None:
        """Apply tenant from ContextVar to DB session (call at start of tenant-scoped handlers)."""
        tid = get_tenant_context()
        if tid is not None:
            await self.set_tenant_context(tid)
        return tid

    @staticmethod
    def tenant_filter_clause(column: str = "workspace_id") -> str:
        """SQL fragment ensuring queries are tenant-scoped."""
        return f"{column} = :tenant_id"

    async def verify_tenant_access(self, tenant_id: int, table: str, resource_id: str) -> bool:
        """Verify a resource belongs to the tenant."""
        if table not in {
            "crm_contacts",
            "crm_deals",
            "campaigns",
            "invoices",
            "bookings",
        }:
            return False
        await self.set_tenant_context(tenant_id)
        r = await self.session.execute(
            text(
                f"SELECT 1 FROM {table} WHERE workspace_id = :tid AND id::text = :rid LIMIT 1"
            ),
            {"tid": tenant_id, "rid": resource_id},
        )
        return r.fetchone() is not None


def get_tenant_service(session: AsyncSession) -> TenantService:
    return TenantService(session)
