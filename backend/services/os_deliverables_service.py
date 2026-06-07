"""Canonical os_deliverables service — workspace-scoped, FK validation, workflow."""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.os_clients import Os_clients
from models.os_deliverable_versions import Os_deliverable_versions
from models.os_deliverables import Os_deliverables
from models.os_projects import Os_projects
from models.os_tasks import Os_tasks

logger = logging.getLogger(__name__)

VALID_STATUSES = frozenset(
    {
        "draft",
        "in_review",
        "delivered",
        "approved",
        "published",
        "approved_by_client",
        "changes_requested",
        "rejected",
        "archived",
    }
)
VALID_VISIBILITY = frozenset({"internal", "client_visible"})


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class OsDeliverablesService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _validate_status(self, status: Optional[str]) -> str:
        s = (status or "draft").strip().lower()
        if s not in VALID_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(sorted(VALID_STATUSES))}")
        return s

    def _validate_visibility(self, visibility: Optional[str]) -> str:
        v = (visibility or "internal").strip().lower()
        if v not in VALID_VISIBILITY:
            raise ValueError(f"visibility must be one of: {', '.join(sorted(VALID_VISIBILITY))}")
        return v

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

    async def _resolve_task(
        self, task_id: str, *, workspace_id: int
    ) -> Optional[Os_tasks]:
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

    async def _resolve_fks(
        self,
        *,
        workspace_id: int,
        client_id: str,
        project_id: str,
        task_id: Optional[str],
    ) -> tuple[str, str, Optional[str]]:
        cid = (client_id or "").strip()
        pid = (project_id or "").strip()
        tid = task_id.strip() if task_id else None

        if not cid:
            raise ValueError("client_id is required")
        if not pid:
            raise ValueError("project_id is required")

        client = await self._resolve_client(cid, workspace_id=workspace_id)
        if not client:
            raise ValueError("client_id not found in workspace")

        project = await self._resolve_project(pid, workspace_id=workspace_id)
        if not project:
            raise ValueError("project_id not found in workspace")

        if project.client_id != cid:
            raise ValueError("client_id must match os_projects.client_id for this project_id")

        if tid:
            task = await self._resolve_task(tid, workspace_id=workspace_id)
            if not task:
                raise ValueError("task_id not found in workspace")
            if task.project_id and task.project_id != pid:
                raise ValueError("task_id must belong to the specified project_id")

        return cid, pid, tid

    async def create(self, data: Dict[str, Any], *, workspace_id: int) -> Os_deliverables:
        title = (data.get("title") or "").strip()
        if not title:
            raise ValueError("title is required")

        client_id, project_id, task_id = await self._resolve_fks(
            workspace_id=workspace_id,
            client_id=data.get("client_id") or "",
            project_id=data.get("project_id") or "",
            task_id=data.get("task_id"),
        )

        status = self._validate_status(data.get("status"))
        now = _utcnow()

        obj = Os_deliverables(
            id=str(uuid.uuid4()),
            workspace_id=workspace_id,
            client_id=client_id,
            project_id=project_id,
            task_id=task_id,
            title=title,
            description=data.get("description"),
            type=data.get("type"),
            status=status,
            visibility=self._validate_visibility(data.get("visibility")),
            file_url=data.get("file_url"),
            storage_key=data.get("storage_key"),
            version=int(data.get("version") or 1),
            review_notes=data.get("review_notes"),
            deliverable_metadata=data.get("metadata") or {},
            archived_at=now if status == "archived" else None,
            created_at=now,
            updated_at=now,
        )
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        logger.info("Created os_deliverables id=%s workspace=%s", obj.id, workspace_id)
        return obj

    async def get_by_id(
        self, deliverable_id: str, *, workspace_id: int
    ) -> Optional[Os_deliverables]:
        try:
            uuid.UUID(str(deliverable_id))
        except ValueError:
            return None
        q = select(Os_deliverables).where(
            Os_deliverables.id == str(deliverable_id),
            Os_deliverables.workspace_id == workspace_id,
        )
        result = await self.db.execute(q)
        return result.scalar_one_or_none()

    async def list_deliverables(
        self,
        *,
        workspace_id: int,
        page: int = 1,
        page_size: int = 20,
        q: Optional[str] = None,
        status: Optional[str] = None,
        visibility: Optional[str] = None,
        type: Optional[str] = None,
        client_id: Optional[str] = None,
        project_id: Optional[str] = None,
        task_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        if page < 1:
            raise ValueError("page must be >= 1")
        if page_size < 1 or page_size > 200:
            raise ValueError("page_size must be between 1 and 200")

        base = select(Os_deliverables).where(Os_deliverables.workspace_id == workspace_id)
        count_q = select(func.count(Os_deliverables.id)).where(
            Os_deliverables.workspace_id == workspace_id
        )

        if status:
            st = self._validate_status(status)
            base = base.where(Os_deliverables.status == st)
            count_q = count_q.where(Os_deliverables.status == st)

        if visibility:
            vis = self._validate_visibility(visibility)
            base = base.where(Os_deliverables.visibility == vis)
            count_q = count_q.where(Os_deliverables.visibility == vis)

        if type:
            t = type.strip()
            base = base.where(Os_deliverables.type == t)
            count_q = count_q.where(Os_deliverables.type == t)

        if client_id:
            cid = client_id.strip()
            uuid.UUID(cid)
            base = base.where(Os_deliverables.client_id == cid)
            count_q = count_q.where(Os_deliverables.client_id == cid)

        if project_id:
            pid = project_id.strip()
            uuid.UUID(pid)
            base = base.where(Os_deliverables.project_id == pid)
            count_q = count_q.where(Os_deliverables.project_id == pid)

        if task_id:
            tid = task_id.strip()
            uuid.UUID(tid)
            base = base.where(Os_deliverables.task_id == tid)
            count_q = count_q.where(Os_deliverables.task_id == tid)

        if q:
            term = f"%{q.strip().lower()}%"
            search_clause = or_(
                func.lower(Os_deliverables.title).like(term),
                func.lower(func.coalesce(Os_deliverables.description, "")).like(term),
            )
            base = base.where(search_clause)
            count_q = count_q.where(search_clause)

        total_result = await self.db.execute(count_q)
        total = int(total_result.scalar() or 0)

        skip = (page - 1) * page_size
        rows_result = await self.db.execute(
            base.order_by(Os_deliverables.updated_at.desc(), Os_deliverables.title.asc())
            .offset(skip)
            .limit(page_size)
        )
        items: List[Os_deliverables] = list(rows_result.scalars().all())
        return {"items": items, "total": total, "page": page, "page_size": page_size}

    async def update(
        self,
        deliverable_id: str,
        update_data: Dict[str, Any],
        *,
        workspace_id: int,
    ) -> Optional[Os_deliverables]:
        obj = await self.get_by_id(deliverable_id, workspace_id=workspace_id)
        if not obj:
            return None

        payload = dict(update_data)

        new_client = (
            str(payload["client_id"]).strip()
            if "client_id" in payload and payload["client_id"] is not None
            else obj.client_id
        )
        new_project = (
            str(payload["project_id"]).strip()
            if "project_id" in payload and payload["project_id"] is not None
            else obj.project_id
        )
        new_task = (
            str(payload["task_id"]).strip()
            if "task_id" in payload and payload["task_id"] is not None
            else obj.task_id
        )

        if "client_id" in payload or "project_id" in payload or "task_id" in payload:
            resolved = await self._resolve_fks(
                workspace_id=workspace_id,
                client_id=new_client,
                project_id=new_project,
                task_id=new_task,
            )
            obj.client_id, obj.project_id, obj.task_id = resolved

        if "title" in payload:
            title = (payload["title"] or "").strip()
            if not title:
                raise ValueError("title cannot be empty")
            obj.title = title

        if "description" in payload:
            obj.description = payload["description"]

        if "type" in payload:
            obj.type = payload["type"]

        if "status" in payload and payload["status"] is not None:
            new_status = self._validate_status(payload["status"])
            obj.status = new_status
            if new_status == "archived" and obj.archived_at is None:
                obj.archived_at = _utcnow()
            elif new_status != "archived":
                obj.archived_at = None

        if "visibility" in payload and payload["visibility"] is not None:
            obj.visibility = self._validate_visibility(payload["visibility"])

        if "file_url" in payload:
            obj.file_url = payload["file_url"]

        if "storage_key" in payload:
            obj.storage_key = payload["storage_key"]

        if "version" in payload and payload["version"] is not None:
            obj.version = int(payload["version"])

        if "review_notes" in payload:
            obj.review_notes = payload["review_notes"]

        if "metadata" in payload and payload["metadata"] is not None:
            obj.deliverable_metadata = payload["metadata"]

        obj.updated_at = _utcnow()
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def delete(self, deliverable_id: str, *, workspace_id: int) -> bool:
        obj = await self.get_by_id(deliverable_id, workspace_id=workspace_id)
        if not obj:
            return False
        now = _utcnow()
        obj.status = "archived"
        obj.archived_at = now
        obj.updated_at = now
        await self.db.commit()
        return True

    async def _transition(
        self,
        deliverable_id: str,
        *,
        workspace_id: int,
        allowed_from: frozenset[str],
        to_status: str,
        on_apply: Optional[Any] = None,
    ) -> Optional[Os_deliverables]:
        obj = await self.get_by_id(deliverable_id, workspace_id=workspace_id)
        if not obj:
            return None
        if obj.status not in allowed_from:
            raise ValueError(
                f"invalid transition from '{obj.status}' to '{to_status}'; "
                f"expected status in: {', '.join(sorted(allowed_from))}"
            )
        now = _utcnow()
        obj.status = to_status
        if on_apply:
            on_apply(obj, now)
        obj.updated_at = now
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def submit_review(
        self, deliverable_id: str, *, workspace_id: int
    ) -> Optional[Os_deliverables]:
        return await self._transition(
            deliverable_id,
            workspace_id=workspace_id,
            allowed_from=frozenset({"draft"}),
            to_status="in_review",
        )

    async def deliver(
        self, deliverable_id: str, *, workspace_id: int
    ) -> Optional[Os_deliverables]:
        def _apply(obj: Os_deliverables, now: datetime) -> None:
            obj.delivered_at = now

        return await self._transition(
            deliverable_id,
            workspace_id=workspace_id,
            allowed_from=frozenset({"in_review", "approved"}),
            to_status="delivered",
            on_apply=_apply,
        )

    async def approve(
        self, deliverable_id: str, *, workspace_id: int
    ) -> Optional[Os_deliverables]:
        def _apply(obj: Os_deliverables, now: datetime) -> None:
            obj.approved_at = now

        return await self._transition(
            deliverable_id,
            workspace_id=workspace_id,
            allowed_from=frozenset({"delivered"}),
            to_status="approved",
            on_apply=_apply,
        )

    async def publish(
        self, deliverable_id: str, *, workspace_id: int
    ) -> Optional[Os_deliverables]:
        def _apply(obj: Os_deliverables, now: datetime) -> None:
            obj.published_at = now
            obj.visibility = "client_visible"

        row = await self._transition(
            deliverable_id,
            workspace_id=workspace_id,
            allowed_from=frozenset({"approved"}),
            to_status="published",
            on_apply=_apply,
        )
        if row:
            try:
                from services.os_notification_service import notify_deliverable_published

                await notify_deliverable_published(
                    self.db,
                    workspace_id=workspace_id,
                    client_id=row.client_id,
                    deliverable_title=row.title,
                )
            except Exception as exc:
                logger.warning("Publish notification failed: %s", exc)
        return row

    async def reject(
        self,
        deliverable_id: str,
        *,
        workspace_id: int,
        review_notes: Optional[str] = None,
    ) -> Optional[Os_deliverables]:
        obj = await self.get_by_id(deliverable_id, workspace_id=workspace_id)
        if not obj:
            return None
        if obj.status not in frozenset({"in_review", "delivered"}):
            raise ValueError(
                f"invalid transition from '{obj.status}' to 'rejected'; "
                "expected status in: in_review, delivered"
            )
        now = _utcnow()
        obj.status = "rejected"
        if review_notes is not None:
            obj.review_notes = review_notes
        obj.updated_at = now
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def create_revision(
        self, deliverable_id: str, *, workspace_id: int
    ) -> Optional[Os_deliverables]:
        """Snapshot current version and reset deliverable to draft for re-work."""
        obj = await self.get_by_id(deliverable_id, workspace_id=workspace_id)
        if not obj:
            return None
        if obj.status != "changes_requested":
            raise ValueError(
                "deliverable must be changes_requested to create a revision "
                f"(current: {obj.status})"
            )

        now = _utcnow()
        meta = dict(obj.deliverable_metadata) if isinstance(obj.deliverable_metadata, dict) else {}

        snapshot = Os_deliverable_versions(
            id=str(uuid.uuid4()),
            workspace_id=workspace_id,
            deliverable_id=obj.id,
            version=obj.version,
            status=obj.status,
            file_url=obj.file_url,
            review_notes=obj.review_notes,
            version_metadata=meta.copy(),
            created_at=now,
        )
        self.db.add(snapshot)

        old_version = obj.version
        obj.version = old_version + 1
        obj.status = "draft"
        obj.visibility = "internal"
        obj.delivered_at = None
        obj.approved_at = None
        obj.published_at = None
        obj.client_reviewed_at = None
        obj.approved_by_portal_user_id = None
        meta["previous_version"] = old_version
        meta["revision_created_at"] = now.isoformat()
        obj.deliverable_metadata = meta
        obj.updated_at = now

        await self.db.commit()
        await self.db.refresh(obj)
        logger.info(
            "Created revision v%s for os_deliverables id=%s workspace=%s",
            obj.version,
            obj.id,
            workspace_id,
        )
        try:
            from services.os_notification_service import notify_deliverable_revision_started

            await notify_deliverable_revision_started(
                self.db,
                workspace_id=workspace_id,
                client_id=obj.client_id,
                deliverable_title=obj.title,
                version=obj.version,
            )
        except Exception as exc:
            logger.warning("Revision started notification failed: %s", exc)
        return obj

    async def list_versions(
        self, deliverable_id: str, *, workspace_id: int
    ) -> Optional[List[Dict[str, Any]]]:
        obj = await self.get_by_id(deliverable_id, workspace_id=workspace_id)
        if not obj:
            return None
        q = (
            select(Os_deliverable_versions)
            .where(
                Os_deliverable_versions.deliverable_id == str(deliverable_id),
                Os_deliverable_versions.workspace_id == workspace_id,
            )
            .order_by(Os_deliverable_versions.version.desc())
        )
        result = await self.db.execute(q)
        rows = list(result.scalars().all())
        return [
            {
                "id": r.id,
                "deliverable_id": r.deliverable_id,
                "version": r.version,
                "status": r.status,
                "file_url": r.file_url,
                "review_notes": r.review_notes,
                "metadata": r.version_metadata
                if isinstance(r.version_metadata, dict)
                else {},
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
