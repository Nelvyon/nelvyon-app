import hashlib
import logging
from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import AccessTokenError, decode_access_token
from core.database import get_db
from core.i18n import request_language, t
from core.observability import set_user_id_for_log
from fastapi import Cookie, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from schemas.auth import UserResponse

logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer(auto_error=False)


async def get_access_token(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    nelvyon_session: Optional[str] = Cookie(default=None),
) -> str:
    """Prefer Authorization Bearer (API clients); else HttpOnly session cookie (browser)."""
    if credentials and credentials.scheme.lower() == "bearer":
        return credentials.credentials
    if nelvyon_session:
        return nelvyon_session

    logger.debug("Authentication required for request %s %s", request.method, request.url.path)
    lang = request_language(request)
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=t("auth_required", lang),
    )


async def get_current_user(
    request: Request,
    token: str = Depends(get_access_token),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Dependency to get current authenticated user via JWT or API key (nlv_)."""
    if token.startswith("nlv_"):
        from services.api_keys_service import get_api_keys_service

        record = await get_api_keys_service(db).validate_api_key(token)
        if not record:
            lang = request_language(request)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=t("auth_required", lang),
            )
        request.state.api_key_id = record["id"]
        request.state.api_key_workspace_id = record["workspace_id"]
        request.state.api_key_scopes = record.get("scopes") or []
        set_user_id_for_log(f"apikey:{record['id']}")
        request.state.obs_user_id = f"apikey:{record['id']}"
        return UserResponse(
            id=f"apikey:{record['id']}",
            email=f"api-key@workspace-{record['workspace_id']}.nelvyon.local",
            name=record.get("name") or "API Key",
            role="api_key",
        )

    payload = None
    try:
        payload = decode_access_token(token)
    except AccessTokenError:
        from core.nelvyon_jwt import try_decode_nelvyon_app_token

        payload = try_decode_nelvyon_app_token(token)
        if payload is None:
            logger.warning("Token validation failed: invalid app or nelvyon token")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token")

    last_login_raw = payload.get("last_login")
    last_login = None
    if isinstance(last_login_raw, str):
        try:
            last_login = datetime.fromisoformat(last_login_raw)
        except ValueError:
            # Log user hash instead of actual user ID to avoid exposing sensitive information
            user_hash = hashlib.sha256(str(user_id).encode()).hexdigest()[:8] if user_id else "unknown"
            logger.debug("Failed to parse last_login for user hash: %s", user_hash)

    set_user_id_for_log(str(user_id))
    request.state.obs_user_id = str(user_id)
    return UserResponse(
        id=user_id,
        email=payload.get("email", ""),
        name=payload.get("name"),
        role=payload.get("role", "user"),
        last_login=last_login,
    )


async def get_admin_user(
    request: Request,
    current_user: UserResponse = Depends(get_current_user),
) -> UserResponse:
    """Dependency: user must be admin or super_admin (platform operators)."""
    if current_user.role not in ("admin", "super_admin"):
        lang = request_language(request)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=t("admin_required", lang),
        )
    return current_user


async def get_super_admin_user(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    """Dependency: user must be super_admin only."""
    if current_user.role != "super_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super admin access required")
    return current_user
