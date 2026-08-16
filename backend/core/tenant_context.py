"""Request-scoped tenant context (maps to workspace_id)."""

from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar
from typing import Iterator, Optional

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


@contextmanager
def contexto_de_inquilino(
    tenant_id: int | None, user_id: str | None = None
) -> Iterator[None]:
    """Fija el contexto de inquilino en un camino que corre FUERA de una peticion.

    POR QUE HACE FALTA
    ------------------
    El ContextVar lo puebla `middleware/tenant.py`, y solo durante una peticion
    HTTP. Un job de cola, un bucle de cron o un hilo nuevo nacen con el
    ContextVar VACIO; el enganche `after_begin` de `core/contexto_rls.py` no
    tiene entonces nada que fijar, y bajo un rol sin BYPASSRLS eso no da error:
    devuelve cero filas. Un job que no encuentra trabajo no se distingue de un
    job que no tiene permiso para verlo.

    Quien conoce su inquilino —y casi todos los caminos de fondo lo conocen,
    porque llevan `workspace_id` en la carga— lo declara aqui explicitamente.

    RESTAURA AL SALIR
    -----------------
    Usa tokens (`ContextVar.reset`) en vez de `set(None)`. Si un job se ejecuta
    dentro del mismo contexto que otra cosa —por ejemplo una tarea lanzada desde
    una peticion—, dejar el contexto a None al terminar le robaria el suyo al
    llamador. Con tokens, el contexto queda exactamente como estaba.
    """
    token_tenant = _tenant_id.set(int(tenant_id) if tenant_id is not None else None)
    token_user = _tenant_user_id.set(str(user_id) if user_id else None)
    try:
        yield
    finally:
        _tenant_id.reset(token_tenant)
        _tenant_user_id.reset(token_user)
