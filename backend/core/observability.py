"""
OBS-ABCD-1 — Contexto de observabilidad y formato de logs estructurado.

Propaga request_id (middleware), workspace_id y user_id (dependencias) a
cada LogRecord vía ContextVar + ObservabilityFilter. Formato: JSON en
producción/staging cuando LOG_FORMAT=json; texto legible en dev/test.
"""
from __future__ import annotations

import json
import logging
import sys
import traceback
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any, Optional

# --- Context (una petición ASGI / thread de logging) ---
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="")
workspace_id_ctx: ContextVar[str] = ContextVar("obs_workspace_id", default="")
user_id_ctx: ContextVar[str] = ContextVar("obs_user_id", default="")


def get_request_id() -> str:
    return request_id_ctx.get() or ""


def get_workspace_id_for_log() -> str:
    return workspace_id_ctx.get() or ""


def get_user_id_for_log() -> str:
    return user_id_ctx.get() or ""


def set_user_id_for_log(user_id: str) -> None:
    user_id_ctx.set(user_id or "")


def set_workspace_id_for_log(workspace_id: Optional[int], header_hint: str = "") -> None:
    if workspace_id is not None:
        workspace_id_ctx.set(str(workspace_id))
    else:
        workspace_id_ctx.set((header_hint or "").strip())


def clear_log_context_tail() -> None:
    """Llamar al final de la petición (middleware): limpia tenant sin tocar request_id aquí."""
    user_id_ctx.set("")
    workspace_id_ctx.set("")


class ObservabilityFilter(logging.Filter):
    """Inyecta request_id, workspace_id, user_id en cada registro."""

    def filter(self, record: logging.LogRecord) -> bool:
        if not hasattr(record, "request_id"):
            record.request_id = get_request_id()
        if not hasattr(record, "workspace_id"):
            record.workspace_id = get_workspace_id_for_log()
        if not hasattr(record, "user_id"):
            record.user_id = get_user_id_for_log()
        return True


class NelvyonTextFormatter(logging.Formatter):
    """Una línea legible: timestamp, nivel, logger, contexto, mensaje."""

    def __init__(self) -> None:
        super().__init__(
            fmt=(
                "%(asctime)s | %(levelname)s | %(name)s | "
                "request_id=%(request_id)s workspace_id=%(workspace_id)s user_id=%(user_id)s | "
                "%(message)s"
            ),
            datefmt="%Y-%m-%d %H:%M:%S",
        )

    def format(self, record: logging.LogRecord) -> str:
        for k, default in (("request_id", ""), ("workspace_id", ""), ("user_id", "")):
            if not hasattr(record, k):
                setattr(record, k, default)
        return super().format(record)


class NelvyonJsonFormatter(logging.Formatter):
    """Una línea JSON (timestamp ISO, nivel, módulo, contexto, mensaje, excepción)."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "level": record.levelname,
            "module": record.name,
            "request_id": getattr(record, "request_id", None) or get_request_id(),
            "workspace_id": getattr(record, "workspace_id", None) or get_workspace_id_for_log(),
            "user_id": getattr(record, "user_id", None) or get_user_id_for_log(),
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exception"] = "".join(traceback.format_exception(*record.exc_info)).strip()
        elif record.exc_text:
            payload["exception"] = record.exc_text.strip()
        return json.dumps(payload, default=str, ensure_ascii=False)


def log_format_from_environment() -> str:
    """
    LOG_FORMAT=json|text — si no está definido: json en prod/staging, text en dev/test.
    """
    import os

    raw = (os.environ.get("LOG_FORMAT") or "").strip().lower()
    if raw in ("json", "text"):
        return raw
    env = (os.environ.get("ENVIRONMENT") or "production").lower()
    if env in ("production", "prod", "staging"):
        return "json"
    return "text"
