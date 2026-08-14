"""Bookings API — Zoom meetings, calendar slots, confirmations."""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Any, Optional

from core.secrets import sanitize_text
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.zoom_webhook_signature import (
    CABECERA_FIRMA,
    CABECERA_TS,
    _secreto as _secreto_zoom,
    token_de_validacion,
    verificar_firma_zoom,
)
from core.list_cache import list_cached
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.booking_service import get_booking_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


class ClientData(BaseModel):
    client_name: str = Field(..., min_length=1)
    client_email: EmailStr
    client_phone: Optional[str] = None


class CreateBookingBody(BaseModel):
    client: ClientData
    service_name: str = Field(..., min_length=1)
    start_at: datetime
    duration_minutes: int = Field(30, ge=15, le=480)
    notes: Optional[str] = None
    auto_confirm: bool = True


class CancelBookingBody(BaseModel):
    reason: Optional[str] = None


def _svc(db: AsyncSession, ws: WorkspaceContext):
    return get_booking_service(db, ws.workspace_id, ws.user_id)


@router.post("/webhook/zoom")
async def zoom_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Webhook de Zoom.

    La firma se comprueba ANTES de mirar el cuerpo. Sin ella cualquiera podia
    inventar eventos de reunion en la agenda de un cliente, eligiendo ademas el
    inquilino con `?workspace_id=`.

    Zoom firma sobre `v0:<timestamp>:<cuerpo>` e incluye el timestamp, asi que
    la verificacion tambien acota la reproduccion: un mensaje capturado deja de
    valer pasados cinco minutos.
    """
    cuerpo = await request.body()
    verificar_firma_zoom(
        cuerpo,
        request.headers.get(CABECERA_FIRMA),
        request.headers.get(CABECERA_TS),
    )
    try:
        payload = await request.json()
    except Exception:
        payload = {}

    # El reto de configuracion viene firmado igual que el resto, asi que llega
    # aqui ya verificado: responderlo no abre ninguna puerta.
    if payload.get("event") == "endpoint.url_validation":
        plain = (payload.get("payload") or {}).get("plainToken", "")
        return {
            "plainToken": plain,
            "encryptedToken": token_de_validacion(_secreto_zoom(), plain),
        }
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="JSON body required")

    workspace_id = request.query_params.get("workspace_id")
    if workspace_id:
        try:
            ws_id = int(workspace_id)
            svc = get_booking_service(db, ws_id, "zoom-webhook")
            return await svc.handle_zoom_webhook(payload)
        except ValueError:
            pass

    logger.info("Zoom webhook received: %s", payload.get("event"))
    return {"received": True, "event": payload.get("event")}


@router.get("/slots")
async def booking_slots(
    day: date = Query(..., description="Day YYYY-MM-DD"),
    duration_minutes: int = Query(30, ge=15, le=480),
    calendar_id: str | None = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        slots = await _svc(db, ws_ctx).get_available_slots(day, duration_minutes, calendar_id)
        return {"date": day.isoformat(), "duration_minutes": duration_minutes, "slots": slots}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("")
@list_cached("bookings")
async def list_bookings(
    status: str | None = Query(None),
    start_date: datetime | None = Query(None),
    end_date: datetime | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await _svc(db, ws_ctx).list_bookings(
        status=status,
        start_date=start_date,
        end_date=end_date,
        skip=skip,
        limit=limit,
    )


@router.post("", status_code=201)
async def create_booking(
    body: CreateBookingBody,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws_ctx).create_booking(
            client_data=body.client.model_dump(),
            service=body.service_name,
            start_at=body.start_at,
            duration=body.duration_minutes,
            notes=body.notes,
            auto_confirm=body.auto_confirm,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("create_booking: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{booking_id}")
async def get_booking(
    booking_id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws_ctx).get_booking(booking_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Booking not found")


@router.patch("/{booking_id}/confirm")
async def confirm_booking(
    booking_id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws_ctx).confirm_booking(booking_id)
    except ValueError as e:
        status = 404 if "not found" in str(e).lower() else 400
        raise HTTPException(status_code=status, detail=str(e))


@router.patch("/{booking_id}/cancel")
async def cancel_booking(
    booking_id: int,
    body: CancelBookingBody | None = None,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    reason = body.reason if body else None
    try:
        return await _svc(db, ws_ctx).cancel_booking(booking_id, reason)
    except ValueError as e:
        status = 404 if "not found" in str(e).lower() else 400
        raise HTTPException(status_code=status, detail=str(e))
