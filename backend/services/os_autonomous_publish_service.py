"""Phase D — controlled staging publish from OsPublishPayload to os_deliverables."""
from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional, Union

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.os_deliverables import Os_deliverables
from services.os_audit_service import record_os_event
from services.os_deliverables_service import OsDeliverablesService

logger = logging.getLogger(__name__)

QA_THRESHOLD = 85.0
AUTONOMOUS_PHASE = "D"


def is_autonomous_production_enabled() -> bool:
    """AUTONOMOUS_PRODUCTION defaults to false — staging writes require explicit opt-in."""
    raw = os.getenv("AUTONOMOUS_PRODUCTION", "false").strip().lower()
    return raw in ("true", "1", "yes", "on")


def _parse_workspace_id(value: Union[str, int, None]) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(str(value).strip())
    except (ValueError, TypeError):
        return None


def _map_deliverable_type(dtype: str) -> str:
    normalized = (dtype or "file").strip().lower()
    if normalized in ("url", "file", "json", "document", "report"):
        return normalized
    return "file"


def _build_metadata(
    *,
    payload: Dict[str, Any],
    deliverable: Dict[str, Any],
    actor_user_id: str,
) -> Dict[str, Any]:
    meta: Dict[str, Any] = {
        "autonomous_provenance": True,
        "autonomous_phase": AUTONOMOUS_PHASE,
        "autonomous_job_id": payload.get("autonomous_job_id"),
        "autonomous_project_id": payload.get("project_id"),
        "qa_score": payload.get("qa_score"),
        "requested_visibility": deliverable.get("visibility"),
        "artifact_type": deliverable.get("type"),
        "artifact_value": deliverable.get("value"),
        "actor_user_id": actor_user_id,
    }
    artifacts = payload.get("artifacts")
    if artifacts:
        meta["artifacts"] = artifacts
    if payload.get("handoff_email_draft"):
        meta["handoff_email_draft"] = payload["handoff_email_draft"]
    if payload.get("note"):
        meta["note"] = payload["note"]
    if payload.get("sector"):
        meta["sector"] = payload["sector"]
        meta["sector_phase"] = "E"
    if payload.get("os_actions"):
        meta["os_actions_planned"] = payload["os_actions"]
    os_refs = payload.get("os_refs") or {}
    if os_refs.get("project_slug"):
        meta["project_slug"] = os_refs["project_slug"]
    return meta


class OsAutonomousPublishService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.deliverables = OsDeliverablesService(db)

    async def _count_deliverables(self, workspace_id: int) -> int:
        q = select(func.count(Os_deliverables.id)).where(
            Os_deliverables.workspace_id == workspace_id
        )
        result = await self.db.execute(q)
        return int(result.scalar_one() or 0)

    async def publish(
        self,
        payload: Dict[str, Any],
        *,
        workspace_id: int,
        actor_user_id: str,
        actor_email: Optional[str] = None,
    ) -> Dict[str, Any]:
        qa_score = float(payload.get("qa_score") or 0)
        if qa_score < QA_THRESHOLD:
            raise ValueError(
                f"qa_score must be >= {QA_THRESHOLD:.0f} (received {qa_score:.1f})"
            )

        os_refs = payload.get("os_refs") or {}
        refs_ws = _parse_workspace_id(os_refs.get("workspace_id"))
        if refs_ws is not None and refs_ws != workspace_id:
            raise LookupError("workspace_id mismatch")

        client_id = (os_refs.get("client_id") or "").strip()
        project_id = (os_refs.get("project_id") or "").strip()
        if not client_id:
            raise ValueError("os_refs.client_id is required")
        if not project_id:
            raise ValueError("os_refs.project_id is required")

        deliverables_in = payload.get("deliverables") or []
        if not deliverables_in:
            raise ValueError("deliverables must contain at least one item")

        await self.deliverables._resolve_fks(
            workspace_id=workspace_id,
            client_id=client_id,
            project_id=project_id,
            task_id=None,
        )

        dry_run = bool(payload.get("dry_run", True))
        production_enabled = is_autonomous_production_enabled()

        preview = [
            {
                "title": (d.get("label") or "").strip(),
                "type": _map_deliverable_type(d.get("type") or "file"),
                "status": "in_review",
                "visibility": "internal",
                "file_url": d.get("value") if d.get("type") == "url" else None,
                "metadata": _build_metadata(
                    payload=payload, deliverable=d, actor_user_id=actor_user_id
                ),
            }
            for d in deliverables_in
        ]

        if dry_run:
            return {
                "dry_run": True,
                "production_enabled": production_enabled,
                "written": False,
                "qa_score": qa_score,
                "deliverables_preview": preview,
                "created": [],
                "message": "Dry-run: no database writes performed",
            }

        if not production_enabled:
            raise PermissionError(
                "AUTONOMOUS_PRODUCTION is disabled — set AUTONOMOUS_PRODUCTION=true for controlled staging writes"
            )

        created: List[Dict[str, Any]] = []
        for item in deliverables_in:
            label = (item.get("label") or "").strip()
            if not label:
                raise ValueError("each deliverable must have a non-empty label")

            dtype = _map_deliverable_type(item.get("type") or "file")
            value = item.get("value")

            obj = await self.deliverables.create(
                {
                    "client_id": client_id,
                    "project_id": project_id,
                    "title": label,
                    "type": dtype,
                    "status": "in_review",
                    "visibility": "internal",
                    "file_url": value if dtype == "url" and value else None,
                    "metadata": _build_metadata(
                        payload=payload, deliverable=item, actor_user_id=actor_user_id
                    ),
                },
                workspace_id=workspace_id,
            )
            created.append(
                {
                    "id": obj.id,
                    "title": obj.title,
                    "status": obj.status,
                    "visibility": obj.visibility,
                    "type": obj.type,
                }
            )

        await record_os_event(
            self.db,
            category="autonomous",
            action="publish",
            resource_type="os_deliverables",
            resource_id=created[0]["id"] if created else None,
            result="success",
            workspace_id=workspace_id,
            actor_user_id=actor_user_id,
            actor_email=actor_email,
            commit=True,
        )

        logger.info(
            "autonomous_publish workspace=%s job=%s created=%d dry_run=false",
            workspace_id,
            payload.get("autonomous_job_id"),
            len(created),
        )

        return {
            "dry_run": False,
            "production_enabled": True,
            "written": True,
            "qa_score": qa_score,
            "created": created,
            "deliverables_preview": preview,
            "message": f"Created {len(created)} deliverable(s) in in_review/internal staging",
        }
