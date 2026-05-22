"""Zoom API — Server-to-Server OAuth, meetings (httpx, lazy init, mock fallback)."""

from __future__ import annotations

import base64
import logging
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx

logger = logging.getLogger(__name__)

ZOOM_API_BASE = "https://api.zoom.us/v2"
ZOOM_TOKEN_URL = "https://zoom.us/oauth/token"
TIMEOUT_SECONDS = 60.0

_mock_meetings: dict[str, dict[str, Any]] = {}
_token_cache: dict[str, Any] = {"access_token": "", "expires_at": 0.0}


class ZoomService:
    """Zoom meetings via Server-to-Server OAuth (account credentials)."""

    def __init__(self) -> None:
        self._init_attempted = False
        self._mock = False
        self.account_id = ""
        self.client_id = ""
        self.client_secret = ""

    def _ensure_config(self) -> None:
        if self._init_attempted:
            return
        self._init_attempted = True
        self.account_id = os.environ.get("ZOOM_ACCOUNT_ID", "").strip()
        self.client_id = os.environ.get("ZOOM_CLIENT_ID", "").strip()
        self.client_secret = os.environ.get("ZOOM_CLIENT_SECRET", "").strip()
        if not self.account_id or not self.client_id or not self.client_secret:
            self._mock = True
            logger.info(
                "ZoomService: ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, or ZOOM_CLIENT_SECRET missing — mock mode"
            )

    @property
    def is_mock(self) -> bool:
        self._ensure_config()
        return self._mock

    async def _get_access_token(self) -> str:
        self._ensure_config()
        if self._mock:
            return "mock-zoom-token"

        now = time.time()
        if _token_cache.get("access_token") and _token_cache.get("expires_at", 0) > now + 60:
            return str(_token_cache["access_token"])

        credentials = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode("utf-8")
        ).decode("utf-8")
        params = {
            "grant_type": "account_credentials",
            "account_id": self.account_id,
        }
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            response = await client.post(
                ZOOM_TOKEN_URL,
                params=params,
                headers={
                    "Authorization": f"Basic {credentials}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            )
        if response.status_code >= 400:
            raise ValueError(f"Zoom OAuth failed ({response.status_code}): {response.text[:400]}")

        data = response.json()
        token = data.get("access_token", "")
        if not token:
            raise ValueError("Zoom OAuth response missing access_token")
        expires_in = int(data.get("expires_in", 3600))
        _token_cache["access_token"] = token
        _token_cache["expires_at"] = now + expires_in
        return token

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json_body: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        token = await self._get_access_token()
        url = f"{ZOOM_API_BASE}/{path.lstrip('/')}"
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            response = await client.request(
                method,
                url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json=json_body,
            )
        if response.status_code == 204:
            return {"ok": True}
        if response.status_code >= 400:
            raise ValueError(f"Zoom API error ({response.status_code}): {response.text[:500]}")
        if not response.content:
            return {}
        return response.json()

    @staticmethod
    def _format_start_time(start_time: datetime | str) -> str:
        if isinstance(start_time, str):
            raw = start_time.strip()
            if raw.endswith("Z"):
                return raw
            dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        else:
            dt = start_time
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    async def create_meeting(
        self,
        topic: str,
        start_time: datetime | str,
        duration: int,
        agenda: str | None = None,
    ) -> dict[str, Any]:
        topic = topic.strip()
        if not topic:
            raise ValueError("topic is required")
        duration = int(duration)
        if duration < 1 or duration > 480:
            raise ValueError("duration must be between 1 and 480 minutes")

        self._ensure_config()
        if self._mock:
            mid = str(uuid.uuid4().int)[:11]
            record = {
                "mock": True,
                "id": mid,
                "topic": topic,
                "start_time": self._format_start_time(start_time),
                "duration": duration,
                "agenda": agenda or "",
                "join_url": f"https://zoom.us/j/mock-{mid}",
                "start_url": f"https://zoom.us/s/mock-host-{mid}",
            }
            _mock_meetings[mid] = record
            logger.info("[ZOOM MOCK] create_meeting id=%s", mid)
            return record

        body: dict[str, Any] = {
            "topic": topic,
            "type": 2,
            "start_time": self._format_start_time(start_time),
            "duration": duration,
            "agenda": agenda or "",
            "settings": {
                "join_before_host": True,
                "waiting_room": False,
            },
        }
        data = await self._request("POST", "users/me/meetings", json_body=body)
        return {
            "mock": False,
            "id": str(data.get("id", "")),
            "topic": data.get("topic"),
            "start_time": data.get("start_time"),
            "duration": data.get("duration"),
            "join_url": data.get("join_url"),
            "start_url": data.get("start_url"),
            "password": data.get("password"),
        }

    async def get_meeting(self, meeting_id: str) -> dict[str, Any]:
        meeting_id = str(meeting_id).strip()
        if not meeting_id:
            raise ValueError("meeting_id is required")

        self._ensure_config()
        if self._mock:
            record = _mock_meetings.get(meeting_id)
            if not record:
                raise ValueError("Meeting not found")
            return dict(record)

        data = await self._request("GET", f"meetings/{meeting_id}")
        return {
            "mock": False,
            "id": str(data.get("id", meeting_id)),
            "topic": data.get("topic"),
            "start_time": data.get("start_time"),
            "duration": data.get("duration"),
            "join_url": data.get("join_url"),
            "start_url": data.get("start_url"),
            "status": data.get("status"),
        }

    async def delete_meeting(self, meeting_id: str) -> dict[str, Any]:
        meeting_id = str(meeting_id).strip()
        if not meeting_id:
            raise ValueError("meeting_id is required")

        self._ensure_config()
        if self._mock:
            _mock_meetings.pop(meeting_id, None)
            logger.info("[ZOOM MOCK] delete_meeting id=%s", meeting_id)
            return {"deleted": True, "meeting_id": meeting_id, "mock": True}

        await self._request("DELETE", f"meetings/{meeting_id}")
        return {"deleted": True, "meeting_id": meeting_id, "mock": False}


_zoom_service: ZoomService | None = None


def get_zoom_service() -> ZoomService:
    global _zoom_service
    if _zoom_service is None:
        _zoom_service = ZoomService()
    return _zoom_service
