"""Suno music generation via API Box (erweima.ai) — lazy init, mock fallback."""

from __future__ import annotations

import logging
import os
import uuid
from typing import Any

import httpx

logger = logging.getLogger(__name__)

SUNO_API_BASE = "https://apibox.erweima.ai"
DEFAULT_MODEL = "V4_5ALL"
DEFAULT_CALLBACK = "https://nelvyon.com/api/media/music/callback"


class SunoService:
    """Suno / API Box music generation client."""

    def __init__(self) -> None:
        self._init_attempted = False
        self._mock = False
        self.api_key = ""

    def _ensure_config(self) -> None:
        if self._init_attempted:
            return
        self._init_attempted = True
        self.api_key = os.environ.get("SUNO_API_KEY", "").strip()
        if not self.api_key:
            self._mock = True
            logger.info("SunoService: SUNO_API_KEY not set — mock mode")

    @property
    def is_mock(self) -> bool:
        self._ensure_config()
        return self._mock

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _callback_url(self) -> str:
        explicit = os.environ.get("SUNO_CALLBACK_URL", "").strip()
        if explicit:
            return explicit
        base = os.environ.get("PYTHON_BACKEND_URL", "").strip().rstrip("/")
        if base:
            return f"{base}/api/media/music/callback"
        return DEFAULT_CALLBACK

    @staticmethod
    def _title_from_prompt(prompt: str, duration: int) -> str:
        base = prompt.strip()[:72] or "NELVYON Track"
        return f"{base} ({duration}s)"[:100]

    async def generate_music(
        self,
        prompt: str,
        style: str = "",
        duration: int = 30,
        instrumental: bool = True,
    ) -> dict[str, Any]:
        self._ensure_config()
        text = prompt.strip()
        if not text:
            raise ValueError("prompt is required")

        style_text = (style or "Ambient Electronic").strip()
        dur = max(10, min(int(duration), 480))
        use_custom = bool(style_text)

        if self._mock:
            task_id = f"mock-suno-{uuid.uuid4().hex}"
            logger.info("[SUNO MOCK] music prompt=%s style=%s", text[:60], style_text[:40])
            return {
                "mock": True,
                "task_id": task_id,
                "status": "PENDING",
                "prompt": text,
                "style": style_text,
                "duration": dur,
                "instrumental": instrumental,
            }

        if use_custom:
            body: dict[str, Any] = {
                "customMode": True,
                "instrumental": instrumental,
                "model": DEFAULT_MODEL,
                "callBackUrl": self._callback_url(),
                "style": style_text,
                "title": self._title_from_prompt(text, dur),
            }
            if not instrumental:
                body["prompt"] = f"{text} (target length ~{dur} seconds)"
        else:
            body = {
                "customMode": False,
                "instrumental": instrumental,
                "model": DEFAULT_MODEL,
                "callBackUrl": self._callback_url(),
                "prompt": f"{text} (~{dur}s)",
            }

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{SUNO_API_BASE}/api/v1/generate",
                headers=self._headers(),
                json=body,
            )
            try:
                data = response.json()
            except Exception:
                data = {"raw": response.text}

            if response.status_code >= 400:
                return {
                    "mock": False,
                    "ok": False,
                    "status_code": response.status_code,
                    "error": data,
                }

        code = data.get("code")
        if code not in (200, "200", None) and code is not None:
            return {
                "mock": False,
                "ok": False,
                "code": code,
                "msg": data.get("msg"),
                "error": data,
            }

        payload = data.get("data") if isinstance(data.get("data"), dict) else data
        task_id = None
        if isinstance(payload, dict):
            task_id = payload.get("taskId") or payload.get("task_id")
        task_id = task_id or data.get("taskId") or data.get("task_id")

        if not task_id:
            return {
                "mock": False,
                "ok": False,
                "error": data,
                "message": "Missing taskId in Suno response",
            }

        return {
            "mock": False,
            "ok": True,
            "task_id": task_id,
            "status": "PENDING",
            "response": data,
        }

    async def get_generation_status(self, task_id: str) -> dict[str, Any]:
        self._ensure_config()
        tid = task_id.strip()
        if not tid:
            raise ValueError("task_id is required")

        if self._mock:
            return {
                "mock": True,
                "task_id": tid,
                "status": "complete",
                "tracks": [
                    {
                        "audio_url": f"https://mock.nelvyon.local/suno/{tid}.mp3",
                        "title": "Mock Track",
                        "duration": 30,
                    }
                ],
            }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(
                f"{SUNO_API_BASE}/api/v1/generate/record-info",
                headers=self._headers(),
                params={"taskId": tid},
            )
            try:
                data = response.json()
            except Exception:
                data = {"raw": response.text}

            if response.status_code >= 400:
                return {
                    "mock": False,
                    "ok": False,
                    "task_id": tid,
                    "status_code": response.status_code,
                    "error": data,
                }

        code = data.get("code")
        if code not in (200, "200", None) and code is not None:
            return {
                "mock": False,
                "ok": False,
                "task_id": tid,
                "code": code,
                "msg": data.get("msg"),
                "error": data,
            }

        inner = data.get("data") if isinstance(data.get("data"), dict) else {}
        status = (
            inner.get("status")
            or inner.get("callbackType")
            or data.get("status")
            or "unknown"
        )

        tracks: list[dict[str, Any]] = []
        raw_tracks = inner.get("data") or inner.get("tracks") or []
        if isinstance(raw_tracks, list):
            for item in raw_tracks:
                if isinstance(item, dict):
                    tracks.append(item)

        audio_urls = [
            t.get("audio_url") or t.get("source_audio_url")
            for t in tracks
            if isinstance(t, dict) and (t.get("audio_url") or t.get("source_audio_url"))
        ]

        return {
            "mock": False,
            "ok": True,
            "task_id": tid,
            "status": status,
            "audio_urls": audio_urls,
            "tracks": tracks,
            "response": data,
        }


_suno_service: SunoService | None = None


def get_suno_service() -> SunoService:
    global _suno_service
    if _suno_service is None:
        _suno_service = SunoService()
    return _suno_service
