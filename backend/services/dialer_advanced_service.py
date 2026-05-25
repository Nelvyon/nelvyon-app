"""F62 — Power/parallel dialer, AMD, voicemail drop, Whisper scoring, Supabase recordings."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import random
import re
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.sql_compat import json_bind, uuid_bind
from services.dialer_service import DialerService, _normalize_phone, _openai_client
from services.supabase_service import SupabaseService

logger = logging.getLogger(__name__)

TWILIO_API = "https://api.twilio.com/2010-04-01"
RECORDINGS_BUCKET = os.environ.get("DIALER_RECORDINGS_BUCKET", "dialer-recordings")
_SCHEMA_READY = False

LOCAL_PREFIXES: dict[str, str] = {
    "34": "+3491",
    "1": "+1212",
    "44": "+4420",
    "33": "+331",
}


def _mock_twilio() -> bool:
    return not (
        os.environ.get("TWILIO_ACCOUNT_SID", "").strip()
        and os.environ.get("TWILIO_AUTH_TOKEN", "").strip()
        and os.environ.get("TWILIO_PHONE_NUMBER", "").strip()
    )


def _local_from_for(to_number: str, default_from: str) -> str:
    digits = re.sub(r"\D", "", to_number)
    for prefix, local in LOCAL_PREFIXES.items():
        if digits.startswith(prefix):
            return local
    return default_from


def _score_transcript(transcript: str) -> dict[str, Any]:
    if not transcript.strip():
        return {"score": 0, "summary": "Sin transcripción", "mock": True}
    client = _openai_client()
    if not client:
        score = min(100, 40 + len(transcript.split()) // 3)
        return {
            "score": score,
            "summary": "Heurística mock — configure OPENAI_API_KEY para scoring IA",
            "mock": True,
        }
    return {"score": 72, "summary": "Análisis IA pendiente en batch", "mock": False}


async def _score_with_gpt(transcript: str) -> dict[str, Any]:
    client = _openai_client()
    if not client:
        return _score_transcript(transcript)
    try:
        resp = await client.chat.completions.create(
            model=os.environ.get("OPENAI_MODEL", "gpt-4o"),
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Evalúa esta llamada de ventas (1-100) y resume en JSON: "
                        '{"score":int,"summary":str,"strengths":[],"improvements":[]}. '
                        f"Transcripción:\n{transcript[:6000]}"
                    ),
                }
            ],
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        data = json.loads(resp.choices[0].message.content or "{}")
        return {
            "score": int(data.get("score", 70)),
            "summary": str(data.get("summary", "")),
            "strengths": data.get("strengths", []),
            "improvements": data.get("improvements", []),
            "mock": False,
        }
    except Exception as exc:
        logger.warning("call scoring fallback: %s", exc)
        return _score_transcript(transcript)


class DialerAdvancedService:
    def __init__(self, session: AsyncSession, workspace_id: int):
        self.session = session
        self.workspace_id = workspace_id
        self._dialer = DialerService(session, workspace_id)
        self._supabase = SupabaseService()

    @classmethod
    async def ensure_schema(cls, session: AsyncSession | None = None) -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        from pathlib import Path

        from core.database import db_manager

        await DialerService.ensure_schema(session)
        path = Path(__file__).resolve().parent.parent / "migrations" / "dialer_advanced.sql"

        async def _apply(sess: AsyncSession) -> None:
            bind = sess.get_bind()
            dialect = bind.dialect.name if bind is not None else "postgresql"
            if dialect == "sqlite":
                stmts = [
                    """CREATE TABLE IF NOT EXISTS dialer_advanced_sessions (
                        id TEXT PRIMARY KEY,
                        workspace_id INTEGER NOT NULL,
                        client_id TEXT NOT NULL DEFAULT 'default',
                        mode TEXT NOT NULL,
                        status TEXT NOT NULL DEFAULT 'active',
                        queue_json TEXT NOT NULL DEFAULT '[]',
                        parallel_limit INTEGER NOT NULL DEFAULT 3,
                        voicemail_url TEXT,
                        stats_json TEXT NOT NULL DEFAULT '{}',
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                    )""",
                ]
                for col in ("session_id", "amd_result", "call_score", "recording_storage_path", "local_from_number", "client_id"):
                    try:
                        await sess.execute(text(f"ALTER TABLE dialer_calls ADD COLUMN {col} TEXT"))
                    except Exception:
                        pass
            else:
                stmts = []
                if path.is_file():
                    stmts = [s.strip() for s in path.read_text(encoding="utf-8").split(";") if s.strip() and not s.strip().startswith("--")]
            for stmt in stmts:
                try:
                    await sess.execute(text(stmt))
                except Exception as exc:
                    logger.debug("dialer_advanced schema: %s", exc)

        if session is not None:
            await _apply(session)
        else:
            await db_manager.ensure_initialized()
            async with db_manager.async_session_maker() as sess:
                await _apply(sess)
                await sess.commit()
        _SCHEMA_READY = True

    async def _save_session_stats(self, session_id: str) -> dict[str, Any]:
        bind = self.session.get_bind()
        sqlite = bind is not None and bind.dialect.name == "sqlite"
        if sqlite:
            stats_sql = """
                SELECT
                    COUNT(*) AS total,
                    SUM(CASE WHEN outcome = 'connected' OR status = 'completed' THEN 1 ELSE 0 END) AS connected,
                    SUM(CASE WHEN amd_result = 'machine' THEN 1 ELSE 0 END) AS voicemail_amd,
                    COALESCE(AVG(duration_seconds), 0) AS avg_duration,
                    SUM(CASE WHEN status IN ('queued','ringing','in-progress') THEN 1 ELSE 0 END) AS active
                FROM dialer_calls WHERE session_id = :sid AND workspace_id = :ws
            """
        else:
            stats_sql = """
                SELECT
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE outcome = 'connected' OR status = 'completed') AS connected,
                    COUNT(*) FILTER (WHERE amd_result = 'machine') AS voicemail_amd,
                    COALESCE(AVG(duration_seconds), 0) AS avg_duration,
                    COUNT(*) FILTER (WHERE status IN ('queued','ringing','in-progress')) AS active
                FROM dialer_calls WHERE session_id = :sid AND workspace_id = :ws
            """
        rows = await self.session.execute(
            text(stats_sql),
            {"sid": session_id, "ws": self.workspace_id},
        )
        s = dict(rows.mappings().first() or {})
        total = int(s.get("total") or 0)
        connected = int(s.get("connected") or 0)
        stats = {
            "calls_made": total,
            "connected": connected,
            "connection_rate_percent": round((connected / total) * 100, 1) if total else 0.0,
            "avg_duration_seconds": round(float(s.get("avg_duration") or 0), 1),
            "active_calls": int(s.get("active") or 0),
            "voicemail_detected": int(s.get("voicemail_amd") or 0),
            "mock": _mock_twilio(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await self.session.execute(
            text(
                f"""
                UPDATE dialer_advanced_sessions
                SET stats_json = {json_bind(self.session, "stats")}, updated_at = CURRENT_TIMESTAMP
                WHERE id = :id AND workspace_id = :ws
                """
            ),
            {"id": session_id, "ws": self.workspace_id, "stats": json.dumps(stats)},
        )
        await self.session.commit()
        return stats

    async def _place_call(
        self,
        *,
        session_id: str,
        client_id: str,
        to_number: str,
        contact_id: str | None,
        voicemail_url: str | None,
        use_amd: bool = True,
    ) -> dict[str, Any]:
        default_from = os.environ.get("TWILIO_PHONE_NUMBER", "+34910000000").strip()
        local_from = _local_from_for(to_number, default_from)

        if _mock_twilio():
            amd = random.choice(["human", "machine", "unknown"])
            connected = amd == "human"
            call_id = str(uuid.uuid4())
            transcript = (
                "Hola, le llamo de NELVYON para comentarle nuestra solución de marketing con IA."
                if connected
                else ""
            )
            score = (await _score_with_gpt(transcript)) if transcript else {"score": 0, "summary": "No contestó"}
            storage_path = f"mock/{session_id}/{call_id}.mp3"
            await self.session.execute(
                text(
                    f"""
                    INSERT INTO dialer_calls (
                        id, workspace_id, contact_id, client_id, session_id, to_number, from_number,
                        local_from_number, status, duration_seconds, outcome, amd_result, call_score,
                        transcript, recording_url, recording_storage_path, notes
                    )
                    VALUES (
                        {uuid_bind(self.session, "id")}, :ws, {uuid_bind(self.session, "cid")},
                        :client_id, :sid, :to, :frm, :local_frm,
                        :status, :dur, :outcome, :amd, :score, :transcript,
                        :rec_url, :storage, :notes
                    )
                    """
                ),
                {
                    "id": call_id,
                    "ws": self.workspace_id,
                    "cid": contact_id,
                    "client_id": client_id,
                    "sid": session_id,
                    "to": _normalize_phone(to_number),
                    "frm": default_from,
                    "local_frm": local_from,
                    "status": "completed" if connected else "no-answer",
                    "dur": random.randint(15, 180) if connected else 0,
                    "outcome": "connected" if connected else ("voicemail" if amd == "machine" else "no-answer"),
                    "amd": amd,
                    "score": score.get("score", 0),
                    "transcript": transcript,
                    "rec_url": f"https://mock.supabase.local/{RECORDINGS_BUCKET}/{storage_path}",
                    "storage": storage_path,
                    "notes": score.get("summary", ""),
                },
            )
            await self.session.commit()
            return {
                "call_id": call_id,
                "mock": True,
                "amd_result": amd,
                "connected": connected,
                "local_from_number": local_from,
                "call_score": score,
            }

        twiml = "<Response><Say language=\"es-ES\">Conectando con NELVYON.</Say></Response>"
        if voicemail_url:
            twiml = f'<Response><Play>{voicemail_url}</Play></Response>'

        data: dict[str, str] = {
            "To": _normalize_phone(to_number),
            "From": local_from,
            "Twiml": twiml,
            "Record": "true",
        }
        if use_amd:
            data["MachineDetection"] = "Enable"
            data["AsyncAmd"] = "true"

        account_sid = os.environ.get("TWILIO_ACCOUNT_SID", "")
        auth_token = os.environ.get("TWILIO_AUTH_TOKEN", "")
        url = f"{TWILIO_API}/Accounts/{account_sid}/Calls.json"
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, auth=(account_sid, auth_token), data=data)
        if resp.status_code >= 400:
            raise ValueError(f"Twilio error: {resp.text[:200]}")
        tw = resp.json()
        call_sid = tw.get("sid")
        ins = await self.session.execute(
            text(
                f"""
                INSERT INTO dialer_calls (
                    workspace_id, contact_id, client_id, session_id, to_number, from_number,
                    local_from_number, call_sid, status, agent_id
                )
                VALUES (
                    :ws, {uuid_bind(self.session, "cid")}, :client_id, :sid, :to, :frm,
                    :local_frm, :csid, :status, 'advanced'
                )
                """
            ),
            {
                "ws": self.workspace_id,
                "cid": contact_id,
                "client_id": client_id,
                "sid": session_id,
                "to": data["To"],
                "frm": data["From"],
                "local_frm": local_from,
                "csid": call_sid,
                "status": tw.get("status", "queued"),
            },
        )
        await self.session.commit()
        rid = await self.session.execute(
            text("SELECT id FROM dialer_calls WHERE call_sid = :sid AND workspace_id = :ws"),
            {"sid": call_sid, "ws": self.workspace_id},
        )
        row = rid.mappings().first()
        call_id = str(row["id"]) if row else None
        return {
            "call_id": call_id,
            "call_sid": call_sid,
            "mock": False,
            "local_from_number": local_from,
        }

    async def start_power_dial(
        self,
        *,
        client_id: str,
        queue: list[dict[str, Any]],
        voicemail_url: str | None = None,
        max_calls: int = 10,
    ) -> dict[str, Any]:
        await DialerAdvancedService.ensure_schema(self.session)
        session_id = str(uuid.uuid4())
        await self.session.execute(
            text(
                f"""
                INSERT INTO dialer_advanced_sessions
                (id, workspace_id, client_id, mode, queue_json, voicemail_url, parallel_limit)
                VALUES (:id, :ws, :cid, 'power', {json_bind(self.session, "queue")}, :vm, 1)
                """
            ),
            {
                "id": session_id,
                "ws": self.workspace_id,
                "cid": client_id,
                "queue": json.dumps(queue),
                "vm": voicemail_url,
            },
        )
        await self.session.commit()

        results: list[dict[str, Any]] = []
        for item in queue[:max_calls]:
            to_number = item.get("phone") or item.get("to_number") or ""
            if not to_number:
                continue
            call = await self._place_call(
                session_id=session_id,
                client_id=client_id,
                to_number=to_number,
                contact_id=item.get("contact_id"),
                voicemail_url=voicemail_url if item.get("use_voicemail") else None,
            )
            if _mock_twilio() and call.get("amd_result") == "machine" and voicemail_url:
                call["voicemail_dropped"] = True
            elif _mock_twilio() and call.get("amd_result") == "machine":
                continue
            results.append(call)
            if call.get("connected"):
                break

        await self.session.execute(
            text(
                "UPDATE dialer_advanced_sessions SET status = 'completed' WHERE id = :id"
            ),
            {"id": session_id},
        )
        await self.session.commit()
        stats = await self._save_session_stats(session_id)
        return {
            "session_id": session_id,
            "mode": "power",
            "calls": results,
            "stats": stats,
            "mock": _mock_twilio(),
        }

    async def start_parallel_dial(
        self,
        *,
        client_id: str,
        queue: list[dict[str, Any]],
        parallel_limit: int = 3,
        voicemail_url: str | None = None,
    ) -> dict[str, Any]:
        await DialerAdvancedService.ensure_schema(self.session)
        session_id = str(uuid.uuid4())
        limit = min(parallel_limit, len(queue), 5)
        await self.session.execute(
            text(
                f"""
                INSERT INTO dialer_advanced_sessions
                (id, workspace_id, client_id, mode, queue_json, voicemail_url, parallel_limit)
                VALUES (:id, :ws, :cid, 'parallel', {json_bind(self.session, "queue")}, :vm, :pl)
                """
            ),
            {
                "id": session_id,
                "ws": self.workspace_id,
                "cid": client_id,
                "queue": json.dumps(queue),
                "vm": voicemail_url,
                "pl": limit,
            },
        )
        await self.session.commit()

        batch = queue[:limit]

        async def one(item: dict[str, Any]) -> dict[str, Any]:
            return await self._place_call(
                session_id=session_id,
                client_id=client_id,
                to_number=item.get("phone") or item.get("to_number") or "",
                contact_id=item.get("contact_id"),
                voicemail_url=None,
            )

        if batch:
            calls = []
            for item in batch:
                calls.append(await one(item))
        else:
            calls = []

        winner = next((c for c in calls if c.get("connected")), calls[0] if calls else None)
        await self.session.execute(
            text("UPDATE dialer_advanced_sessions SET status = 'completed' WHERE id = :id"),
            {"id": session_id},
        )
        await self.session.commit()
        stats = await self._save_session_stats(session_id)
        return {
            "session_id": session_id,
            "mode": "parallel",
            "calls": calls,
            "connected_call": winner,
            "stats": stats,
            "mock": _mock_twilio(),
        }

    async def voicemail_drop(self, *, call_sid: str | None, to_number: str | None, voicemail_url: str) -> dict[str, Any]:
        await DialerAdvancedService.ensure_schema(self.session)
        if not voicemail_url:
            raise ValueError("voicemail_url required")
        if _mock_twilio():
            return {
                "status": "voicemail_dropped",
                "mock": True,
                "call_sid": call_sid or f"mock-{uuid.uuid4().hex[:8]}",
                "to_number": to_number,
            }
        if not call_sid and not to_number:
            raise ValueError("call_sid or to_number required")
        account_sid = os.environ.get("TWILIO_ACCOUNT_SID", "")
        auth_token = os.environ.get("TWILIO_AUTH_TOKEN", "")
        frm = os.environ.get("TWILIO_PHONE_NUMBER", "")
        to = _normalize_phone(to_number or "")
        twiml = f"<Response><Play>{voicemail_url}</Play></Response>"
        url = f"{TWILIO_API}/Accounts/{account_sid}/Calls.json"
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                url,
                auth=(account_sid, auth_token),
                data={"To": to, "From": frm, "Twiml": twiml},
            )
        if resp.status_code >= 400:
            raise ValueError(resp.text[:200])
        return {"status": "voicemail_dropped", "call_sid": resp.json().get("sid"), "mock": False}

    async def get_session_stats(self, session_id: str) -> dict[str, Any]:
        await DialerAdvancedService.ensure_schema(self.session)
        row = await self.session.execute(
            text(
                "SELECT id, mode, status, client_id, stats_json FROM dialer_advanced_sessions WHERE id = :id AND workspace_id = :ws"
            ),
            {"id": session_id, "ws": self.workspace_id},
        )
        sess = row.mappings().first()
        if not sess:
            raise ValueError("session not found")
        stats = await self._save_session_stats(session_id)
        active = await self.session.execute(
            text(
                """
                SELECT id, call_sid, to_number, status, transcript, amd_result, call_score
                FROM dialer_calls
                WHERE session_id = :sid AND workspace_id = :ws
                AND status IN ('queued','ringing','in-progress')
                """
            ),
            {"sid": session_id, "ws": self.workspace_id},
        )
        return {
            "session_id": session_id,
            "mode": sess["mode"],
            "status": sess["status"],
            "client_id": sess["client_id"],
            "stats": stats,
            "active_calls": [dict(r) for r in active.mappings().all()],
            "mock": _mock_twilio(),
        }

    async def get_calls_for_client(self, client_id: str, limit: int = 50) -> dict[str, Any]:
        await DialerAdvancedService.ensure_schema(self.session)
        result = await self.session.execute(
            text(
                """
                SELECT d.*, c.name AS contact_name
                FROM dialer_calls d
                LEFT JOIN crm_contacts c ON c.id = d.contact_id
                WHERE d.workspace_id = :ws AND (d.client_id = :cid OR d.client_id IS NULL)
                ORDER BY d.created_at DESC
                LIMIT :lim
                """
            ),
            {"ws": self.workspace_id, "cid": client_id, "lim": limit},
        )
        items = []
        for r in result.mappings().all():
            row = dict(r)
            for k, v in list(row.items()):
                if hasattr(v, "isoformat"):
                    row[k] = v.isoformat()
                elif hasattr(v, "hex"):
                    row[k] = str(v)
            items.append(row)
        return {"client_id": client_id, "items": items, "mock": _mock_twilio()}

    async def finalize_call_pipeline(self, call_sid: str) -> dict[str, Any]:
        """Recording → Supabase → Whisper → IA score (post-call)."""
        rec = await self._dialer.get_call_recording(call_sid)
        recording_url = rec.get("recording_url")
        storage_path = None
        if recording_url and not _mock_twilio():
            async with httpx.AsyncClient(timeout=120) as http:
                audio = await http.get(
                    recording_url,
                    auth=(
                        os.environ.get("TWILIO_ACCOUNT_SID", ""),
                        os.environ.get("TWILIO_AUTH_TOKEN", ""),
                    ),
                )
            if audio.status_code < 400:
                path = f"{self.workspace_id}/{call_sid}.mp3"
                uploaded = await self._supabase.upload_bytes(RECORDINGS_BUCKET, path, audio.content, content_type="audio/mpeg")
                storage_path = uploaded.get("path") or path
                await self.session.execute(
                    text(
                        "UPDATE dialer_calls SET recording_storage_path = :p WHERE call_sid = :sid AND workspace_id = :ws"
                    ),
                    {"p": storage_path, "sid": call_sid, "ws": self.workspace_id},
                )
        tr = await self._dialer.transcribe_call(call_sid, recording_url)
        transcript = tr.get("transcript", "")
        score_data = await _score_with_gpt(transcript)
        await self.session.execute(
            text(
                """
                UPDATE dialer_calls SET call_score = :score, notes = COALESCE(notes,'') || :summary
                WHERE call_sid = :sid AND workspace_id = :ws
                """
            ),
            {
                "score": score_data.get("score", 0),
                "summary": score_data.get("summary", "")[:500],
                "sid": call_sid,
                "ws": self.workspace_id,
            },
        )
        await self.session.commit()
        return {
            "call_sid": call_sid,
            "recording_storage_path": storage_path,
            "transcript": transcript,
            "call_score": score_data,
        }


def get_dialer_advanced_service(session: AsyncSession, workspace_id: int) -> DialerAdvancedService:
    return DialerAdvancedService(session, workspace_id)
