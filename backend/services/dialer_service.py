"""NELVYON Dialer VoIP — Twilio calls, recordings, Whisper transcription, CRM log."""

from __future__ import annotations

import io
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from openai import AsyncOpenAI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from services.crm_service import CRMService
from services.tenant_service import TenantService

logger = logging.getLogger(__name__)

TWILIO_API = "https://api.twilio.com/2010-04-01"
WHISPER_MODEL = "whisper-1"
_SCHEMA_READY = False


def _row(row: Any) -> dict[str, Any]:
    if row is None:
        return {}
    data = dict(row._mapping)
    for k, v in list(data.items()):
        if isinstance(v, datetime):
            data[k] = v.isoformat()
        elif hasattr(v, "hex"):
            data[k] = str(v)
    return data


def _normalize_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone or "")
    if not digits:
        raise ValueError("Invalid phone number")
    return f"+{digits}"


def _openai_client() -> AsyncOpenAI | None:
    key = os.environ.get("OPENAI_API_KEY", "").strip() or os.environ.get("APP_AI_KEY", "").strip()
    if not key:
        return None
    base = os.environ.get("OPENAI_BASE_URL", "").strip() or None
    return AsyncOpenAI(api_key=key, base_url=base)


class DialerService:
    def __init__(self, session: AsyncSession, workspace_id: int):
        if workspace_id is None:
            raise ValueError("workspace_id required")
        self.session = session
        self.workspace_id = int(workspace_id)
        self.account_sid = os.environ.get("TWILIO_ACCOUNT_SID", "").strip()
        self.auth_token = os.environ.get("TWILIO_AUTH_TOKEN", "").strip()
        self.default_from = os.environ.get("TWILIO_PHONE_NUMBER", "").strip()
        self._configured = bool(self.account_sid and self.auth_token and self.default_from)

    @property
    def is_configured(self) -> bool:
        return self._configured

    @classmethod
    async def ensure_schema(cls) -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        from core.database import db_manager

        sql_path = Path(__file__).resolve().parent.parent / "migrations" / "dialer.sql"
        if sql_path.is_file():
            async with db_manager.get_session() as session:
                await session.execute(text(sql_path.read_text(encoding="utf-8")))
                await session.commit()
        _SCHEMA_READY = True

    async def _set_tenant(self) -> None:
        await TenantService(self.session).set_tenant_context(self.workspace_id)

    def _pending_auth(self, action: str = "make calls") -> dict[str, Any]:
        return {
            "status": "pending_auth",
            "pending_auth": True,
            "message": (
                "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, "
                f"and TWILIO_PHONE_NUMBER to {action}."
            ),
        }

    async def make_call(
        self,
        to_number: str,
        from_number: str | None = None,
        agent_id: str | None = None,
        contact_id: str | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_tenant()
        to = _normalize_phone(to_number)
        frm = _normalize_phone(from_number or self.default_from) if (from_number or self.default_from) else ""

        if not self._configured:
            pending = self._pending_auth()
            call_id = str(uuid.uuid4())
            await self.session.execute(
                text(
                    """
                    INSERT INTO dialer_calls (
                        id, workspace_id, contact_id, to_number, from_number, status, agent_id
                    )
                    VALUES (
                        CAST(:id AS uuid), :ws, CAST(:cid AS uuid), :to, :frm, 'pending_auth', :agent
                    )
                    """
                ),
                {
                    "id": call_id,
                    "ws": self.workspace_id,
                    "cid": contact_id,
                    "to": to,
                    "frm": frm,
                    "agent": agent_id,
                },
            )
            await self.session.commit()
            return {**pending, "id": call_id, "call_sid": None}

        twiml = "<Response><Say language=\"es-ES\">Conectando llamada NELVYON.</Say></Response>"
        url = f"{TWILIO_API}/Accounts/{self.account_sid}/Calls.json"
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                url,
                auth=(self.account_sid, self.auth_token),
                data={"To": to, "From": frm, "Twiml": twiml, "Record": "true"},
            )
        if resp.status_code >= 400:
            logger.warning("Twilio call failed: %s", resp.text[:400])
            raise ValueError(f"Twilio call failed: {resp.text[:200]}")
        data = resp.json()
        call_sid = data.get("sid")
        result = await self.session.execute(
            text(
                """
                INSERT INTO dialer_calls (
                    workspace_id, contact_id, to_number, from_number, call_sid, status, agent_id
                )
                VALUES (:ws, CAST(:cid AS uuid), :to, :frm, :sid, :status, :agent)
                RETURNING *
                """
            ),
            {
                "ws": self.workspace_id,
                "cid": contact_id,
                "to": to,
                "frm": frm,
                "sid": call_sid,
                "status": data.get("status", "queued"),
                "agent": agent_id,
            },
        )
        row = _row(result.mappings().first())
        await self.session.commit()
        return row

    async def _get_by_sid(self, call_sid: str) -> dict[str, Any]:
        result = await self.session.execute(
            text(
                """
                SELECT * FROM dialer_calls
                WHERE call_sid = :sid AND workspace_id = :ws
                """
            ),
            {"sid": call_sid, "ws": self.workspace_id},
        )
        row = result.mappings().first()
        if not row:
            raise ValueError("Call not found")
        return _row(row)

    async def end_call(self, call_sid: str) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_tenant()
        if not self._configured:
            return {**self._pending_auth("end calls"), "call_sid": call_sid}
        url = f"{TWILIO_API}/Accounts/{self.account_sid}/Calls/{call_sid}.json"
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                url,
                auth=(self.account_sid, self.auth_token),
                data={"Status": "completed"},
            )
        status = "completed" if resp.status_code < 400 else "failed"
        await self.session.execute(
            text(
                """
                UPDATE dialer_calls SET status = :status
                WHERE call_sid = :sid AND workspace_id = :ws
                """
            ),
            {"status": status, "sid": call_sid, "ws": self.workspace_id},
        )
        await self.session.commit()
        return await self._get_by_sid(call_sid)

    async def get_call_status(self, call_sid: str) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_tenant()
        if self._configured:
            url = f"{TWILIO_API}/Accounts/{self.account_sid}/Calls/{call_sid}.json"
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(url, auth=(self.account_sid, self.auth_token))
            if resp.status_code < 400:
                data = resp.json()
                tw_status = data.get("status", "unknown")
                duration = int(data.get("duration") or 0)
                await self.session.execute(
                    text(
                        """
                        UPDATE dialer_calls SET status = :status, duration_seconds = :dur
                        WHERE call_sid = :sid AND workspace_id = :ws
                        """
                    ),
                    {"status": tw_status, "dur": duration, "sid": call_sid, "ws": self.workspace_id},
                )
                await self.session.commit()
                return {"call_sid": call_sid, "status": tw_status, "duration_seconds": duration}
        call = await self._get_by_sid(call_sid)
        return {"call_sid": call_sid, "status": call.get("status"), "duration_seconds": call.get("duration_seconds", 0)}

    async def get_call_recording(self, call_sid: str) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_tenant()
        call = await self._get_by_sid(call_sid)
        if call.get("recording_url"):
            return {"call_sid": call_sid, "recording_url": call["recording_url"]}
        if not self._configured:
            return {**self._pending_auth("fetch recordings"), "call_sid": call_sid, "recording_url": None}
        url = f"{TWILIO_API}/Accounts/{self.account_sid}/Calls/{call_sid}/Recordings.json"
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url, auth=(self.account_sid, self.auth_token))
        if resp.status_code >= 400:
            return {"call_sid": call_sid, "recording_url": None}
        recordings = resp.json().get("recordings") or []
        if not recordings:
            return {"call_sid": call_sid, "recording_url": None}
        rec_uri = recordings[0].get("uri", "").replace(".json", ".mp3")
        recording_url = f"https://api.twilio.com{rec_uri}" if rec_uri else None
        if recording_url:
            await self.session.execute(
                text(
                    """
                    UPDATE dialer_calls SET recording_url = :url
                    WHERE call_sid = :sid AND workspace_id = :ws
                    """
                ),
                {"url": recording_url, "sid": call_sid, "ws": self.workspace_id},
            )
            await self.session.commit()
        return {"call_sid": call_sid, "recording_url": recording_url}

    async def transcribe_call(self, call_sid: str, recording_url: str | None = None) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_tenant()
        client = _openai_client()
        if not client:
            return {"call_sid": call_sid, "transcript": "", "message": "OpenAI not configured"}
        rec = recording_url
        if not rec:
            rec_data = await self.get_call_recording(call_sid)
            rec = rec_data.get("recording_url")
        if not rec:
            raise ValueError("No recording available")
        async with httpx.AsyncClient(timeout=120) as http:
            audio_resp = await http.get(rec, auth=(self.account_sid, self.auth_token) if self._configured else None)
        if audio_resp.status_code >= 400:
            raise ValueError("Failed to download recording")
        buf = io.BytesIO(audio_resp.content)
        buf.name = "recording.mp3"
        result = await client.audio.transcriptions.create(model=WHISPER_MODEL, file=buf, language="es")
        transcript = (result.text or "").strip()
        await self.session.execute(
            text(
                """
                UPDATE dialer_calls SET transcript = :t
                WHERE call_sid = :sid AND workspace_id = :ws
                """
            ),
            {"t": transcript, "sid": call_sid, "ws": self.workspace_id},
        )
        await self.session.commit()
        return {"call_sid": call_sid, "transcript": transcript}

    async def log_call(
        self,
        contact_id: str | None,
        call_sid: str | None,
        duration: int,
        outcome: str,
        notes: str = "",
    ) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_tenant()
        if call_sid:
            result = await self.session.execute(
                text(
                    """
                    UPDATE dialer_calls SET
                        contact_id = COALESCE(CAST(:cid AS uuid), contact_id),
                        duration_seconds = :dur,
                        outcome = :outcome,
                        notes = :notes
                    WHERE call_sid = :sid AND workspace_id = :ws
                    RETURNING *
                    """
                ),
                {
                    "cid": contact_id,
                    "dur": duration,
                    "outcome": outcome,
                    "notes": notes,
                    "sid": call_sid,
                    "ws": self.workspace_id,
                },
            )
            row = result.mappings().first()
            if row:
                call_row = _row(row)
            else:
                call_row = {}
        else:
            ins = await self.session.execute(
                text(
                    """
                    INSERT INTO dialer_calls (
                        workspace_id, contact_id, to_number, from_number, duration_seconds, outcome, notes, status
                    )
                    VALUES (:ws, CAST(:cid AS uuid), '', '', :dur, :outcome, :notes, 'completed')
                    RETURNING *
                    """
                ),
                {
                    "ws": self.workspace_id,
                    "cid": contact_id,
                    "dur": duration,
                    "outcome": outcome,
                    "notes": notes,
                },
            )
            call_row = _row(ins.mappings().first())

        if contact_id:
            try:
                crm = CRMService(self.session, self.workspace_id)
                await crm.create_activity(
                    contact_id=contact_id,
                    type="call",
                    description=notes or f"Llamada — {outcome}",
                    outcome=outcome,
                )
            except Exception as exc:
                logger.warning("CRM activity log failed: %s", exc)

        await self.session.commit()
        return call_row

    async def get_call_history(self, limit: int = 50) -> list[dict[str, Any]]:
        await self.ensure_schema()
        await self._set_tenant()
        result = await self.session.execute(
            text(
                """
                SELECT d.*, c.name AS contact_name, c.email AS contact_email
                FROM dialer_calls d
                LEFT JOIN crm_contacts c ON c.id = d.contact_id
                WHERE d.workspace_id = :ws
                ORDER BY d.created_at DESC
                LIMIT :lim
                """
            ),
            {"ws": self.workspace_id, "lim": limit},
        )
        return [_row(r) for r in result.mappings().all()]

    async def get_stats(self) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_tenant()
        stats = await self.session.execute(
            text(
                """
                SELECT
                    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS calls_today,
                    COALESCE(AVG(duration_seconds) FILTER (WHERE duration_seconds > 0), 0) AS avg_duration,
                    COUNT(*) FILTER (WHERE outcome = 'connected') AS connected,
                    COUNT(*) FILTER (WHERE status IN ('queued', 'ringing', 'in-progress')) AS pending
                FROM dialer_calls
                WHERE workspace_id = :ws
                """
            ),
            {"ws": self.workspace_id},
        )
        s = stats.mappings().first()
        total = int(s["calls_today"] or 0)
        connected = int(s["connected"] or 0)
        contact_rate = round((connected / total) * 100, 1) if total else 0.0
        return {
            "calls_today": total,
            "avg_duration_seconds": round(float(s["avg_duration"] or 0), 1),
            "contact_rate_percent": contact_rate,
            "pending_calls": int(s["pending"] or 0),
            "twilio_configured": self._configured,
        }

    async def handle_webhook(
        self,
        call_sid: str,
        call_status: str,
        duration: int = 0,
        recording_url: str | None = None,
        workspace_id: int | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        ws = int(workspace_id or self.workspace_id)
        await TenantService(self.session).set_tenant_context(ws)
        outcome = None
        if call_status == "completed":
            outcome = "connected" if duration > 0 else "no-answer"
        elif call_status == "no-answer":
            outcome = "no-answer"
        elif call_status == "failed":
            outcome = "failed"
        await self.session.execute(
            text(
                """
                UPDATE dialer_calls SET
                    status = :status,
                    duration_seconds = CASE WHEN :dur > 0 THEN :dur ELSE duration_seconds END,
                    outcome = COALESCE(:outcome, outcome),
                    recording_url = COALESCE(:rec, recording_url)
                WHERE call_sid = :sid AND workspace_id = :ws
                """
            ),
            {
                "status": call_status,
                "dur": duration,
                "outcome": outcome,
                "rec": recording_url,
                "sid": call_sid,
                "ws": ws,
            },
        )
        await self.session.commit()
        return {"ok": True, "call_sid": call_sid}


def get_dialer_service(session: AsyncSession, workspace_id: int) -> DialerService:
    return DialerService(session, workspace_id)
