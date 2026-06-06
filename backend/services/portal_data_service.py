"""Portal client read-only data — projects and published deliverables."""
from __future__ import annotations

import logging
import uuid
from typing import Any, Dict, List, Optional

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.os_deliverables import Os_deliverables
from models.os_projects import Os_projects

logger = logging.getLogger(__name__)

PORTAL_PROJECT_STATUSES = frozenset({"active", "paused", "completed"})


class PortalDataService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_projects(
        self,
        *,
        workspace_id: int,
        client_id: str,
        page: int = 1,
        page_size: int = 20,
        q: Optional[str] = None,
    ) -> Dict[str, Any]:
        if page < 1:
            raise ValueError("page must be >= 1")
        if page_size < 1 or page_size > 200:
            raise ValueError("page_size must be between 1 and 200")

        base = select(Os_projects).where(
            Os_projects.workspace_id == workspace_id,
            Os_projects.client_id == client_id,
            Os_projects.status.in_(tuple(PORTAL_PROJECT_STATUSES)),
        )
        count_q = select(func.count(Os_projects.id)).where(
            Os_projects.workspace_id == workspace_id,
            Os_projects.client_id == client_id,
            Os_projects.status.in_(tuple(PORTAL_PROJECT_STATUSES)),
        )

        if q:
            term = f"%{q.strip().lower()}%"
            search = or_(
                func.lower(Os_projects.name).like(term),
                func.lower(func.coalesce(Os_projects.description, "")).like(term),
            )
            base = base.where(search)
            count_q = count_q.where(search)

        total = int((await self.db.execute(count_q)).scalar() or 0)
        skip = (page - 1) * page_size
        rows = await self.db.execute(
            base.order_by(Os_projects.updated_at.desc(), Os_projects.name.asc())
            .offset(skip)
            .limit(page_size)
        )
        items = [self._project_dict(row) for row in rows.scalars().all()]
        return {"items": items, "total": total, "page": page, "page_size": page_size}

    async def get_project(
        self, project_id: str, *, workspace_id: int, client_id: str
    ) -> Optional[Dict[str, Any]]:
        try:
            uuid.UUID(str(project_id))
        except ValueError:
            return None
        q = select(Os_projects).where(
            Os_projects.id == str(project_id),
            Os_projects.workspace_id == workspace_id,
            Os_projects.client_id == client_id,
            Os_projects.status.in_(tuple(PORTAL_PROJECT_STATUSES)),
        )
        result = await self.db.execute(q)
        row = result.scalar_one_or_none()
        return self._project_dict(row) if row else None

    async def list_deliverables(
        self,
        *,
        workspace_id: int,
        client_id: str,
        page: int = 1,
        page_size: int = 20,
        q: Optional[str] = None,
        project_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        if page < 1:
            raise ValueError("page must be >= 1")
        if page_size < 1 or page_size > 200:
            raise ValueError("page_size must be between 1 and 200")

        base = select(Os_deliverables).where(
            Os_deliverables.workspace_id == workspace_id,
            Os_deliverables.client_id == client_id,
            Os_deliverables.visibility == "client_visible",
            Os_deliverables.status == "published",
        )
        count_q = select(func.count(Os_deliverables.id)).where(
            Os_deliverables.workspace_id == workspace_id,
            Os_deliverables.client_id == client_id,
            Os_deliverables.visibility == "client_visible",
            Os_deliverables.status == "published",
        )

        if project_id:
            pid = project_id.strip()
            uuid.UUID(pid)
            base = base.where(Os_deliverables.project_id == pid)
            count_q = count_q.where(Os_deliverables.project_id == pid)

        if q:
            term = f"%{q.strip().lower()}%"
            search = or_(
                func.lower(Os_deliverables.title).like(term),
                func.lower(func.coalesce(Os_deliverables.description, "")).like(term),
            )
            base = base.where(search)
            count_q = count_q.where(search)

        total = int((await self.db.execute(count_q)).scalar() or 0)
        skip = (page - 1) * page_size
        rows = await self.db.execute(
            base.order_by(Os_deliverables.updated_at.desc(), Os_deliverables.title.asc())
            .offset(skip)
            .limit(page_size)
        )
        items = [self._deliverable_dict(row) for row in rows.scalars().all()]
        return {"items": items, "total": total, "page": page, "page_size": page_size}

    async def get_deliverable(
        self, deliverable_id: str, *, workspace_id: int, client_id: str
    ) -> Optional[Dict[str, Any]]:
        try:
            uuid.UUID(str(deliverable_id))
        except ValueError:
            return None
        q = select(Os_deliverables).where(
            Os_deliverables.id == str(deliverable_id),
            Os_deliverables.workspace_id == workspace_id,
            Os_deliverables.client_id == client_id,
            Os_deliverables.visibility == "client_visible",
            Os_deliverables.status == "published",
        )
        result = await self.db.execute(q)
        row = result.scalar_one_or_none()
        return self._deliverable_dict(row) if row else None

    @staticmethod
    def _project_dict(row: Os_projects) -> Dict[str, Any]:
        return {
            "id": row.id,
            "name": row.name,
            "description": row.description,
            "status": row.status,
            "start_date": row.start_date.isoformat() if row.start_date else None,
            "due_date": row.due_date.isoformat() if row.due_date else None,
            "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        }

    @staticmethod
    def _deliverable_dict(row: Os_deliverables) -> Dict[str, Any]:
        return {
            "id": row.id,
            "project_id": row.project_id,
            "title": row.title,
            "description": row.description,
            "type": row.type,
            "file_url": row.file_url,
            "version": row.version,
            "published_at": row.published_at.isoformat() if row.published_at else None,
            "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        }
