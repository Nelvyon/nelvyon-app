"""Redis list-endpoint cache decorator (TTL 60s default)."""

from __future__ import annotations

from typing import Callable, TypeVar

from services.cache_service import cached

LIST_CACHE_TTL = 60
F = TypeVar("F", bound=Callable)


def list_cached(prefix: str) -> Callable[[F], F]:
    """Apply standard 60s cache to workspace list GET handlers."""
    return cached(ttl=LIST_CACHE_TTL, prefix=f"list:{prefix}")
