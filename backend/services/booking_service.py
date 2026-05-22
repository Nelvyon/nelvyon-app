"""NELVYON bookings — Zoom meetings, calendar slots, SES notifications."""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from services.calendar_service import get_calendar_service
from services.ses_service import get_ses_service
from services.zoom_service import get_zoom_service

logger = logging.getLogger(__name__)

BOOKING_STATUSES = frozenset({"pending", "confirmed", "cancelled", "completed", "no_show"})


def _row_to_dict(row: Any) -> dict[str, Any]:
    if row is None:
        return {}
    data = dict(row._mapping)
    for key, val in list(data.items()):
        if isinstance(val, datetime):
            data[key] = val.isoformat()
    return data


def _parse_dt(value: datetime | str) -> datetime:
    if isinstance(value, datetime):
        dt = value
    else:
        raw = str(value).strip()
        if raw.endswith("Z"):
            raw = raw[:-1] + "+00:00"
        dt = datetime.fromisoformat(raw)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


class BookingService:
    """Workspace-scoped bookings with Zoom + calendar availability."""

    def __init__(self, session: AsyncSession, workspace_id: int, host_user_id: str):
        if workspace_id is None:
            raise ValueError("workspace_id is required")
        if not host_user_id:
            raise ValueError("host_user_id is required")
        self.session = session
        self.workspace_id = int(workspace_id)
        self.host_user_id = str(host_user_id)

    async def _send_email(self, to_email: str, subject: str, html: str) -> dict[str, Any]:
        ses = get_ses_service()
        return await ses.send_email(to_email, subject, html)

    def _confirmation_html(self, booking: dict[str, Any], *, cancelled: bool = False) -> str:
        if cancelled:
            return (
                f"<p>Hola {booking.get('client_name', '')},</p>"
                f"<p>Tu reserva de <strong>{booking.get('service_name')}</strong> "
                f"programada para el {booking.get('start_at', '')[:16]} ha sido <strong>cancelada</strong>.</p>"
                f"<p>NELVYON</p>"
            )
        join = booking.get("zoom_join_url") or ""
        return (
            f"<p>Hola {booking.get('client_name', '')},</p>"
            f"<p>Tu reserva está <strong>confirmada</strong>:</p>"
            f"<ul>"
            f"<li><strong>Servicio:</strong> {booking.get('service_name')}</li>"
            f"<li><strong>Inicio:</strong> {booking.get('start_at', '')[:16]}</li>"
            f"<li><strong>Duración:</strong> {booking.get('duration_minutes')} min</li>"
            f"</ul>"
            f"<p><a href=\"{join}\">Unirse a Zoom</a></p>"
            f"<p>NELVYON</p>"
        )

    async def create_booking(
        self,
        client_data: dict[str, Any],
        service: str,
        start_at: datetime | str,
        duration: int,
        *,
        notes: str | None = None,
        auto_confirm: bool = True,
    ) -> dict[str, Any]:
        client_name = (client_data.get("client_name") or client_data.get("name") or "").strip()
        client_email = (client_data.get("client_email") or client_data.get("email") or "").strip()
        if not client_name or not client_email:
            raise ValueError("client_name and client_email are required")

        service_name = (service or client_data.get("service_name") or "").strip()
        if not service_name:
            raise ValueError("service name is required")

        duration_minutes = int(duration or client_data.get("duration_minutes") or 30)
        start_dt = _parse_dt(start_at)
        end_dt = start_dt + timedelta(minutes=duration_minutes)

        zoom = get_zoom_service()
        topic = f"{service_name} — {client_name}"
        agenda = notes or f"Reserva NELVYON · {client_email}"
        meeting = await zoom.create_meeting(topic, start_dt, duration_minutes, agenda)

        status = "confirmed" if auto_confirm else "pending"
        result = await self.session.execute(
            text(
                """
                INSERT INTO bookings (
                    workspace_id, host_user_id, client_name, client_email, client_phone,
                    service_name, duration_minutes, start_at, end_at, status,
                    zoom_meeting_id, zoom_join_url, zoom_host_url, notes, created_at
                )
                VALUES (
                    :workspace_id, :host_user_id, :client_name, :client_email, :client_phone,
                    :service_name, :duration_minutes, :start_at, :end_at, :status,
                    :zoom_meeting_id, :zoom_join_url, :zoom_host_url, :notes, :created_at
                )
                RETURNING *
                """
            ),
            {
                "workspace_id": self.workspace_id,
                "host_user_id": self.host_user_id,
                "client_name": client_name,
                "client_email": client_email,
                "client_phone": client_data.get("client_phone") or client_data.get("phone"),
                "service_name": service_name,
                "duration_minutes": duration_minutes,
                "start_at": start_dt,
                "end_at": end_dt,
                "status": status,
                "zoom_meeting_id": str(meeting.get("id", "")),
                "zoom_join_url": meeting.get("join_url"),
                "zoom_host_url": meeting.get("start_url"),
                "notes": notes,
                "created_at": datetime.now(timezone.utc),
            },
        )
        booking = _row_to_dict(result.fetchone())
        await self.session.commit()

        if status == "confirmed":
            await self._send_email(
                client_email,
                f"Reserva confirmada — {service_name}",
                self._confirmation_html(booking),
            )

        return booking

    async def confirm_booking(self, booking_id: int) -> dict[str, Any]:
        booking = await self.get_booking(booking_id)
        if booking.get("status") == "cancelled":
            raise ValueError("Cannot confirm a cancelled booking")
        if booking.get("status") == "confirmed":
            return booking

        await self.session.execute(
            text(
                """
                UPDATE bookings SET status = 'confirmed'
                WHERE id = :id AND workspace_id = :workspace_id
                """
            ),
            {"id": booking_id, "workspace_id": self.workspace_id},
        )
        await self.session.commit()
        updated = await self.get_booking(booking_id)

        email = (updated.get("client_email") or "").strip()
        if email:
            await self._send_email(
                email,
                f"Reserva confirmada — {updated.get('service_name')}",
                self._confirmation_html(updated),
            )
        return updated

    async def cancel_booking(self, booking_id: int, reason: str | None = None) -> dict[str, Any]:
        booking = await self.get_booking(booking_id)
        if booking.get("status") == "cancelled":
            return booking

        zoom_id = booking.get("zoom_meeting_id")
        if zoom_id:
            try:
                await get_zoom_service().delete_meeting(str(zoom_id))
            except Exception as exc:
                logger.warning("Zoom delete failed for booking %s: %s", booking_id, exc)

        note_suffix = f" Cancelación: {reason}" if reason else ""
        await self.session.execute(
            text(
                """
                UPDATE bookings
                SET status = 'cancelled',
                    notes = COALESCE(notes, '') || :note_suffix,
                    zoom_join_url = NULL,
                    zoom_host_url = NULL
                WHERE id = :id AND workspace_id = :workspace_id
                """
            ),
            {
                "id": booking_id,
                "workspace_id": self.workspace_id,
                "note_suffix": note_suffix,
            },
        )
        await self.session.commit()
        updated = await self.get_booking(booking_id)

        email = (updated.get("client_email") or "").strip()
        if email:
            await self._send_email(
                email,
                f"Reserva cancelada — {updated.get('service_name')}",
                self._confirmation_html(updated, cancelled=True),
            )
        return updated

    async def get_available_slots(
        self,
        day: date | str,
        duration_minutes: int = 30,
        calendar_id: str | None = None,
    ) -> list[dict[str, Any]]:
        cal_svc = get_calendar_service(self.session, self.workspace_id)
        cal = calendar_id or cal_svc.default_calendar_id()
        return await cal_svc.get_free_slots(cal, day, duration_minutes)

    async def list_bookings(
        self,
        *,
        status: str | None = None,
        start_date: datetime | str | None = None,
        end_date: datetime | str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> dict[str, Any]:
        where = "workspace_id = :workspace_id"
        params: dict[str, Any] = {
            "workspace_id": self.workspace_id,
            "skip": skip,
            "limit": limit,
        }
        if status:
            where += " AND status = :status"
            params["status"] = status.strip().lower()
        if start_date:
            where += " AND start_at >= :start_date"
            params["start_date"] = _parse_dt(start_date)
        if end_date:
            where += " AND start_at <= :end_date"
            params["end_date"] = _parse_dt(end_date)

        count_r = await self.session.execute(
            text(f"SELECT COUNT(*) FROM bookings WHERE {where}"),
            params,
        )
        total = int(count_r.scalar() or 0)

        result = await self.session.execute(
            text(
                f"""
                SELECT * FROM bookings WHERE {where}
                ORDER BY start_at ASC
                OFFSET :skip LIMIT :limit
                """
            ),
            params,
        )
        items = [_row_to_dict(r) for r in result.fetchall()]
        return {"items": items, "total": total, "skip": skip, "limit": limit}

    async def get_booking(self, booking_id: int) -> dict[str, Any]:
        result = await self.session.execute(
            text("SELECT * FROM bookings WHERE id = :id AND workspace_id = :workspace_id"),
            {"id": booking_id, "workspace_id": self.workspace_id},
        )
        row = result.fetchone()
        if not row:
            raise ValueError("Booking not found")
        return _row_to_dict(row)

    async def handle_zoom_webhook(self, payload: dict[str, Any]) -> dict[str, Any]:
        event = (payload.get("event") or "").strip()
        obj = payload.get("payload", {}).get("object", payload.get("object", {}))
        meeting_id = str(obj.get("id", obj.get("meeting_id", ""))).strip()

        updated = 0
        if meeting_id and event in ("meeting.ended", "meeting.deleted"):
            result = await self.session.execute(
                text(
                    """
                    UPDATE bookings SET status = 'completed'
                    WHERE workspace_id = :workspace_id
                      AND zoom_meeting_id = :zoom_meeting_id
                      AND status = 'confirmed'
                    RETURNING id
                    """
                ),
                {"workspace_id": self.workspace_id, "zoom_meeting_id": meeting_id},
            )
            updated = len(result.fetchall())
            await self.session.commit()

        return {
            "received": True,
            "event": event,
            "meeting_id": meeting_id,
            "bookings_updated": updated,
        }


def get_booking_service(
    session: AsyncSession, workspace_id: int, host_user_id: str
) -> BookingService:
    return BookingService(session, workspace_id, host_user_id)
