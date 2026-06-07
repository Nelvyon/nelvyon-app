"""OS production audit — security_events + structured logs for critical paths."""
from __future__ import annotations

import logging
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from services.audit_events import write_audit_event

logger = logging.getLogger(__name__)

OS_SYSTEM_ACTOR = "os-system"


async def record_os_event(
    db: AsyncSession,
    *,
    category: str,
    action: str,
    resource_type: str,
    resource_id: Optional[str],
    result: str,
    workspace_id: Optional[int] = None,
    actor_user_id: str = OS_SYSTEM_ACTOR,
    actor_email: Optional[str] = None,
    severity: str = "info",
    commit: bool = False,
) -> None:
    """Record OS operational/security event (upload, portal, email, download)."""
    logger.info(
        "os_event category=%s action=%s resource=%s/%s result=%s workspace_id=%s",
        category,
        action,
        resource_type,
        resource_id,
        result,
        workspace_id,
        extra={"os_category": category, "os_result": result},
    )
    try:
        await write_audit_event(
            db,
            actor_user_id=actor_user_id,
            actor_email=actor_email,
            workspace_id=workspace_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            result=result,
            event_type=f"os.{category}.{action}",
            source="os",
            severity=severity if result != "error" else "warning",
            commit=commit,
        )
    except Exception as exc:
        logger.warning("record_os_event failed: %s", exc)
