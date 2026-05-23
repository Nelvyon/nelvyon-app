import base64
import os
from typing import Any

import httpx


class ElevenLabsService:
    def __init__(self):
        self.api_key = os.environ.get("ELEVENLABS_API_KEY")
        self.base_url = "https://api.elevenlabs.io/v1"
        self.default_voice_id = os.environ.get(
            "ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM"
        )  # Rachel - voz profesional por defecto

    async def text_to_speech(self, text: str, voice_id: str = None) -> bytes:
        if not self.api_key:
            raise ValueError("ELEVENLABS_API_KEY not configured")
        vid = voice_id or self.default_voice_id
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/text-to-speech/{vid}",
                headers={"xi-api-key": self.api_key, "Content-Type": "application/json"},
                json={
                    "text": text,
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
                },
                timeout=30.0,
            )
            response.raise_for_status()
            return response.content

    async def text_to_speech_base64(self, text: str, voice_id: str = None) -> str:
        audio_bytes = await self.text_to_speech(text, voice_id)
        return base64.b64encode(audio_bytes).decode("utf-8")

    async def get_voices(self) -> list:
        if not self.api_key:
            return []
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/voices",
                headers={"xi-api-key": self.api_key},
            )
            response.raise_for_status()
            return response.json().get("voices", [])

    async def stream_audio(self, text: str, voice_id: str = None):
        if not self.api_key:
            raise ValueError("ELEVENLABS_API_KEY not configured")
        vid = voice_id or self.default_voice_id
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/text-to-speech/{vid}/stream",
                headers={"xi-api-key": self.api_key, "Content-Type": "application/json"},
                json={
                    "text": text,
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
                },
                timeout=60.0,
            ) as response:
                response.raise_for_status()
                async for chunk in response.aiter_bytes():
                    yield chunk


class VoiceDashboardService:
    """Workspace voice ops — dialer call history and configuration."""

    def __init__(self, session: Any, workspace_id: int):
        self.session = session
        self.workspace_id = int(workspace_id)

    async def list_calls(self, *, limit: int = 50) -> list[dict[str, Any]]:
        from sqlalchemy import text

        try:
            r = await self.session.execute(
                text(
                    """
                    SELECT dc.*, cc.name AS contact_name
                    FROM dialer_calls dc
                    LEFT JOIN crm_contacts cc ON cc.id = dc.contact_id
                    WHERE dc.workspace_id = :ws
                    ORDER BY dc.created_at DESC
                    LIMIT :limit
                    """
                ),
                {"ws": self.workspace_id, "limit": limit},
            )
            rows = []
            for row in r.fetchall():
                data = dict(row._mapping)
                for k, v in list(data.items()):
                    if hasattr(v, "isoformat"):
                        data[k] = v.isoformat()
                rows.append(data)
            return rows
        except Exception:
            return []

    async def get_stats(self) -> dict[str, Any]:
        from sqlalchemy import text

        try:
            r = await self.session.execute(
                text(
                    """
                    SELECT
                        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS calls_today,
                        COALESCE(AVG(duration_seconds) FILTER (WHERE duration_seconds > 0), 0) AS avg_duration,
                        COUNT(*) FILTER (WHERE outcome = 'connected') AS connected,
                        COUNT(*) AS total
                    FROM dialer_calls
                    WHERE workspace_id = :ws
                    """
                ),
                {"ws": self.workspace_id},
            )
            row = r.fetchone()
            m = row._mapping if row else {}
            total = int(m.get("total") or 0)
            connected = int(m.get("connected") or 0)
            return {
                "workspace_id": self.workspace_id,
                "calls_today": int(m.get("calls_today") or 0),
                "avg_duration_seconds": round(float(m.get("avg_duration") or 0), 1),
                "contact_rate_pct": round(connected / total * 100, 2) if total else 0.0,
                "total_calls": total,
            }
        except Exception:
            return {
                "workspace_id": self.workspace_id,
                "calls_today": 0,
                "avg_duration_seconds": 0,
                "contact_rate_pct": 0,
                "total_calls": 0,
            }

    def get_config(self) -> dict[str, Any]:
        twilio_ok = bool(
            os.environ.get("TWILIO_ACCOUNT_SID", "").strip()
            and os.environ.get("TWILIO_AUTH_TOKEN", "").strip()
        )
        eleven_ok = bool(os.environ.get("ELEVENLABS_API_KEY", "").strip())
        return {
            "twilio_configured": twilio_ok,
            "elevenlabs_configured": eleven_ok,
            "default_voice_id": os.environ.get("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM"),
            "twilio_from_number": os.environ.get("TWILIO_PHONE_NUMBER", ""),
            "status": "ready" if twilio_ok else "pending_auth",
        }


def get_voice_dashboard_service(session: Any, workspace_id: int) -> VoiceDashboardService:
    return VoiceDashboardService(session, workspace_id)
