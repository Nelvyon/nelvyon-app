"""VOZ NELVYON v2 pilot — governance, inbound → ticket + audio download, synth consume + monthly cap."""

import os
import struct

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.fixture(autouse=True)
def _voice_plan_allowlist(monkeypatch: pytest.MonkeyPatch):
    """Isolate voice tests from env/subscription pollution across the full suite."""
    monkeypatch.setenv("VOICE_V1_PLAN_IDS", "starter")
    monkeypatch.delenv("NEXT_PUBLIC_VOICE_V1_PLAN_IDS", raising=False)


@pytest.fixture(autouse=True)
async def _voice_workspace_starter_plan(db_session: AsyncSession):
    for ws_id, user_id in (
        (1, "test-user-00000000-0000-0000-0000-000000000001"),
        (2, "admin-user-00000000-0000-0000-0000-000000000001"),
    ):
        await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = :ws"), {"ws": ws_id})
        await db_session.execute(
            text(
                """
                INSERT INTO subscriptions (user_id, workspace_id, plan_id, billing_cycle, status)
                VALUES (:uid, :ws, 'starter', 'monthly', 'active')
                """
            ),
            {"uid": user_id, "ws": ws_id},
        )
    await db_session.commit()


def _minimal_wav() -> bytes:
    """Tiny valid WAV (silence) for multipart upload tests."""
    data = b""
    return (
        b"RIFF"
        + struct.pack("<I", 36 + len(data))
        + b"WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00"
        + struct.pack("<I", 8000)
        + struct.pack("<I", 16000)
        + b"\x02\x00\x10\x00data"
        + struct.pack("<I", len(data))
        + data
    )


@pytest.mark.asyncio
async def test_voice_v2_governance_respects_allowlist(monkeypatch: pytest.MonkeyPatch, client: AsyncClient, auth_headers: dict):
    monkeypatch.delenv("VOICE_V1_PLAN_IDS", raising=False)
    monkeypatch.delenv("NEXT_PUBLIC_VOICE_V1_PLAN_IDS", raising=False)
    r = await client.get("/api/v1/voice/v2/governance", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["plan_allowed"] is False
    assert data["actions_remaining"] >= 0

    monkeypatch.setenv("VOICE_V1_PLAN_IDS", "starter")
    r2 = await client.get("/api/v1/voice/v2/governance", headers=auth_headers)
    assert r2.status_code == 200
    assert r2.json()["plan_allowed"] is True


@pytest.mark.asyncio
async def test_voice_v2_inbound_creates_ticket_and_audio_download(
    monkeypatch: pytest.MonkeyPatch, client: AsyncClient, admin_headers: dict
):
    monkeypatch.setenv("VOICE_V1_PLAN_IDS", "starter")
    monkeypatch.setenv("VOICE_V2_PILOT_MONTHLY_ACTION_CAP", "20")
    root = os.path.join(os.path.dirname(__file__), "..", "data", "voice_pilot_v2_test")
    monkeypatch.setenv("VOICE_V2_PILOT_STORAGE_DIR", root)

    wav = _minimal_wav()
    files = {"file": ("note.wav", wav, "audio/wav")}
    up = await client.post("/api/v1/voice/v2/inbound", files=files, headers=admin_headers)
    assert up.status_code == 201, up.text
    body = up.json()
    assert "ticket_id" in body and "inbound_id" in body

    audio = await client.get(
        f"/api/v1/voice/v2/inbound/{body['inbound_id']}/audio",
        headers=admin_headers,
    )
    assert audio.status_code == 200
    assert len(audio.content) == len(wav)


@pytest.mark.asyncio
async def test_voice_v2_member_cannot_post_inbound(monkeypatch: pytest.MonkeyPatch, client: AsyncClient, member_headers: dict):
    monkeypatch.setenv("VOICE_V1_PLAN_IDS", "starter")
    wav = _minimal_wav()
    files = {"file": ("note.wav", wav, "audio/wav")}
    up = await client.post("/api/v1/voice/v2/inbound", files=files, headers=member_headers)
    assert up.status_code == 403


@pytest.mark.asyncio
async def test_voice_v2_monthly_cap_blocks(
    monkeypatch: pytest.MonkeyPatch, client: AsyncClient, admin_headers: dict, db_session: AsyncSession
):
    monkeypatch.setenv("VOICE_V1_PLAN_IDS", "starter")
    monkeypatch.setenv("VOICE_V2_PILOT_MONTHLY_ACTION_CAP", "2")
    root = os.path.join(os.path.dirname(__file__), "..", "data", "voice_pilot_v2_test_cap")
    monkeypatch.setenv("VOICE_V2_PILOT_STORAGE_DIR", root)

    await db_session.execute(text("DELETE FROM voice_pilot_inbound WHERE workspace_id = 2"))
    await db_session.execute(text("DELETE FROM voice_pilot_usage WHERE workspace_id = 2"))
    await db_session.execute(text("DELETE FROM helpdesk_tickets WHERE workspace_id = 2 AND channel = 'voice_v2_pilot'"))
    await db_session.commit()

    wav = _minimal_wav()
    for i in range(2):
        files = {"file": (f"n{i}.wav", wav, "audio/wav")}
        r = await client.post("/api/v1/voice/v2/inbound", files=files, headers=admin_headers)
        assert r.status_code == 201, r.text

    files3 = {"file": ("n3.wav", wav, "audio/wav")}
    blocked = await client.post("/api/v1/voice/v2/inbound", files=files3, headers=admin_headers)
    assert blocked.status_code == 429


@pytest.mark.asyncio
async def test_voice_v2_synth_consume(monkeypatch: pytest.MonkeyPatch, client: AsyncClient, admin_headers: dict):
    monkeypatch.setenv("VOICE_V1_PLAN_IDS", "starter")
    monkeypatch.setenv("VOICE_V2_PILOT_MONTHLY_ACTION_CAP", "50")
    r = await client.post(
        "/api/v1/voice/v2/synth/consume",
        json={"char_count": 120},
        headers=admin_headers,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["ok"] is True
    assert data["synth_used"] >= 1
