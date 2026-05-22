"""Google Calendar — bidirectional sync, Meet links, free slots (google-api-python-client)."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from datetime import date, datetime, time, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar"]
DEFAULT_TIMEZONE = "Europe/Madrid"
WORK_START_HOUR = 9
WORK_END_HOUR = 18
SYNC_USER_ID = "google-calendar-sync"

_mock_events: dict[str, dict[str, Any]] = {}


def _json_dumps(value: Any) -> str:
    return json.dumps(value if value is not None else [], ensure_ascii=False, default=str)


def _row_to_dict(row: Any) -> dict[str, Any]:
    if row is None:
        return {}
    data = dict(row._mapping)
    for key, val in list(data.items()):
        if isinstance(val, datetime):
            data[key] = val.isoformat()
        elif key == "attendees" and isinstance(val, str):
            try:
                data[key] = json.loads(val)
            except json.JSONDecodeError:
                pass
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
        dt = dt.replace(tzinfo=ZoneInfo(DEFAULT_TIMEZONE))
    return dt


def _to_rfc3339(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=ZoneInfo(DEFAULT_TIMEZONE))
    return dt.isoformat()


def _google_event_to_local(
    item: dict[str, Any], *, calendar_id: str, workspace_id: int
) -> dict[str, Any]:
    start = item.get("start", {})
    end = item.get("end", {})
    start_at = start.get("dateTime") or f"{start.get('date')}T09:00:00"
    end_at = end.get("dateTime") or f"{end.get('date')}T10:00:00"
    attendees = [
        {"email": a.get("email"), "name": a.get("displayName"), "response": a.get("responseStatus")}
        for a in item.get("attendees", [])
        if a.get("email")
    ]
    meet_link = item.get("hangoutLink")
    if not meet_link:
        for ep in item.get("conferenceData", {}).get("entryPoints", []):
            if ep.get("entryPointType") == "video":
                meet_link = ep.get("uri")
                break
    return {
        "workspace_id": workspace_id,
        "google_event_id": item.get("id"),
        "calendar_id": calendar_id,
        "title": item.get("summary") or "Sin título",
        "description": item.get("description"),
        "start_at": start_at,
        "end_at": end_at,
        "attendees": attendees,
        "meet_link": meet_link,
        "status": item.get("status", "confirmed"),
    }


class CalendarService:
    """Google Calendar API + workspace-local calendar_events sync."""

    def __init__(self, session: AsyncSession, workspace_id: int):
        if workspace_id is None:
            raise ValueError("workspace_id is required")
        self.session = session
        self.workspace_id = int(workspace_id)
        self._api: Any | None = None
        self._init_attempted = False
        self._mock = False
        self.client_id = ""
        self.client_secret = ""
        self.refresh_token = ""

    def _ensure_config(self) -> None:
        if self._init_attempted:
            return
        self._init_attempted = True
        self.client_id = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
        self.client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "").strip()
        self.refresh_token = os.environ.get("GOOGLE_REFRESH_TOKEN", "").strip()
        if not self.client_id or not self.client_secret or not self.refresh_token:
            self._mock = True
            logger.info(
                "CalendarService: Google OAuth credentials missing — mock mode"
            )

    @property
    def is_mock(self) -> bool:
        self._ensure_config()
        return self._mock

    def default_calendar_id(self) -> str:
        return os.environ.get("GOOGLE_CALENDAR_ID", "primary").strip() or "primary"

    def _get_api(self) -> Any:
        self._ensure_config()
        if self._mock:
            raise RuntimeError("Calendar API not configured (mock mode)")
        if self._api is not None:
            return self._api

        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build

        creds = Credentials(
            token=None,
            refresh_token=self.refresh_token,
            token_uri=GOOGLE_TOKEN_URL,
            client_id=self.client_id,
            client_secret=self.client_secret,
            scopes=CALENDAR_SCOPES,
        )
        creds.refresh(Request())
        self._api = build("calendar", "v3", credentials=creds, cache_discovery=False)
        logger.info("CalendarService: Google Calendar API client ready")
        return self._api

    async def _run_sync(self, fn: Any) -> Any:
        return await asyncio.to_thread(fn)

    async def list_events(
        self,
        calendar_id: str,
        start_date: datetime | str,
        end_date: datetime | str,
    ) -> list[dict[str, Any]]:
        cal = (calendar_id or self.default_calendar_id()).strip()
        tmin = _to_rfc3339(_parse_dt(start_date))
        tmax = _to_rfc3339(_parse_dt(end_date))

        self._ensure_config()
        if self._mock:
            out = []
            for ev in _mock_events.values():
                if ev.get("workspace_id") != self.workspace_id or ev.get("calendar_id") != cal:
                    continue
                if ev.get("start_at", "") >= tmin and ev.get("start_at", "") <= tmax:
                    out.append(dict(ev))
            return sorted(out, key=lambda x: x.get("start_at", ""))

        api = self._get_api()

        def _list() -> list[dict[str, Any]]:
            result = (
                api.events()
                .list(
                    calendarId=cal,
                    timeMin=tmin,
                    timeMax=tmax,
                    singleEvents=True,
                    orderBy="startTime",
                )
                .execute()
            )
            return list(result.get("items", []))

        items = await self._run_sync(_list)
        return [_google_event_to_local(i, calendar_id=cal, workspace_id=self.workspace_id) for i in items]

    async def create_event(
        self,
        calendar_id: str,
        title: str,
        description: str | None,
        start: datetime | str,
        end: datetime | str,
        attendees: list[str] | None = None,
        meet_link: bool = True,
    ) -> dict[str, Any]:
        cal = (calendar_id or self.default_calendar_id()).strip()
        start_dt = _parse_dt(start)
        end_dt = _parse_dt(end)
        if end_dt <= start_dt:
            raise ValueError("end must be after start")

        body: dict[str, Any] = {
            "summary": title.strip(),
            "description": description or "",
            "start": {"dateTime": _to_rfc3339(start_dt), "timeZone": DEFAULT_TIMEZONE},
            "end": {"dateTime": _to_rfc3339(end_dt), "timeZone": DEFAULT_TIMEZONE},
        }
        if attendees:
            body["attendees"] = [{"email": e.strip()} for e in attendees if e.strip()]

        conference_version = 0
        if meet_link:
            body["conferenceData"] = {
                "createRequest": {
                    "requestId": uuid.uuid4().hex,
                    "conferenceSolutionKey": {"type": "hangoutsMeet"},
                }
            }
            conference_version = 1

        self._ensure_config()
        if self._mock:
            gid = f"mock-gcal-{uuid.uuid4().hex}"
            record = {
                "mock": True,
                "id": gid,
                "workspace_id": self.workspace_id,
                "google_event_id": gid,
                "calendar_id": cal,
                "title": title,
                "description": description,
                "start_at": _to_rfc3339(start_dt),
                "end_at": _to_rfc3339(end_dt),
                "attendees": [{"email": e} for e in (attendees or [])],
                "meet_link": f"https://meet.google.com/mock-{gid[:8]}",
                "status": "confirmed",
            }
            _mock_events[gid] = record
            return record

        api = self._get_api()

        def _insert() -> dict[str, Any]:
            return (
                api.events()
                .insert(
                    calendarId=cal,
                    body=body,
                    conferenceDataVersion=conference_version,
                    sendUpdates="all" if attendees else "none",
                )
                .execute()
            )

        created = await self._run_sync(_insert)
        local = _google_event_to_local(created, calendar_id=cal, workspace_id=self.workspace_id)
        local["mock"] = False
        return local

    async def update_event(
        self,
        calendar_id: str,
        event_id: str,
        data: dict[str, Any],
    ) -> dict[str, Any]:
        cal = (calendar_id or self.default_calendar_id()).strip()
        google_id = event_id.strip()

        body: dict[str, Any] = {}
        if "title" in data and data["title"] is not None:
            body["summary"] = str(data["title"]).strip()
        if "description" in data and data["description"] is not None:
            body["description"] = str(data["description"])
        if "start" in data and data["start"] is not None:
            body["start"] = {
                "dateTime": _to_rfc3339(_parse_dt(data["start"])),
                "timeZone": DEFAULT_TIMEZONE,
            }
        if "end" in data and data["end"] is not None:
            body["end"] = {
                "dateTime": _to_rfc3339(_parse_dt(data["end"])),
                "timeZone": DEFAULT_TIMEZONE,
            }
        if "attendees" in data and data["attendees"] is not None:
            body["attendees"] = [{"email": e.strip()} for e in data["attendees"] if e]

        self._ensure_config()
        if self._mock:
            record = _mock_events.get(google_id)
            if not record:
                raise ValueError("Event not found")
            record.update({k: v for k, v in data.items() if v is not None})
            return dict(record)

        api = self._get_api()

        def _patch() -> dict[str, Any]:
            return api.events().patch(calendarId=cal, eventId=google_id, body=body).execute()

        updated = await self._run_sync(_patch)
        return _google_event_to_local(updated, calendar_id=cal, workspace_id=self.workspace_id)

    async def delete_event(self, calendar_id: str, event_id: str) -> dict[str, Any]:
        cal = (calendar_id or self.default_calendar_id()).strip()
        google_id = event_id.strip()

        self._ensure_config()
        if self._mock:
            if google_id in _mock_events:
                del _mock_events[google_id]
            return {"deleted": True, "google_event_id": google_id, "mock": True}

        api = self._get_api()

        def _delete() -> None:
            api.events().delete(calendarId=cal, eventId=google_id).execute()

        await self._run_sync(_delete)
        return {"deleted": True, "google_event_id": google_id, "mock": False}

    async def get_free_slots(
        self,
        calendar_id: str,
        day: date | str,
        duration_minutes: int = 30,
    ) -> list[dict[str, Any]]:
        if duration_minutes < 15 or duration_minutes > 480:
            raise ValueError("duration_minutes must be between 15 and 480")

        if isinstance(day, str):
            day = date.fromisoformat(day.strip())

        tz = ZoneInfo(DEFAULT_TIMEZONE)
        day_start = datetime.combine(day, time(WORK_START_HOUR, 0), tzinfo=tz)
        day_end = datetime.combine(day, time(WORK_END_HOUR, 0), tzinfo=tz)

        events = await self.list_events(calendar_id, day_start, day_end)
        busy: list[tuple[datetime, datetime]] = []
        for ev in events:
            busy.append((_parse_dt(ev["start_at"]), _parse_dt(ev["end_at"])))
        busy.sort(key=lambda x: x[0])

        slots: list[dict[str, Any]] = []
        cursor = day_start
        delta = timedelta(minutes=duration_minutes)

        for b_start, b_end in busy:
            while cursor + delta <= b_start and cursor + delta <= day_end:
                if cursor >= day_start:
                    slots.append(
                        {
                            "start": _to_rfc3339(cursor),
                            "end": _to_rfc3339(cursor + delta),
                            "duration_minutes": duration_minutes,
                        }
                    )
                cursor += delta
            if b_end > cursor:
                cursor = b_end

        while cursor + delta <= day_end:
            slots.append(
                {
                    "start": _to_rfc3339(cursor),
                    "end": _to_rfc3339(cursor + delta),
                    "duration_minutes": duration_minutes,
                }
            )
            cursor += delta

        return slots

    async def sync_events(self, calendar_id: str) -> dict[str, Any]:
        cal = (calendar_id or self.default_calendar_id()).strip()
        now = datetime.now(timezone.utc)
        window_end = now + timedelta(days=90)

        pulled = await self.list_events(cal, now, window_end)
        upserted = 0
        for item in pulled:
            await self._upsert_local(item, synced_at=now)
            upserted += 1

        pushed = 0
        pending = await self._local_pending_push(cal)
        for row in pending:
            google = await self.create_event(
                cal,
                row["title"],
                row.get("description"),
                row["start_at"],
                row["end_at"],
                attendees=[a.get("email") for a in (row.get("attendees") or []) if a.get("email")],
                meet_link=bool(row.get("meet_link") is not False),
            )
            await self._link_local_to_google(int(row["id"]), google, synced_at=now)
            pushed += 1

        return {
            "calendar_id": cal,
            "workspace_id": self.workspace_id,
            "pulled": upserted,
            "pushed": pushed,
            "synced_at": now.isoformat(),
            "mock": self.is_mock,
        }

    # ─── Local DB (calendar_events) ───────────────────────────────────────────

    async def list_local_events(
        self,
        start_date: datetime | str,
        end_date: datetime | str,
        calendar_id: str | None = None,
    ) -> list[dict[str, Any]]:
        params: dict[str, Any] = {
            "workspace_id": self.workspace_id,
            "start": _parse_dt(start_date),
            "end": _parse_dt(end_date),
        }
        where = (
            "workspace_id = :workspace_id AND start_at IS NOT NULL "
            "AND start_at >= :start AND start_at <= :end"
        )
        if calendar_id:
            where += " AND calendar_id = :calendar_id"
            params["calendar_id"] = calendar_id.strip()

        result = await self.session.execute(
            text(f"SELECT * FROM calendar_events WHERE {where} ORDER BY start_at ASC"),
            params,
        )
        return [_row_to_dict(r) for r in result.fetchall()]

    async def create_local_event(
        self,
        *,
        calendar_id: str,
        title: str,
        description: str | None,
        start: datetime | str,
        end: datetime | str,
        attendees: list[str] | None = None,
        with_meet: bool = True,
        push_google: bool = True,
    ) -> dict[str, Any]:
        cal = (calendar_id or self.default_calendar_id()).strip()
        start_dt = _parse_dt(start)
        end_dt = _parse_dt(end)
        now = datetime.now(timezone.utc)

        google_event: dict[str, Any] | None = None
        if push_google:
            google_event = await self.create_event(
                cal,
                title,
                description,
                start_dt,
                end_dt,
                attendees=attendees,
                meet_link=with_meet,
            )

        attendees_json = [{"email": e} for e in (attendees or [])]
        result = await self.session.execute(
            text(
                """
                INSERT INTO calendar_events (
                    user_id, workspace_id, title, google_event_id, calendar_id,
                    description, start_at, end_at, start_time, end_time,
                    attendees, meet_link, status, synced_at, created_at
                )
                VALUES (
                    :user_id, :workspace_id, :title, :google_event_id, :calendar_id,
                    :description, :start_at, :end_at, :start_at, :end_at,
                    CAST(:attendees AS jsonb), :meet_link, :status, :synced_at, :created_at
                )
                RETURNING *
                """
            ),
            {
                "user_id": SYNC_USER_ID,
                "workspace_id": self.workspace_id,
                "title": title.strip(),
                "google_event_id": google_event.get("google_event_id") if google_event else None,
                "calendar_id": cal,
                "description": description,
                "start_at": start_dt,
                "end_at": end_dt,
                "attendees": _json_dumps(attendees_json),
                "meet_link": (google_event or {}).get("meet_link"),
                "status": (google_event or {}).get("status", "confirmed"),
                "synced_at": now,
                "created_at": now,
            },
        )
        await self.session.commit()
        return _row_to_dict(result.fetchone())

    async def update_local_event(self, event_id: int, data: dict[str, Any]) -> dict[str, Any]:
        row = await self._get_local_row(event_id)
        cal = row.get("calendar_id") or self.default_calendar_id()
        google_id = row.get("google_event_id")

        if google_id:
            patch: dict[str, Any] = {}
            if "title" in data:
                patch["title"] = data["title"]
            if "description" in data:
                patch["description"] = data["description"]
            if "start_at" in data:
                patch["start"] = data["start_at"]
            if "end_at" in data:
                patch["end"] = data["end_at"]
            if "attendees" in data:
                att = data["attendees"]
                if att and isinstance(att[0], dict):
                    patch["attendees"] = [a.get("email") for a in att if a.get("email")]
                else:
                    patch["attendees"] = att
            if patch:
                await self.update_event(cal, str(google_id), patch)

        sets: list[str] = []
        params: dict[str, Any] = {"id": event_id, "workspace_id": self.workspace_id}
        for key in ("title", "description", "start_at", "end_at", "meet_link", "status"):
            if key in data and data[key] is not None:
                sets.append(f"{key} = :{key}")
                params[key] = data[key]
                if key in ("start_at", "end_at"):
                    col = "start_time" if key == "start_at" else "end_time"
                    sets.append(f"{col} = :{key}")

        if "attendees" in data and data["attendees"] is not None:
            sets.append("attendees = CAST(:attendees AS jsonb)")
            params["attendees"] = _json_dumps(data["attendees"])

        if sets:
            sets.append("synced_at = :synced_at")
            params["synced_at"] = datetime.now(timezone.utc)
            await self.session.execute(
                text(
                    f"""
                    UPDATE calendar_events SET {', '.join(sets)}
                    WHERE id = :id AND workspace_id = :workspace_id
                    """
                ),
                params,
            )
            await self.session.commit()

        return await self.get_local_event(event_id)

    async def delete_local_event(self, event_id: int) -> dict[str, Any]:
        row = await self._get_local_row(event_id)
        google_id = row.get("google_event_id")
        cal = row.get("calendar_id") or self.default_calendar_id()
        if google_id:
            await self.delete_event(cal, str(google_id))

        await self.session.execute(
            text("DELETE FROM calendar_events WHERE id = :id AND workspace_id = :workspace_id"),
            {"id": event_id, "workspace_id": self.workspace_id},
        )
        await self.session.commit()
        return {"deleted": True, "id": event_id}

    async def get_local_event(self, event_id: int) -> dict[str, Any]:
        return _row_to_dict(await self._get_local_row(event_id))

    async def _get_local_row(self, event_id: int) -> Any:
        result = await self.session.execute(
            text(
                "SELECT * FROM calendar_events WHERE id = :id AND workspace_id = :workspace_id"
            ),
            {"id": event_id, "workspace_id": self.workspace_id},
        )
        row = result.fetchone()
        if not row:
            raise ValueError("Event not found")
        return row

    async def _upsert_local(self, item: dict[str, Any], synced_at: datetime) -> None:
        gid = item.get("google_event_id")
        if not gid:
            return
        existing = await self.session.execute(
            text(
                """
                SELECT id FROM calendar_events
                WHERE workspace_id = :workspace_id AND google_event_id = :google_event_id
                """
            ),
            {"workspace_id": self.workspace_id, "google_event_id": gid},
        )
        row = existing.fetchone()
        params = {
            "workspace_id": self.workspace_id,
            "google_event_id": gid,
            "calendar_id": item.get("calendar_id", self.default_calendar_id()),
            "title": item.get("title"),
            "description": item.get("description"),
            "start_at": _parse_dt(item["start_at"]),
            "end_at": _parse_dt(item["end_at"]),
            "attendees": _json_dumps(item.get("attendees") or []),
            "meet_link": item.get("meet_link"),
            "status": item.get("status", "confirmed"),
            "synced_at": synced_at,
        }
        if row:
            await self.session.execute(
                text(
                    """
                    UPDATE calendar_events SET
                        calendar_id = :calendar_id, title = :title, description = :description,
                        start_at = :start_at, end_at = :end_at, start_time = :start_at, end_time = :end_at,
                        attendees = CAST(:attendees AS jsonb), meet_link = :meet_link,
                        status = :status, synced_at = :synced_at
                    WHERE id = :id
                    """
                ),
                {**params, "id": row._mapping["id"]},
            )
        else:
            await self.session.execute(
                text(
                    """
                    INSERT INTO calendar_events (
                        user_id, workspace_id, google_event_id, calendar_id, title, description,
                        start_at, end_at, start_time, end_time, attendees, meet_link, status,
                        synced_at, created_at
                    )
                    VALUES (
                        :user_id, :workspace_id, :google_event_id, :calendar_id, :title, :description,
                        :start_at, :end_at, :start_at, :end_at, CAST(:attendees AS jsonb), :meet_link,
                        :status, :synced_at, :synced_at
                    )
                    """
                ),
                {**params, "user_id": SYNC_USER_ID},
            )
        await self.session.commit()

    async def _local_pending_push(self, calendar_id: str) -> list[dict[str, Any]]:
        result = await self.session.execute(
            text(
                """
                SELECT * FROM calendar_events
                WHERE workspace_id = :workspace_id
                  AND calendar_id = :calendar_id
                  AND google_event_id IS NULL
                  AND start_at IS NOT NULL
                ORDER BY start_at ASC
                LIMIT 50
                """
            ),
            {"workspace_id": self.workspace_id, "calendar_id": calendar_id},
        )
        return [_row_to_dict(r) for r in result.fetchall()]

    async def _link_local_to_google(
        self, local_id: int, google: dict[str, Any], synced_at: datetime
    ) -> None:
        await self.session.execute(
            text(
                """
                UPDATE calendar_events SET
                    google_event_id = :google_event_id,
                    meet_link = :meet_link,
                    status = :status,
                    synced_at = :synced_at
                WHERE id = :id AND workspace_id = :workspace_id
                """
            ),
            {
                "id": local_id,
                "workspace_id": self.workspace_id,
                "google_event_id": google.get("google_event_id") or google.get("id"),
                "meet_link": google.get("meet_link"),
                "status": google.get("status", "confirmed"),
                "synced_at": synced_at,
            },
        )
        await self.session.commit()


def get_calendar_service(session: AsyncSession, workspace_id: int) -> CalendarService:
    return CalendarService(session, workspace_id)
