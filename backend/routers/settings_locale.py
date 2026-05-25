"""Frente 56 — User language & workspace timezone settings."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from models.auth import User
from routers.tenant_management import LOCALES, TIMEZONES

logger = logging.getLogger(__name__)

settings_locale_router = APIRouter(prefix="/api/settings", tags=["settings"])
router = settings_locale_router

DASHBOARD_LOCALES = ["es", "en", "fr", "pt", "de", "it"]


class LanguageBody(BaseModel):
    language: str = Field(..., pattern="^(es|en|fr|pt|de|it)$")


class TimezoneBody(BaseModel):
    timezone: str
    date_format: str | None = Field(default=None, pattern="^(DD/MM/YYYY|MM/DD/YYYY|YYYY-MM-DD)$")


@settings_locale_router.put("/language")
async def set_user_language(
    body: LanguageBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.language not in DASHBOARD_LOCALES:
        raise HTTPException(status_code=400, detail=f"Invalid language. Valid: {DASHBOARD_LOCALES}")
    await db.execute(
        text("UPDATE users SET language = :lang WHERE id = :uid"),
        {"lang": body.language, "uid": current_user.id},
    )
    await db.commit()
    return {"language": body.language, "user_id": current_user.id}


@settings_locale_router.get("/language")
async def get_user_language(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = await db.execute(
        text("SELECT language FROM users WHERE id = :uid"),
        {"uid": current_user.id},
    )
    lang = row.scalar_one_or_none()
    return {"language": lang or "es", "supported": DASHBOARD_LOCALES}


@settings_locale_router.get("/timezones")
async def list_timezones():
    return {
        "timezones": TIMEZONES,
        "locales": [l for l in LOCALES if l in DASHBOARD_LOCALES],
        "date_formats": ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"],
    }


@settings_locale_router.put("/timezone")
async def set_workspace_timezone(
    body: TimezoneBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    if body.timezone not in TIMEZONES:
        raise HTTPException(status_code=400, detail="Invalid timezone")
    sets = ["timezone = :tz", "updated_at = CURRENT_TIMESTAMP"]
    params: dict = {"tz": body.timezone, "ws": ws.workspace_id}
    if body.date_format:
        sets.append("date_format = :df")
        params["df"] = body.date_format
    await db.execute(
        text(f"UPDATE workspaces SET {', '.join(sets)} WHERE id = :ws"),
        params,
    )
    await db.commit()
    return {"workspace_id": ws.workspace_id, "timezone": body.timezone, "date_format": body.date_format}


@settings_locale_router.get("/region")
async def get_region_settings(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ws_row = await db.execute(
        text("SELECT timezone, locale, date_format FROM workspaces WHERE id = :ws"),
        {"ws": ws.workspace_id},
    )
    workspace = ws_row.mappings().first() or {}
    user_row = await db.execute(
        text("SELECT language FROM users WHERE id = :uid"),
        {"uid": current_user.id},
    )
    language = user_row.scalar_one_or_none() or workspace.get("locale") or "es"
    return {
        "language": language,
        "timezone": workspace.get("timezone") or "Europe/Madrid",
        "date_format": workspace.get("date_format") or "DD/MM/YYYY",
        "workspace_locale": workspace.get("locale") or "es",
    }
