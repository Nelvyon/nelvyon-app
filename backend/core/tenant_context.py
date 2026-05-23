"""Request-scoped tenant context (maps to workspace_id)."""

from __future__ import annotations

from contextvars import ContextVar
from typing import Optional

_tenant_id: ContextVar[Optional[int]] = ContextVar("tenant_id", default=None)
_tenant_user_id: ContextVar[Optional[str]] = ContextVar("tenant_user_id", default=None)


def set_tenant_context(tenant_id: int | None, user_id: str | None = None) -> None:
    _tenant_id.set(int(tenant_id) if tenant_id is not None else None)
    _tenant_user_id.set(user_id)


def get_tenant_context() -> int | None:
    """Return tenant_id (workspace) for the current request, if set."""
    return _tenant_id.get()


def get_tenant_user_id() -> str | None:
    return _tenant_user_id.get()


def clear_tenant_context() -> None:
    _tenant_id.set(None)
    _tenant_user_id.set(None)
