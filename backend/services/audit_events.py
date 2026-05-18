"""
AUDIT-RBAC-1: helper mínimo de auditoría sobre security_events.

No registra secretos (tokens/passwords). Guardar solo metadatos operativos.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Optional

from core.secrets import sanitize_for_logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def write_audit_event(
    db: AsyncSession,
    *,
    actor_user_id: str,
    actor_email: Optional[str],
    workspace_id: Optional[int],
    action: str,
    resource_type: str,
    resource_id: Optional[str],
    result: str,
    event_type: Optional[str] = None,
    source: str = "saas",
    severity: str = "info",
    commit: bool = False,
) -> None:
    """Append one structured audit event to security_events."""
    details = {
        "actor_user_id": actor_user_id,
        "actor_email": actor_email,
        "workspace_id": workspace_id,
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "result": result,
    }
    safe_details = sanitize_for_logging(details)
    etype = event_type or f"saas.{resource_type}.{action}"
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    try:
        await db.execute(
            text(
                """
                INSERT INTO security_events
                (user_id, event_type, severity, source, description, details_json, status, created_at)
                VALUES (:uid, :etype, :sev, :src, :desc, :details, :status, :now)
                """
            ),
            {
                "uid": actor_user_id,
                "etype": etype,
                "sev": severity,
                "src": source,
                "desc": f"{action} {resource_type} result={result}"[:500],
                "details": json.dumps(safe_details, default=str),
                "status": result,
                "now": now,
            },
        )
        if commit:
            await db.commit()
    except Exception as exc:
        logger.warning("write_audit_event failed: %s", exc, exc_info=True)
