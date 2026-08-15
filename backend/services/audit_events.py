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
        # Un fallo de auditoria no puede desaparecer como un `warning` entre
        # miles. Se registra a nivel ERROR con lo minimo para reconstruir el
        # evento perdido: identificadores, accion y resultado. Nunca el
        # payload completo, que puede llevar PII o secretos.
        logger.error(
            "audit_event_persist_failed",
            extra={
                "audit_event_type": event_type or action,
                "audit_action": action,
                "audit_result": result,
                "audit_actor_user_id": actor_user_id,
                "audit_workspace_id": workspace_id,
                "audit_resource_type": resource_type,
                "audit_resource_id": resource_id,
                "audit_persist_error": str(exc)[:300],
            },
            exc_info=True,
        )
        raise AuditPersistError(str(exc)) from exc

class AuditPersistError(RuntimeError):
    """La auditoria no pudo persistirse. Quien llama decide si es fatal."""


async def write_audit_event_required(db: AsyncSession, **kwargs) -> None:
    """Auditoria OBLIGATORIA: sin registro, no hay side effect.

    Para dinero, permisos, credenciales, integraciones y acciones
    administrativas. Debe invocarse ANTES del efecto, no despues: auditar
    despues y fallar dejaria la accion hecha y la respuesta en error, que es
    justo lo que provoca reintentos y duplicados.
    """
    await write_audit_event(db, **kwargs)


async def write_audit_event_best_effort(db: AsyncSession, **kwargs) -> None:
    """Auditoria NO bloqueante, pero nunca silenciosa.

    Para denegaciones de autorizacion y telemetria. Una dependencia de
    auditoria rota no puede convertir un 403 correcto en un 500: la decision de
    seguridad ya se tomo bien. El fallo queda como ERROR estructurado, no como
    `warning` irrelevante.
    """
    try:
        await write_audit_event(db, **kwargs)
    except AuditPersistError:
        pass  # ya registrado como ERROR estructurado en write_audit_event
