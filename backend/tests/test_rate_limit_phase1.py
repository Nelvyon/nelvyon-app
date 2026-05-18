"""
RATE-LIMIT-1 FASE 1 — pruebas HTTP reales de limite en rutas sensibles.
"""

import asyncio
from uuid import uuid4

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_rate_limit_campaign_sender_enforces_429_and_resets(
    client: AsyncClient, auth_headers: dict, monkeypatch
):
    """
    Verifica:
    1) primera petición dentro de ventana => no 429
    2) segunda petición con límite 1 => 429 (estable aunque el negocio devuelva 400 tras estado sent)
    3) tras ventana, vuelve a permitir
    """
    import middlewares.rate_limiter as rl

    from core.redis_adapter import redis_client

    await redis_client.initialize()
    if not redis_client.is_redis:
        await redis_client._fallback.flushall()

    monkeypatch.setenv("RATE_LIMIT_ENABLE_IN_TEST", "1")
    # Nombre de regla único: la suite completa acumula contadores en memoria bajo `campaign_send` (60s).
    monkeypatch.setattr(
        rl,
        "RATE_LIMIT_RULES",
        [
            {
                "name": "campaign_send_rate_limit_phase1_isolated",
                "methods": {"POST"},
                "path_prefix": "/api/v1/campaign-sender/send",
                "limit": 1,
                "window": 1,
                "scope": "ip_workspace",
            }
        ],
    )

    suffix = uuid4().hex[:8]
    # IP distinta por ejecución: otras pruebas pueden acumular contadores bajo 127.0.0.1+ws.
    rl_headers = {
        **auth_headers,
        "X-Forwarded-For": f"198.51.100.{(int(suffix[:6], 16) % 220) + 1}",
    }

    c = await client.post(
        "/api/v1/entities/contacts",
        json={"first_name": "Rate", "email": f"rate-{suffix}@example.com", "status": "active"},
        headers=rl_headers,
    )
    assert c.status_code in (200, 201), c.text

    camp = await client.post(
        "/api/v1/entities/campaigns",
        json={
            "name": f"RL-{suffix}",
            "type": "email",
            "status": "draft",
            "subject": "Rate limit test",
            "content": "<p>hola</p>",
        },
        headers=rl_headers,
    )
    assert camp.status_code in (200, 201), camp.text
    campaign_id = camp.json()["id"]

    # Envío real puede tardar >1s con muchos contactos y expirar la ventana del rate limit.
    from services.campaign_sender import CampaignSenderService

    async def _fast_send(self, campaign_id, user_id, workspace_id, segment_filters=None):
        return {
            "campaign_id": campaign_id,
            "status": "sent",
            "recipients_count": 1,
            "sent_count": 1,
            "failed_count": 0,
            "sendgrid_configured": False,
            "applied_filters": segment_filters or {},
        }

    monkeypatch.setattr(CampaignSenderService, "send_campaign", _fast_send)

    send_payload = {"campaign_id": campaign_id}

    r1 = await client.post("/api/v1/campaign-sender/send", json=send_payload, headers=rl_headers)
    assert r1.status_code in (200, 400), r1.text

    r2 = await client.post("/api/v1/campaign-sender/send", json=send_payload, headers=rl_headers)
    assert r2.status_code == 429, r2.text
    body = r2.json()
    assert body.get("detail") == "Too many requests. Please try again later."
    assert "Retry-After" in r2.headers

    await asyncio.sleep(1.1)
    r3 = await client.post("/api/v1/campaign-sender/send", json=send_payload, headers=rl_headers)
    assert r3.status_code in (200, 400), r3.text
