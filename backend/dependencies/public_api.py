"""Frente 54 — Public API authentication (X-API-Key) and rate limiting."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.redis_adapter import redis_client
from services.api_keys_service import get_api_keys_service
from services.tenant_service import TenantService

PUBLIC_RATE_LIMIT = 1000
PUBLIC_RATE_WINDOW = 3600

SCOPE_ALIASES: dict[str, frozenset[str]] = {
    "contacts": frozenset({"contacts", "crm", "read", "write", "admin"}),
    "campaigns": frozenset({"campaigns", "write", "admin"}),
    "chatbot": frozenset({"chatbot", "write", "admin"}),
    "forms": frozenset({"forms", "write", "admin"}),
    "analytics": frozenset({"analytics", "read", "write", "admin"}),
    "workflows": frozenset({"workflows", "write", "admin"}),
}


@dataclass
class PublicAPIContext:
    workspace_id: int
    api_key_id: str
    scopes: list[str]
    key_name: str


def _has_scope(scopes: list[str], required: str) -> bool:
    allowed = SCOPE_ALIASES.get(required, frozenset({required}))
    normalized = {s.strip().lower() for s in scopes}
    return bool(normalized & allowed)


def require_public_scope(required: str):
    async def _dep(ctx: PublicAPIContext = Depends(get_public_api_context)) -> PublicAPIContext:
        if not _has_scope(ctx.scopes, required):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"API key missing scope: {required}",
            )
        return ctx

    return _dep


async def get_public_api_context(
    request: Request,
    x_api_key: Annotated[str | None, Header(alias="X-API-Key")] = None,
    db: AsyncSession = Depends(get_db),
) -> PublicAPIContext:
    raw = (x_api_key or request.headers.get("X-API-Key") or "").strip()
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-API-Key header",
        )

    record = await get_api_keys_service(db).validate_api_key(raw)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked API key",
        )

    key_id = str(record["id"])
    rl_key = f"public_api:{key_id}"
    rl = await redis_client.check_rate_limit(rl_key, PUBLIC_RATE_LIMIT, PUBLIC_RATE_WINDOW)
    if not rl.get("allowed"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests",
            headers={"Retry-After": str(max(1, int(rl.get("reset_in") or PUBLIC_RATE_WINDOW)))},
        )

    workspace_id = int(record["workspace_id"])
    await TenantService(db).set_tenant_context(workspace_id)
    request.state.tenant_id = workspace_id
    request.state.api_key_workspace_id = workspace_id

    scopes = record.get("scopes") or []
    if isinstance(scopes, str):
        import json

        scopes = json.loads(scopes)

    return PublicAPIContext(
        workspace_id=workspace_id,
        api_key_id=key_id,
        scopes=list(scopes),
        key_name=str(record.get("name") or ""),
    )
