"""Portal client auth dependency — JWT scoped to client_id + workspace_id."""
from __future__ import annotations

import logging
from dataclasses import dataclass

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from core.auth import AccessTokenError, decode_access_token
from core.i18n import request_language, t

logger = logging.getLogger(__name__)

portal_bearer = HTTPBearer(auto_error=False)


@dataclass
class PortalContext:
    portal_user_id: str
    email: str
    workspace_id: int
    client_id: str
    name: str | None = None


async def require_portal_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(portal_bearer),
) -> PortalContext:
    if not credentials or credentials.scheme.lower() != "bearer":
        lang = request_language(request)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=t("auth_required", lang),
        )

    try:
        payload = decode_access_token(credentials.credentials)
    except AccessTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=exc.message,
        ) from exc

    if not payload.get("portal"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Portal authentication required",
        )

    sub = payload.get("sub")
    client_id = payload.get("client_id")
    workspace_raw = payload.get("workspace_id")
    email = payload.get("email") or ""

    if not sub or not client_id or workspace_raw is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid portal token",
        )

    try:
        workspace_id = int(workspace_raw)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid portal token",
        ) from exc

    return PortalContext(
        portal_user_id=str(sub),
        email=str(email),
        workspace_id=workspace_id,
        client_id=str(client_id),
        name=payload.get("name"),
    )
