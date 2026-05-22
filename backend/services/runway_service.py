"""Runway ML — image-to-video generation (lazy init, mock fallback)."""

from __future__ import annotations

import asyncio
import logging
import os
import uuid
from typing import Any

import httpx

logger = logging.getLogger(__name__)

RUNWAY_API_BASE = "https://api.dev.runwayml.com/v1"
RUNWAY_VERSION = "2024-11-06"
POLL_INTERVAL_SEC = 5
DEFAULT_MAX_WAIT = 300

ALLOWED_RATIOS = frozenset({"1280:768", "768:1280", "1280:720", "720:1280", "16:9", "9:16"})


class RunwayService:
    """Runway image-to-video API client."""

    def __init__(self) -> None:
        self._init_attempted = False
        self._mock = False
        self.api_key = ""

    def _ensure_config(self) -> None:
        if self._init_attempted:
            return
        self._init_attempted = True
        self.api_key = os.environ.get("RUNWAY_API_KEY", "").strip()
        if not self.api_key:
            self._mock = True
            logger.info("RunwayService: RUNWAY_API_KEY not set — mock mode")

    @property
    def is_mock(self) -> bool:
        self._ensure_config()
        return self._mock

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-Runway-Version": RUNWAY_VERSION,
        }

    @staticmethod
    def _normalize_ratio(ratio: str) -> str:
        raw = (ratio or "1280:768").strip()
        mapping = {
            "1280:720": "1280:768",
            "720:1280": "768:1280",
            "16:9": "1280:768",
            "9:16": "768:1280",
        }
        return mapping.get(raw, raw)

    @staticmethod
    def _clamp_duration(duration: int) -> int:
        return max(2, min(int(duration), 10))

    async def generate_video(
        self,
        prompt: str,
        image_url: str | None = None,
        duration: int = 5,
        ratio: str = "1280:768",
    ) -> dict[str, Any]:
        self._ensure_config()
        text = prompt.strip()
        if not text:
            raise ValueError("prompt is required")

        normalized_ratio = self._normalize_ratio(ratio)
        if normalized_ratio not in ("1280:768", "768:1280") and normalized_ratio not in ALLOWED_RATIOS:
            raise ValueError("ratio must be 1280:768, 768:1280, or common aliases 16:9 / 9:16")

        dur = self._clamp_duration(duration)

        if self._mock:
            task_id = f"mock-runway-{uuid.uuid4().hex}"
            logger.info("[RUNWAY MOCK] video prompt=%s", text[:80])
            return {
                "mock": True,
                "task_id": task_id,
                "status": "RUNNING",
                "prompt": text,
                "duration": dur,
                "ratio": normalized_ratio,
                "image_url": image_url,
            }

        body: dict[str, Any] = {
            "promptText": text,
            "model": "gen4_turbo",
            "ratio": normalized_ratio if normalized_ratio in ("1280:768", "768:1280") else "1280:768",
            "duration": dur,
        }
        if image_url and image_url.strip():
            body["promptImage"] = image_url.strip()

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{RUNWAY_API_BASE}/image_to_video",
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

        task_id = data.get("id") or data.get("taskId")
        if not task_id:
            return {"mock": False, "ok": False, "error": data, "message": "Missing task id in Runway response"}

        return {
            "mock": False,
            "ok": True,
            "task_id": task_id,
            "status": data.get("status", "RUNNING"),
            "response": data,
        }

    async def get_task_status(self, task_id: str) -> dict[str, Any]:
        self._ensure_config()
        tid = task_id.strip()
        if not tid:
            raise ValueError("task_id is required")

        if self._mock:
            return {
                "mock": True,
                "task_id": tid,
                "status": "SUCCEEDED",
                "output": [{"url": f"https://mock.nelvyon.local/runway/{tid}.mp4"}],
            }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(
                f"{RUNWAY_API_BASE}/tasks/{tid}",
                headers=self._headers(),
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

        status = data.get("status")
        output_url = None
        output = data.get("output")
        if isinstance(output, list) and output:
            first = output[0]
            if isinstance(first, dict):
                output_url = first.get("url") or first.get("output_url")
            elif isinstance(first, str):
                output_url = first

        return {
            "mock": False,
            "ok": True,
            "task_id": tid,
            "status": status,
            "output_url": output_url,
            "response": data,
        }

    async def poll_until_complete(
        self,
        task_id: str,
        max_wait: int = DEFAULT_MAX_WAIT,
    ) -> dict[str, Any]:
        self._ensure_config()
        tid = task_id.strip()
        if not tid:
            raise ValueError("task_id is required")

        if self._mock:
            result = await self.get_task_status(tid)
            result["polled"] = True
            return result

        elapsed = 0
        last: dict[str, Any] = {}
        while elapsed <= max_wait:
            last = await self.get_task_status(tid)
            status = (last.get("status") or "").upper()
            if status == "SUCCEEDED":
                last["polled"] = True
                last["wait_seconds"] = elapsed
                return last
            if status == "FAILED":
                last["polled"] = True
                last["wait_seconds"] = elapsed
                last["ok"] = False
                return last
            await asyncio.sleep(POLL_INTERVAL_SEC)
            elapsed += POLL_INTERVAL_SEC

        last["polled"] = True
        last["timed_out"] = True
        last["wait_seconds"] = elapsed
        return last


_runway_service: RunwayService | None = None


def get_runway_service() -> RunwayService:
    global _runway_service
    if _runway_service is None:
        _runway_service = RunwayService()
    return _runway_service
