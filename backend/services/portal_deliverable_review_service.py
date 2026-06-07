"""Portal client approve/reject on published deliverables."""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.os_deliverable_reviews import Os_deliverable_reviews
from models.os_deliverables import Os_deliverables
from services.os_audit_service import record_os_event

logger = logging.getLogger(__name__)

CLIENT_VISIBLE = "client_visible"
REVIEWABLE_STATUS = "published"
CLIENT_REVIEWED_STATUSES = frozenset({"approved_by_client", "changes_requested"})
PORTAL_VISIBLE_STATUSES = frozenset(
    {"published", "approved_by_client", "changes_requested"}
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class PortalDeliverableReviewService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_for_client(
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
        )
        result = await self.db.execute(q)
        return result.scalar_one_or_none()

    def _ensure_reviewable(self, obj: Os_deliverables) -> None:
        if obj.visibility != CLIENT_VISIBLE:
            raise ValueError("deliverable is not visible to client")
        if obj.status in CLIENT_REVIEWED_STATUSES:
            raise ValueError("deliverable already reviewed by client")
        if obj.status != REVIEWABLE_STATUS:
            raise ValueError(
                f"deliverable must be {REVIEWABLE_STATUS} to review (current: {obj.status})"
            )

    async def _record_review(
        self,
        *,
        workspace_id: int,
        deliverable_id: str,
        portal_user_id: str,
        decision: str,
        feedback: Optional[str],
    ) -> Os_deliverable_reviews:
        now = _utcnow()
        review = Os_deliverable_reviews(
            id=str(uuid.uuid4()),
            workspace_id=workspace_id,
            deliverable_id=deliverable_id,
            portal_user_id=portal_user_id,
            decision=decision,
            feedback=feedback,
            created_at=now,
        )
        self.db.add(review)
        return review

    def _update_metadata(
        self,
        obj: Os_deliverables,
        *,
        portal_user_id: str,
        decision: str,
        feedback: Optional[str],
        reviewed_at: datetime,
    ) -> None:
        meta = dict(obj.deliverable_metadata) if isinstance(obj.deliverable_metadata, dict) else {}
        meta["client_feedback"] = feedback or ""
        meta["portal_user_id"] = portal_user_id
        meta["reviewed_at"] = reviewed_at.isoformat()
        meta["client_review_decision"] = decision
        history = list(meta.get("client_review_history") or [])
        history.append(
            {
                "decision": decision,
                "feedback": feedback or "",
                "portal_user_id": portal_user_id,
                "reviewed_at": reviewed_at.isoformat(),
            }
        )
        meta["client_review_history"] = history
        obj.deliverable_metadata = meta

    async def approve(
        self,
        deliverable_id: str,
        *,
        workspace_id: int,
        client_id: str,
        portal_user_id: str,
        feedback: Optional[str] = None,
    ) -> Dict[str, Any]:
        obj = await self._get_for_client(
            deliverable_id, workspace_id=workspace_id, client_id=client_id
        )
        if not obj:
            raise ValueError("deliverable not found")
        self._ensure_reviewable(obj)

        now = _utcnow()
        obj.status = "approved_by_client"
        obj.approved_at = now
        obj.client_reviewed_at = now
        obj.approved_by_portal_user_id = portal_user_id
        obj.updated_at = now
        self._update_metadata(
            obj,
            portal_user_id=portal_user_id,
            decision="approve",
            feedback=feedback,
            reviewed_at=now,
        )
        await self._record_review(
            workspace_id=workspace_id,
            deliverable_id=obj.id,
            portal_user_id=portal_user_id,
            decision="approve",
            feedback=feedback,
        )
        await self.db.commit()
        await self.db.refresh(obj)
        logger.info(
            "Portal approved deliverable id=%s by portal_user=%s",
            obj.id,
            portal_user_id,
        )
        await record_os_event(
            self.db,
            category="portal",
            action="approve_deliverable",
            resource_type="os_deliverable",
            resource_id=obj.id,
            result="success",
            workspace_id=workspace_id,
            actor_user_id=portal_user_id,
        )
        return self._result_dict(obj)

    async def reject(
        self,
        deliverable_id: str,
        *,
        workspace_id: int,
        client_id: str,
        portal_user_id: str,
        feedback: str,
    ) -> Dict[str, Any]:
        text = (feedback or "").strip()
        if not text:
            raise ValueError("feedback is required")

        obj = await self._get_for_client(
            deliverable_id, workspace_id=workspace_id, client_id=client_id
        )
        if not obj:
            raise ValueError("deliverable not found")
        self._ensure_reviewable(obj)

        now = _utcnow()
        obj.status = "changes_requested"
        obj.client_reviewed_at = now
        obj.approved_by_portal_user_id = None
        obj.updated_at = now
        self._update_metadata(
            obj,
            portal_user_id=portal_user_id,
            decision="reject",
            feedback=text,
            reviewed_at=now,
        )
        await self._record_review(
            workspace_id=workspace_id,
            deliverable_id=obj.id,
            portal_user_id=portal_user_id,
            decision="reject",
            feedback=text,
        )
        await self.db.commit()
        await self.db.refresh(obj)
        logger.info(
            "Portal rejected deliverable id=%s by portal_user=%s",
            obj.id,
            portal_user_id,
        )
        try:
            from services.os_notification_service import notify_deliverable_revision_requested

            await notify_deliverable_revision_requested(
                self.db,
                workspace_id=workspace_id,
                client_id=client_id,
                deliverable_title=obj.title,
                feedback=text,
            )
        except Exception as exc:
            logger.warning("Revision requested notification failed: %s", exc)
        await record_os_event(
            self.db,
            category="portal",
            action="reject_deliverable",
            resource_type="os_deliverable",
            resource_id=obj.id,
            result="success",
            workspace_id=workspace_id,
            actor_user_id=portal_user_id,
        )
        return self._result_dict(obj)

    @staticmethod
    def _result_dict(obj: Os_deliverables) -> Dict[str, Any]:
        meta = obj.deliverable_metadata if isinstance(obj.deliverable_metadata, dict) else {}
        return {
            "id": obj.id,
            "project_id": obj.project_id,
            "title": obj.title,
            "status": obj.status,
            "client_reviewed_at": obj.client_reviewed_at.isoformat()
            if obj.client_reviewed_at
            else None,
            "client_feedback": meta.get("client_feedback"),
            "client_review_decision": meta.get("client_review_decision"),
        }

    async def list_reviews_for_deliverable(
        self, deliverable_id: str, *, workspace_id: int
    ) -> list[Dict[str, Any]]:
        q = (
            select(Os_deliverable_reviews)
            .where(
                Os_deliverable_reviews.deliverable_id == deliverable_id,
                Os_deliverable_reviews.workspace_id == workspace_id,
            )
            .order_by(Os_deliverable_reviews.created_at.desc())
        )
        result = await self.db.execute(q)
        rows = list(result.scalars().all())
        return [
            {
                "id": r.id,
                "deliverable_id": r.deliverable_id,
                "portal_user_id": r.portal_user_id,
                "decision": r.decision,
                "feedback": r.feedback,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
