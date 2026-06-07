"""Secure portal download for client-visible deliverables."""
from __future__ import annotations

import logging
import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.os_deliverables import Os_deliverables
from services.os_deliverable_storage import (
    deliverable_has_file,
    resolve_deliverable_download_url,
)

logger = logging.getLogger(__name__)

CLIENT_VISIBLE = "client_visible"
DOWNLOADABLE_STATUSES = frozenset({"published", "approved_by_client"})


class PortalDeliverableDownloadService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_downloadable(
        self,
        deliverable_id: str,
        *,
        workspace_id: int,
        client_id: str,
    ) -> Optional[Os_deliverables]:
        try:
            uuid.UUID(str(deliverable_id))
        except ValueError:
            return None

        q = select(Os_deliverables).where(
            Os_deliverables.id == str(deliverable_id),
            Os_deliverables.workspace_id == workspace_id,
            Os_deliverables.client_id == client_id,
            Os_deliverables.visibility == CLIENT_VISIBLE,
            Os_deliverables.status.in_(tuple(DOWNLOADABLE_STATUSES)),
        )
        result = await self.db.execute(q)
        return result.scalar_one_or_none()

    async def resolve_download_url(
        self,
        deliverable_id: str,
        *,
        workspace_id: int,
        client_id: str,
    ) -> Optional[str]:
        obj = await self._get_downloadable(
            deliverable_id,
            workspace_id=workspace_id,
            client_id=client_id,
        )
        if not obj:
            return None
        if not deliverable_has_file(storage_key=obj.storage_key, file_url=obj.file_url):
            return None

        url = await resolve_deliverable_download_url(
            storage_key=obj.storage_key,
            file_url=obj.file_url,
        )
        if url:
            logger.info(
                "Portal download resolved deliverable_id=%s workspace_id=%s client_id=%s",
                obj.id,
                workspace_id,
                client_id,
            )
        return url
