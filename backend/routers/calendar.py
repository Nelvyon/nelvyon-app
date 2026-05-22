"""Google Calendar API — events, free slots, bidirectional sync."""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Any, List, Optional

from core.secrets import sanitize_text
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.calendar_service import get_calendar_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


class CreateEventBody(BaseModel):
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    start: datetime
    end: datetime
    calendar_id: Optional[str] = None
    attendees: Optional[List[EmailStr]] = None
    meet_link: bool = True


class UpdateEventBody(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    attendees: Optional[List[EmailStr]] = None
    meet_link: Optional[str] = None
    status: Optional[str] = None


class SyncBody(BaseModel):
    calendar_id: Optional[str] = None


def _svc(db: AsyncSession, ws: WorkspaceContext):
    return get_calendar_service(db, ws.workspace_id)


@router.get("/events")
async def list_calendar_events(
    start: datetime = Query(..., description="Range start (ISO datetime)"),
    end: datetime = Query(..., description="Range end (ISO datetime)"),
    calendar_id: str | None = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        items = await _svc(db, ws_ctx).list_local_events(start, end, calendar_id=calendar_id)
        return {"items": items, "total": len(items), "calendar_id": calendar_id or _svc(db, ws_ctx).default_calendar_id()}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/events", status_code=201)
async def create_calendar_event(
    body: CreateEventBody,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = _svc(db, ws_ctx)
    try:
        attendees = [str(e) for e in body.attendees] if body.attendees else None
        return await svc.create_local_event(
            calendar_id=body.calendar_id or svc.default_calendar_id(),
            title=body.title,
            description=body.description,
            start=body.start,
            end=body.end,
            attendees=attendees,
            with_meet=body.meet_link,
            push_google=True,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("create_calendar_event: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/slots")
async def get_calendar_slots(
    day: date = Query(..., description="Day to check (YYYY-MM-DD)"),
    duration_minutes: int = Query(30, ge=15, le=480),
    calendar_id: str | None = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = _svc(db, ws_ctx)
    try:
        slots = await svc.get_free_slots(
            calendar_id or svc.default_calendar_id(),
            day,
            duration_minutes=duration_minutes,
        )
        return {"date": day.isoformat(), "duration_minutes": duration_minutes, "slots": slots}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/sync")
async def sync_calendar(
    body: SyncBody | None = None,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = _svc(db, ws_ctx)
    cal = (body.calendar_id if body else None) or svc.default_calendar_id()
    try:
        return await svc.sync_events(cal)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("sync_calendar: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.patch("/events/{event_id}")
async def update_calendar_event(
    event_id: int,
    body: UpdateEventBody,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = _svc(db, ws_ctx)
    payload: dict[str, Any] = {k: v for k, v in body.model_dump().items() if v is not None}
    if body.attendees is not None:
        payload["attendees"] = [{"email": str(e)} for e in body.attendees]
    try:
        return await svc.update_local_event(event_id, payload)
    except ValueError as e:
        status = 404 if "not found" in str(e).lower() else 400
        raise HTTPException(status_code=status, detail=str(e))


@router.delete("/events/{event_id}")
async def delete_calendar_event(
    event_id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = _svc(db, ws_ctx)
    try:
        return await svc.delete_local_event(event_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
