"""Operator upload of deliverable files to private Supabase storage."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from models.os_deliverables import Os_deliverables
from services.os_deliverable_storage import (
    OS_DELIVERABLES_BUCKET,
    build_storage_path,
    validate_upload_payload,
)
from services.os_deliverables_service import OsDeliverablesService
from services.supabase_service import get_supabase_service

logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class OsDeliverableUploadService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.deliverables = OsDeliverablesService(db)

    async def upload_file(
        self,
        deliverable_id: str,
        *,
        workspace_id: int,
        filename: str,
        content_type: str | None,
        data: bytes,
    ) -> Os_deliverables:
        safe_name, resolved_ct = validate_upload_payload(
            filename=filename,
            content_type=content_type,
            size_bytes=len(data),
        )

        obj = await self.deliverables.get_by_id(deliverable_id, workspace_id=workspace_id)
        if not obj:
            raise LookupError("deliverable not found")

        storage_key = build_storage_path(
            workspace_id,
            obj.id,
            obj.version,
            safe_name,
        )

        supabase = get_supabase_service()
        result = await supabase.upload_bytes(
            OS_DELIVERABLES_BUCKET,
            storage_key,
            data,
            content_type=resolved_ct,
            upsert=True,
        )

        if result.get("mock"):
            logger.info(
                "Deliverable upload mock mode deliverable_id=%s path=%s",
                obj.id,
                storage_key,
            )
        elif not result.get("ok"):
            error = result.get("error") or "storage upload failed"
            raise RuntimeError(str(error))

        obj.storage_key = storage_key
        obj.updated_at = _utcnow()
        await self.db.commit()
        await self.db.refresh(obj)

        logger.info(
            "Deliverable file uploaded id=%s workspace_id=%s storage_key=%s bytes=%s",
            obj.id,
            workspace_id,
            storage_key,
            len(data),
        )
        return obj
