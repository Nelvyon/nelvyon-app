"""
OBS-1 FASE 1 — Emisión centralizada de logs con cuerpo JSON en el mensaje.

Una sola línea `logger.log(level, "%s", json_line)` compatible con
`NelvyonJsonFormatter` / texto: el mensaje del registro es JSON parseable
con campos fijos (event, message, request_id, workspace_id, user_id) más
extras. Los textos pasan por SECRETS-1 (`sanitize_text` / `sanitize_for_logging`).
"""
from __future__ import annotations

import json
import logging
from typing import Any, Mapping, Optional

from core.observability import get_request_id, get_user_id_for_log, get_workspace_id_for_log
from core.secrets import sanitize_for_logging, sanitize_text


def _scrub_value(val: Any) -> Any:
    if isinstance(val, str):
        return sanitize_text(val)
    if isinstance(val, Mapping):
        return sanitize_for_logging(dict(val))
    if isinstance(val, (list, tuple)):
        return [_scrub_value(x) for x in val]
    return val


def log_structured(
    logger: logging.Logger,
    level: int,
    event: str,
    message: str = "",
    *,
    exc_info: Any = None,
    **fields: Any,
) -> None:
    """
    Registra un evento con contexto de observabilidad (ContextVar) y campos extra.

    :param exc_info: igual que en `logging.Logger.log` (excepción o True) para adjuntar stack al LogRecord.
    """
    payload: dict[str, Any] = {
        "event": sanitize_text(event),
        "message": sanitize_text(message),
        "request_id": get_request_id() or None,
        "workspace_id": get_workspace_id_for_log() or None,
        "user_id": get_user_id_for_log() or None,
    }
    for k, v in fields.items():
        payload[k] = _scrub_value(v)
    line = json.dumps(payload, default=str, ensure_ascii=False)
    logger.log(level, "%s", line, exc_info=exc_info)
