"""Canonical os_tasks service — workspace-scoped, FK os_projects / os_clients."""
from __future__ import annotations

import logging
import uuid
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional, Union

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.os_clients import Os_clients
from models.os_projects import Os_projects
from models.os_tasks import Os_tasks

logger = logging.getLogger(__name__)

VALID_STATUSES = frozenset({"pending", "in_progress", "blocked", "completed", "archived"})
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


class OsTasksService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _validate_status(self, status: Optional[str]) -> str:
        s = (status or "pending").strip().lower()
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

    async def _resolve_project(
        self, project_id: str, *, workspace_id: int
    ) -> Optional[Os_projects]:
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

    async def _resolve_fks(
        self,
        *,
        workspace_id: int,
        project_id: Optional[str],
        client_id: Optional[str],
    ) -> tuple[Optional[str], Optional[str]]:
        pid = project_id.strip() if project_id else None
        cid = client_id.strip() if client_id else None

        project: Optional[Os_projects] = None
        if pid:
            project = await self._resolve_project(pid, workspace_id=workspace_id)
            if not project:
                raise ValueError("project_id not found in workspace")

        if cid:
            client = await self._resolve_client(cid, workspace_id=workspace_id)
            if not client:
                raise ValueError("client_id not found in workspace")
        else:
            client = None

        if project:
            if cid and cid != project.client_id:
                raise ValueError("client_id must match os_projects.client_id for this project_id")
            cid = project.client_id

        return pid, cid

    def _apply_completed_at(self, obj: Os_tasks, status: str) -> None:
        if status == "completed":
            if obj.completed_at is None:
                obj.completed_at = _utcnow()
        else:
            obj.completed_at = None

    async def create(self, data: Dict[str, Any], *, workspace_id: int) -> Os_tasks:
        title = (data.get("title") or "").strip()
        if not title:
            raise ValueError("title is required")

        project_id, client_id = await self._resolve_fks(
            workspace_id=workspace_id,
            project_id=data.get("project_id"),
            client_id=data.get("client_id"),
        )

        status = self._validate_status(data.get("status"))
        now = _utcnow()

        obj = Os_tasks(
            id=str(uuid.uuid4()),
            workspace_id=workspace_id,
            project_id=project_id,
            client_id=client_id,
            title=title,
            description=data.get("description"),
            status=status,
            priority=self._validate_priority(data.get("priority")),
            assignee=data.get("assignee"),
            due_date=_parse_date(data.get("due_date")),
            completed_at=now if status == "completed" else None,
            task_metadata=data.get("metadata") or {},
            archived_at=now if status == "archived" else None,
            created_at=now,
            updated_at=now,
        )
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        logger.info("Created os_tasks id=%s workspace=%s", obj.id, workspace_id)
        return obj

    async def get_by_id(self, task_id: str, *, workspace_id: int) -> Optional[Os_tasks]:
        try:
            uuid.UUID(str(task_id))
        except ValueError:
            return None
        q = select(Os_tasks).where(
            Os_tasks.id == str(task_id),
            Os_tasks.workspace_id == workspace_id,
        )
        result = await self.db.execute(q)
        return result.scalar_one_or_none()

    async def list_tasks(
        self,
        *,
        workspace_id: int,
        page: int = 1,
        page_size: int = 20,
        q: Optional[str] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        project_id: Optional[str] = None,
        client_id: Optional[str] = None,
        assignee: Optional[str] = None,
    ) -> Dict[str, Any]:
        if page < 1:
            raise ValueError("page must be >= 1")
        if page_size < 1 or page_size > 200:
            raise ValueError("page_size must be between 1 and 200")

        base = select(Os_tasks).where(Os_tasks.workspace_id == workspace_id)
        count_q = select(func.count(Os_tasks.id)).where(Os_tasks.workspace_id == workspace_id)

        if status:
            st = self._validate_status(status)
            base = base.where(Os_tasks.status == st)
            count_q = count_q.where(Os_tasks.status == st)

        if priority:
            pr = self._validate_priority(priority)
            base = base.where(Os_tasks.priority == pr)
            count_q = count_q.where(Os_tasks.priority == pr)

        if project_id:
            pid = project_id.strip()
            uuid.UUID(pid)
            base = base.where(Os_tasks.project_id == pid)
            count_q = count_q.where(Os_tasks.project_id == pid)

        if client_id:
            cid = client_id.strip()
            uuid.UUID(cid)
            base = base.where(Os_tasks.client_id == cid)
            count_q = count_q.where(Os_tasks.client_id == cid)

        if assignee:
            a = assignee.strip()
            base = base.where(Os_tasks.assignee == a)
            count_q = count_q.where(Os_tasks.assignee == a)

        if q:
            term = f"%{q.strip().lower()}%"
            search_clause = or_(
                func.lower(Os_tasks.title).like(term),
                func.lower(func.coalesce(Os_tasks.description, "")).like(term),
            )
            base = base.where(search_clause)
            count_q = count_q.where(search_clause)

        total_result = await self.db.execute(count_q)
        total = int(total_result.scalar() or 0)

        skip = (page - 1) * page_size
        rows_result = await self.db.execute(
            base.order_by(Os_tasks.updated_at.desc(), Os_tasks.title.asc())
            .offset(skip)
            .limit(page_size)
        )
        items: List[Os_tasks] = list(rows_result.scalars().all())
        return {"items": items, "total": total, "page": page, "page_size": page_size}

    async def update(
        self,
        task_id: str,
        update_data: Dict[str, Any],
        *,
        workspace_id: int,
    ) -> Optional[Os_tasks]:
        obj = await self.get_by_id(task_id, workspace_id=workspace_id)
        if not obj:
            return None

        payload = dict(update_data)

        new_project_id = (
            str(payload["project_id"]).strip()
            if "project_id" in payload and payload["project_id"] is not None
            else obj.project_id
        )
        new_client_id = (
            str(payload["client_id"]).strip()
            if "client_id" in payload and payload["client_id"] is not None
            else obj.client_id
        )

        if "project_id" in payload or "client_id" in payload:
            resolved_project, resolved_client = await self._resolve_fks(
                workspace_id=workspace_id,
                project_id=new_project_id,
                client_id=new_client_id,
            )
            obj.project_id = resolved_project
            obj.client_id = resolved_client

        if "title" in payload:
            title = (payload["title"] or "").strip()
            if not title:
                raise ValueError("title cannot be empty")
            obj.title = title

        if "description" in payload:
            obj.description = payload["description"]

        if "status" in payload and payload["status"] is not None:
            new_status = self._validate_status(payload["status"])
            obj.status = new_status
            self._apply_completed_at(obj, new_status)
            if new_status == "archived" and obj.archived_at is None:
                obj.archived_at = _utcnow()
            elif new_status != "archived":
                obj.archived_at = None

        if "priority" in payload and payload["priority"] is not None:
            obj.priority = self._validate_priority(payload["priority"])

        if "assignee" in payload:
            obj.assignee = payload["assignee"]

        if "due_date" in payload:
            obj.due_date = _parse_date(payload["due_date"])

        if "metadata" in payload and payload["metadata"] is not None:
            obj.task_metadata = payload["metadata"]

        obj.updated_at = _utcnow()
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def delete(self, task_id: str, *, workspace_id: int) -> bool:
        obj = await self.get_by_id(task_id, workspace_id=workspace_id)
        if not obj:
            return False
        now = _utcnow()
        obj.status = "archived"
        obj.archived_at = now
        obj.updated_at = now
        await self.db.commit()
        return True
