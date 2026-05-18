"""
VOZ NELVYON v2 — plan allowlist (same semantics as web v1) + monthly action cap.
"""
from __future__ import annotations

import os
import re
from calendar import monthrange
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.voice_pilot import Voice_pilot_usage
from services.plan_quota import get_active_plan_id_for_workspace

_ALLOWED_CT = frozenset(
    {
        "audio/webm",
        "audio/wav",
        "audio/x-wav",
        "audio/wave",
        "audio/mpeg",
        "audio/mp4",
        "audio/ogg",
        "audio/opus",
    }
)

MAX_INBOUND_BYTES = int(os.environ.get("VOICE_V2_INBOUND_MAX_BYTES", str(5 * 1024 * 1024)))  # 5 MiB default


def _plan_allowlist_raw() -> str:
    return (os.environ.get("VOICE_V1_PLAN_IDS") or os.environ.get("NEXT_PUBLIC_VOICE_V1_PLAN_IDS") or "").strip()


def parse_voice_plan_allowlist() -> frozenset[str]:
    raw = _plan_allowlist_raw()
    if not raw:
        return frozenset()
    parts = {p.strip().lower() for p in raw.split(",") if p.strip()}
    return frozenset(parts)


def monthly_action_cap() -> int:
    return max(1, int(os.environ.get("VOICE_V2_PILOT_MONTHLY_ACTION_CAP", "30")))


def current_period_yyyymm() -> int:
    now = datetime.now(timezone.utc)
    return now.year * 100 + now.month


def voice_pilot_storage_root() -> Path:
    raw = os.environ.get("VOICE_V2_PILOT_STORAGE_DIR", "").strip()
    if raw:
        return Path(raw)
    return Path(__file__).resolve().parent.parent / "data" / "voice_pilot_v2"


def _sanitize_storage_key(key: str) -> bool:
    return bool(re.fullmatch(r"[a-f0-9]{32}", key))


async def assert_voice_plan_allowed(db: AsyncSession, workspace_id: int) -> str:
    allow = parse_voice_plan_allowlist()
    plan_id = (await get_active_plan_id_for_workspace(db, workspace_id)).strip().lower()
    if not allow or plan_id not in allow:
        raise HTTPException(
            status_code=403,
            detail="Voice pilot is not enabled for this workspace plan (allowlist empty or plan_id not listed).",
        )
    return plan_id


async def _get_usage_row(session: AsyncSession, workspace_id: int, period: int) -> Voice_pilot_usage:
    r = await session.execute(
        select(Voice_pilot_usage).where(
            Voice_pilot_usage.workspace_id == workspace_id,
            Voice_pilot_usage.period_yyyymm == period,
        )
    )
    row = r.scalar_one_or_none()
    if row:
        return row
    row = Voice_pilot_usage(workspace_id=workspace_id, period_yyyymm=period, inbound_count=0, synth_count=0)
    session.add(row)
    await session.flush()
    return row


async def get_governance_snapshot(db: AsyncSession, workspace_id: int) -> dict:
    allow = parse_voice_plan_allowlist()
    plan_id = (await get_active_plan_id_for_workspace(db, workspace_id)).strip().lower()
    plan_allowed = bool(allow) and plan_id in allow
    cap = monthly_action_cap()
    period = current_period_yyyymm()
    r = await db.execute(
        select(Voice_pilot_usage).where(
            Voice_pilot_usage.workspace_id == workspace_id,
            Voice_pilot_usage.period_yyyymm == period,
        )
    )
    u = r.scalar_one_or_none()
    inbound_used = int(u.inbound_count or 0) if u else 0
    synth_used = int(u.synth_count or 0) if u else 0
    used = inbound_used + synth_used
    return {
        "plan_id": plan_id,
        "plan_allowed": plan_allowed,
        "period_yyyymm": period,
        "monthly_cap": cap,
        "inbound_used": inbound_used,
        "synth_used": synth_used,
        "actions_used": used,
        "actions_remaining": max(0, cap - used),
    }


async def assert_quota_headroom(db: AsyncSession, workspace_id: int, *, need: int) -> None:
    snap = await get_governance_snapshot(db, workspace_id)
    if not snap["plan_allowed"]:
        raise HTTPException(status_code=403, detail="Voice pilot is not enabled for this workspace plan.")
    if snap["actions_remaining"] < need:
        raise HTTPException(
            status_code=429,
            detail=f"Voice pilot monthly limit reached ({snap['monthly_cap']} actions / workspace / month).",
        )


async def increment_inbound(session: AsyncSession, workspace_id: int) -> None:
    row = await _get_usage_row(session, workspace_id, current_period_yyyymm())
    row.inbound_count = int(row.inbound_count or 0) + 1


async def increment_synth(session: AsyncSession, workspace_id: int) -> None:
    row = await _get_usage_row(session, workspace_id, current_period_yyyymm())
    row.synth_count = int(row.synth_count or 0) + 1


def assert_allowed_mime(content_type: Optional[str]) -> str:
    ct = (content_type or "application/octet-stream").split(";")[0].strip().lower()
    if ct not in _ALLOWED_CT:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio type: {ct}. Allowed: {', '.join(sorted(_ALLOWED_CT))}.",
        )
    return ct


def inbound_file_path(workspace_id: int, storage_key: str) -> Path:
    if not _sanitize_storage_key(storage_key):
        raise HTTPException(status_code=400, detail="Invalid storage key")
    root = voice_pilot_storage_root()
    return root / str(int(workspace_id)) / storage_key


def write_inbound_file(workspace_id: int, storage_key: str, data: bytes, content_type: str) -> Path:
    path = inbound_file_path(workspace_id, storage_key)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return path


def new_storage_key() -> str:
    return uuid4().hex


def voice_ticket_description(*, inbound_db_id: int, storage_key: str) -> str:
    return (
        "[VOZ_V2_INBOUND]\n"
        "This is not a live phone line — a short voice note attached to this ticket (pilot).\n"
        f"inbound_id={inbound_db_id}\n"
        f"storage_key={storage_key}\n"
    )
