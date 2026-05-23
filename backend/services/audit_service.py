"""Immutable tenant audit log — compliance trail and CSV export."""

from __future__ import annotations

import csv
import io
import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import db_manager
from services.tenant_service import TenantService

logger = logging.getLogger(__name__)

_SCHEMA_READY = False


def _json_dumps(obj: Any) -> str | None:
    if obj is None:
        return None
    return json.dumps(obj, ensure_ascii=False, default=str)


def _row(row: Any) -> dict[str, Any]:
    if row is None:
        return {}
    data = dict(row._mapping)
    for k, v in list(data.items()):
        if isinstance(v, datetime):
            data[k] = v.isoformat()
    return data


class AuditService:
    """Append-only audit log per tenant."""

    def __init__(self, session: AsyncSession, tenant_id: int):
        self.session = session
        self.tenant_id = int(tenant_id)

    @staticmethod
    async def ensure_schema() -> None:
        await TenantService.ensure_schema()
        global _SCHEMA_READY
        _SCHEMA_READY = True

    async def _prepare_session(self) -> None:
        await self.ensure_schema()
        await TenantService(self.session).set_tenant_context(self.tenant_id)

    async def log_action(
        self,
        tenant_id: int,
        user_id: str,
        action: str,
        resource_type: str,
        resource_id: str | None = None,
        old_value: dict[str, Any] | None = None,
        new_value: dict[str, Any] | None = None,
        ip_address: str | None = None,
    ) -> dict[str, Any]:
        """Append immutable audit entry (no updates/deletes)."""
        await self._prepare_session()
        entry_id = str(uuid.uuid4())
        r = await self.session.execute(
            text(
                """
                INSERT INTO audit_logs (
                    id, tenant_id, user_id, action, resource_type, resource_id,
                    old_value, new_value, ip_address
                )
                VALUES (
                    :id, :tid, :uid, :action, :rtype, :rid,
                    CAST(:old AS jsonb), CAST(:new AS jsonb), :ip
                )
                RETURNING id, tenant_id, user_id, action, resource_type, resource_id, created_at
                """
            ),
            {
                "id": entry_id,
                "tid": int(tenant_id),
                "uid": user_id,
                "action": action,
                "rtype": resource_type,
                "rid": resource_id,
                "old": _json_dumps(old_value),
                "new": _json_dumps(new_value),
                "ip": ip_address,
            },
        )
        await self.session.commit()
        return _row(r.fetchone())

    async def get_audit_trail(
        self,
        tenant_id: int,
        *,
        user_id: str | None = None,
        resource_type: str | None = None,
        action: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        await self._prepare_session()
        q = """
            SELECT id, tenant_id, user_id, action, resource_type, resource_id,
                   old_value, new_value, ip_address, created_at
            FROM audit_logs
            WHERE tenant_id = :tid
        """
        params: dict[str, Any] = {"tid": tenant_id, "limit": limit, "offset": offset}
        if user_id:
            q += " AND user_id = :uid"
            params["uid"] = user_id
        if resource_type:
            q += " AND resource_type = :rtype"
            params["rtype"] = resource_type
        if action:
            q += " AND action = :action"
            params["action"] = action
        if date_from:
            q += " AND created_at >= :dfrom"
            params["dfrom"] = date_from
        if date_to:
            q += " AND created_at <= :dto"
            params["dto"] = date_to
        q += " ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
        r = await self.session.execute(text(q), params)
        return [_row(x) for x in r.fetchall()]

    async def export_audit_csv(
        self,
        tenant_id: int,
        *,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> str:
        rows = await self.get_audit_trail(
            tenant_id,
            date_from=date_from,
            date_to=date_to,
            limit=10000,
        )
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(
            [
                "id",
                "tenant_id",
                "user_id",
                "action",
                "resource_type",
                "resource_id",
                "ip_address",
                "created_at",
            ]
        )
        for row in rows:
            writer.writerow(
                [
                    row.get("id"),
                    row.get("tenant_id"),
                    row.get("user_id"),
                    row.get("action"),
                    row.get("resource_type"),
                    row.get("resource_id"),
                    row.get("ip_address"),
                    row.get("created_at"),
                ]
            )
        return buffer.getvalue()


def get_audit_service(session: AsyncSession, tenant_id: int) -> AuditService:
    return AuditService(session, tenant_id)


async def log_critical_audit(
    session: AsyncSession,
    *,
    tenant_id: int | None,
    user_id: str,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    ip_address: str | None = None,
    new_value: dict[str, Any] | None = None,
) -> None:
    """Best-effort audit for critical actions (never raises to caller)."""
    if tenant_id is None:
        return
    # tenant_id=0 allowed for platform-level events (e.g. login before workspace scope)
    try:
        svc = AuditService(session, int(tenant_id))
        await svc.log_action(
            int(tenant_id),
            user_id,
            action,
            resource_type,
            resource_id=resource_id,
            new_value=new_value,
            ip_address=ip_address,
        )
    except Exception as exc:
        logger.warning("critical audit log failed: %s", exc)
