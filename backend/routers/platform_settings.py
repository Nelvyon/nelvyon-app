"""
Platform Settings Router — v1
Company/account-level settings that apply across OS + SaaS.
Stored in nelvyon_user_settings with workspace_id = 0 (platform-level).

Settings categories:
  - Company: name, logo, timezone, language, currency
  - Security: session timeout, IP whitelist, 2FA enforcement
  - Notifications: global notification preferences
  - Integrations: API keys visibility, webhook URLs
"""
import json
import logging
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user, get_admin_user
from schemas.auth import UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/platform-settings", tags=["platform_settings"])

# Platform settings key = workspace_id 0
PLATFORM_WS_ID = 0


class PlatformSettingsResponse(BaseModel):
    company_name: str = "NELVYON"
    company_logo_url: str = ""
    timezone: str = "America/Mexico_City"
    language: str = "es"
    currency: str = "MXN"
    session_timeout_minutes: int = 480
    enforce_2fa: bool = False
    ip_whitelist: str = ""
    max_login_attempts: int = 5
    default_role_new_users: str = "user"
    notification_global_enabled: bool = True
    maintenance_mode: bool = False
    custom_branding_json: str = "{}"


class PlatformSettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    company_logo_url: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    currency: Optional[str] = None
    session_timeout_minutes: Optional[int] = None
    enforce_2fa: Optional[bool] = None
    ip_whitelist: Optional[str] = None
    max_login_attempts: Optional[int] = None
    default_role_new_users: Optional[str] = None
    notification_global_enabled: Optional[bool] = None
    maintenance_mode: Optional[bool] = None
    custom_branding_json: Optional[str] = None


async def _get_platform_settings_row(db: AsyncSession, user_id: str) -> Optional[dict]:
    """Get the platform settings row (workspace_id=0)."""
    result = await db.execute(
        text("""
            SELECT id, custom_theme_json FROM nelvyon_user_settings
            WHERE user_id = :uid AND workspace_id = :ws
            LIMIT 1
        """),
        {"uid": user_id, "ws": PLATFORM_WS_ID},
    )
    return dict(result.mappings().first()) if result.mappings().first() else None


def _parse_settings(raw_json: Optional[str]) -> dict:
    """Parse the custom_theme_json field as platform settings."""
    if not raw_json:
        return {}
    try:
        return json.loads(raw_json)
    except (json.JSONDecodeError, TypeError):
        return {}


async def _audit_settings(db: AsyncSession, user_id: str, changes: dict):
    """Log settings changes to audit trail."""
    try:
        await db.execute(
            text("""
                INSERT INTO security_events
                (user_id, event_type, severity, source, description, details_json, status, created_at)
                VALUES (:uid, 'settings.platform_updated', 'warning', 'settings',
                        :desc, :details, 'logged', :now)
            """),
            {
                "uid": user_id,
                "desc": f"Platform settings updated: {', '.join(changes.keys())}",
                "details": json.dumps(changes, default=str),
                "now": datetime.utcnow(),
            },
        )
    except Exception as e:
        logger.warning(f"Settings audit log failed: {e}")


@router.get("", response_model=PlatformSettingsResponse)
async def get_platform_settings(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get platform-level settings. Any authenticated user can read."""
    user_id = str(current_user.id)

    # Try to find platform settings row
    result = await db.execute(
        text("""
            SELECT custom_theme_json FROM nelvyon_user_settings
            WHERE workspace_id = :ws
            ORDER BY id ASC LIMIT 1
        """),
        {"ws": PLATFORM_WS_ID},
    )
    row = result.mappings().first()

    if row and row.get("custom_theme_json"):
        data = _parse_settings(row["custom_theme_json"])
        defaults = PlatformSettingsResponse().model_dump()
        defaults.update({k: v for k, v in data.items() if v is not None})
        return PlatformSettingsResponse(**defaults)

    return PlatformSettingsResponse()


@router.put("", response_model=PlatformSettingsResponse)
async def update_platform_settings(
    update: PlatformSettingsUpdate,
    current_user: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update platform-level settings. Admin only. All changes are audit-logged."""
    user_id = str(current_user.id)
    now = datetime.utcnow()

    # Get current settings
    result = await db.execute(
        text("""
            SELECT id, custom_theme_json FROM nelvyon_user_settings
            WHERE workspace_id = :ws
            ORDER BY id ASC LIMIT 1
        """),
        {"ws": PLATFORM_WS_ID},
    )
    row = result.mappings().first()

    current_data = _parse_settings(row["custom_theme_json"] if row else None)

    # Merge updates
    changes = {k: v for k, v in update.model_dump().items() if v is not None}
    if not changes:
        raise HTTPException(status_code=400, detail="No hay cambios para aplicar")

    current_data.update(changes)
    new_json = json.dumps(current_data, default=str)

    if row:
        await db.execute(
            text("""
                UPDATE nelvyon_user_settings
                SET custom_theme_json = :json
                WHERE id = :id
            """),
            {"json": new_json, "id": row["id"]},
        )
    else:
        await db.execute(
            text("""
                INSERT INTO nelvyon_user_settings
                (user_id, workspace_id, display_name, role, custom_theme_json)
                VALUES (:uid, :ws, 'Platform', 'admin', :json)
            """),
            {"uid": user_id, "ws": PLATFORM_WS_ID, "json": new_json},
        )

    await _audit_settings(db, user_id, changes)
    await db.commit()

    defaults = PlatformSettingsResponse().model_dump()
    defaults.update(current_data)
    return PlatformSettingsResponse(**defaults)