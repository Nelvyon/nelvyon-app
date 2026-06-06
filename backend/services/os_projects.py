"""Service layer for os_projects — workspace-scoped, FK os_clients."""
from __future__ import annotations

import logging
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Union

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.os_clients import Os_clients
from models.os_projects import Os_projects

logger = logging.getLogger(__name__)

VALID_STATUSES = frozenset({"draft", "active", "paused", "completed", "cancelled", "archived"})
VALID_PRIORITIES = frozenset({"low", "medium", "high", "urgent"})


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _parse_date(value: Optional[Union[str, date]]) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    s = str(value).strip()
    if not s:
        return None
    return date.fromisoformat(s[:10])


def _parse_budget(value: Optional[Union[str, int, float, Decimal]]) -> Optional[Decimal]:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


class OsProjectsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _validate_status(self, status: Optional[str]) -> str:
        s = (status or "draft").strip().lower()
        if s not in VALID_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(sorted(VALID_STATUSES))}")
        return s

    def _validate_priority(self, priority: Optional[str]) -> str:
        p = (priority or "medium").strip().lower()
        if p not in VALID_PRIORITIES:
            raise ValueError(f"priority must be one of: {', '.join(sorted(VALID_PRIORITIES))}")
        return p

    async def _resolve_client(
        self, client_id: str, *, workspace_id: int
    ) -> Optional[Os_clients]:
        try:
            uuid.UUID(str(client_id))
        except ValueError:
            return None
        q = select(Os_clients).where(
            Os_clients.id == str(client_id),
            Os_clients.workspace_id == workspace_id,
        )
        result = await self.db.execute(q)
        return result.scalar_one_or_none()

    async def create(
        self,
        data: Dict[str, Any],
        *,
        workspace_id: int,
    ) -> Os_projects:
        client_id = (data.get("client_id") or "").strip()
        if not client_id:
            raise ValueError("client_id is required")

        client = await self._resolve_client(client_id, workspace_id=workspace_id)
        if not client:
            raise ValueError("client_id not found in workspace")

        name = (data.get("name") or "").strip()
        if not name:
            raise ValueError("name is required")

        status = self._validate_status(data.get("status"))
        now = _utcnow()

        obj = Os_projects(
            id=str(uuid.uuid4()),
            workspace_id=workspace_id,
            client_id=client_id,
            name=name,
            description=data.get("description"),
            status=status,
            priority=self._validate_priority(data.get("priority")),
            start_date=_parse_date(data.get("start_date")),
            due_date=_parse_date(data.get("due_date")),
            budget=_parse_budget(data.get("budget")),
            project_metadata=data.get("metadata") or {},
            archived_at=now if status == "archived" else None,
            created_at=now,
            updated_at=now,
        )
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        logger.info("Created os_projects id=%s workspace=%s", obj.id, workspace_id)
        return obj

    async def get_by_id(self, project_id: str, *, workspace_id: int) -> Optional[Os_projects]:
        try:
            uuid.UUID(str(project_id))
        except ValueError:
            return None
        q = select(Os_projects).where(
            Os_projects.id == str(project_id),
            Os_projects.workspace_id == workspace_id,
        )
        result = await self.db.execute(q)
        return result.scalar_one_or_none()

    async def list_projects(
        self,
        *,
        workspace_id: int,
        page: int = 1,
        page_size: int = 20,
        q: Optional[str] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        client_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        if page < 1:
            raise ValueError("page must be >= 1")
        if page_size < 1 or page_size > 200:
            raise ValueError("page_size must be between 1 and 200")

        base = select(Os_projects).where(Os_projects.workspace_id == workspace_id)
        count_q = select(func.count(Os_projects.id)).where(Os_projects.workspace_id == workspace_id)

        if status:
            st = self._validate_status(status)
            base = base.where(Os_projects.status == st)
            count_q = count_q.where(Os_projects.status == st)

        if priority:
            pr = self._validate_priority(priority)
            base = base.where(Os_projects.priority == pr)
            count_q = count_q.where(Os_projects.priority == pr)

        if client_id:
            cid = client_id.strip()
            try:
                uuid.UUID(cid)
            except ValueError as exc:
                raise ValueError("client_id filter must be a valid UUID") from exc
            base = base.where(Os_projects.client_id == cid)
            count_q = count_q.where(Os_projects.client_id == cid)

        if q:
            term = f"%{q.strip().lower()}%"
            search_clause = or_(
                func.lower(Os_projects.name).like(term),
                func.lower(func.coalesce(Os_projects.description, "")).like(term),
            )
            base = base.where(search_clause)
            count_q = count_q.where(search_clause)

        total_result = await self.db.execute(count_q)
        total = int(total_result.scalar() or 0)

        skip = (page - 1) * page_size
        rows_result = await self.db.execute(
            base.order_by(Os_projects.updated_at.desc(), Os_projects.name.asc())
            .offset(skip)
            .limit(page_size)
        )
        items: List[Os_projects] = list(rows_result.scalars().all())
        return {"items": items, "total": total, "page": page, "page_size": page_size}

    async def update(
        self,
        project_id: str,
        update_data: Dict[str, Any],
        *,
        workspace_id: int,
    ) -> Optional[Os_projects]:
        obj = await self.get_by_id(project_id, workspace_id=workspace_id)
        if not obj:
            return None

        payload = dict(update_data)

        if "client_id" in payload and payload["client_id"] is not None:
            cid = str(payload["client_id"]).strip()
            client = await self._resolve_client(cid, workspace_id=workspace_id)
            if not client:
                raise ValueError("client_id not found in workspace")
            obj.client_id = cid

        if "name" in payload:
            name = (payload["name"] or "").strip()
            if not name:
                raise ValueError("name cannot be empty")
            obj.name = name

        if "description" in payload:
            obj.description = payload["description"]

        if "status" in payload and payload["status"] is not None:
            new_status = self._validate_status(payload["status"])
            obj.status = new_status
            if new_status == "archived" and obj.archived_at is None:
                obj.archived_at = _utcnow()
            elif new_status != "archived":
                obj.archived_at = None

        if "priority" in payload and payload["priority"] is not None:
            obj.priority = self._validate_priority(payload["priority"])

        if "start_date" in payload:
            obj.start_date = _parse_date(payload["start_date"])

        if "due_date" in payload:
            obj.due_date = _parse_date(payload["due_date"])

        if "budget" in payload:
            obj.budget = _parse_budget(payload["budget"])

        if "metadata" in payload and payload["metadata"] is not None:
            obj.project_metadata = payload["metadata"]

        obj.updated_at = _utcnow()
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def delete(self, project_id: str, *, workspace_id: int) -> bool:
        """Soft-delete: status=archived, archived_at=now."""
        obj = await self.get_by_id(project_id, workspace_id=workspace_id)
        if not obj:
            return False
        now = _utcnow()
        obj.status = "archived"
        obj.archived_at = now
        obj.updated_at = now
        await self.db.commit()
        return True
