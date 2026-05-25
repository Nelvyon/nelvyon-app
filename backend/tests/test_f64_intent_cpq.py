"""F64 — Intent data + CPQ."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

LEAD = "lead-f64-001"


@pytest.mark.asyncio
async def test_intent_track_pageview(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/intent/track",
        json={"lead_id": LEAD, "event_type": "pageview", "page": "/pricing", "lead_name": "Test Lead"},
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    assert r.json().get("score", 0) >= 0


@pytest.mark.asyncio
async def test_intent_track_email_open(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/intent/track",
        json={"lead_id": LEAD, "event_type": "email_open"},
        headers=auth_headers,
    )
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_intent_score(client: AsyncClient, auth_headers: dict):
    await client.post(
        "/api/intent/track",
        json={"lead_id": "score-lead", "event_type": "click", "page": "/pricing"},
        headers=auth_headers,
    )
    r = await client.get("/api/intent/score/score-lead", headers=auth_headers)
    assert r.status_code == 200
    assert "score" in r.json()


@pytest.mark.asyncio
async def test_intent_hot_leads(client: AsyncClient, auth_headers: dict):
    lid = "hot-lead-f64"
    for _ in range(3):
        await client.post(
            "/api/intent/track",
            json={"lead_id": lid, "event_type": "pageview", "page": "/pricing"},
            headers=auth_headers,
        )
    await client.post(
        "/api/intent/track",
        json={"lead_id": lid, "event_type": "email_open"},
        headers=auth_headers,
    )
    await client.post(
        "/api/intent/track",
        json={"lead_id": lid, "event_type": "click"},
        headers=auth_headers,
    )
    r = await client.get("/api/intent/hot-leads?min_score=70", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json().get("leads"), list)


@pytest.mark.asyncio
async def test_intent_distribution(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/intent/distribution", headers=auth_headers)
    assert r.status_code == 200
    assert "distribution" in r.json()


@pytest.mark.asyncio
async def test_intent_trigger_sequence(client: AsyncClient, auth_headers: dict):
    await client.post(
        "/api/intent/track",
        json={"lead_id": "seq-lead", "event_type": "pageview", "page": "/pricing"},
        headers=auth_headers,
    )
    r = await client.post("/api/intent/trigger-sequence/seq-lead", headers=auth_headers)
    assert r.status_code == 200
    assert r.json().get("sequence")


@pytest.mark.asyncio
async def test_intent_alerts_settings(client: AsyncClient, auth_headers: dict):
    r = await client.patch(
        "/api/intent/settings/alerts",
        json={"alerts_enabled": False},
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert r.json().get("alerts_enabled") is False


@pytest.mark.asyncio
async def test_intent_requires_auth(client: AsyncClient):
    r = await client.get("/api/intent/hot-leads")
    assert r.status_code in (401, 403)


@pytest.mark.asyncio
async def test_cpq_generate(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/cpq/generate",
        json={
            "client_id": "f64-client",
            "lead_email": "cpq@test.com",
            "sector": "saas",
            "services": ["SEO", "Google Ads"],
            "company_size": "51-200",
            "send_email": False,
        },
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    assert r.json().get("id")
    assert r.json().get("price_breakdown") or r.json().get("price_breakdown_json")


@pytest.mark.asyncio
async def test_cpq_list_quotes(client: AsyncClient, auth_headers: dict):
    await client.post(
        "/api/cpq/generate",
        json={
            "client_id": "f64-list",
            "lead_email": "list@test.com",
            "sector": "retail",
            "services": ["Email"],
            "send_email": False,
        },
        headers=auth_headers,
    )
    r = await client.get("/api/cpq/quotes?client_id=f64-list", headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json().get("quotes", [])) >= 1


@pytest.mark.asyncio
async def test_cpq_get_quote(client: AsyncClient, auth_headers: dict):
    gen = await client.post(
        "/api/cpq/generate",
        json={
            "client_id": "f64-one",
            "lead_email": "one@test.com",
            "sector": "clinica",
            "services": ["Ads"],
            "send_email": False,
        },
        headers=auth_headers,
    )
    qid = gen.json()["id"]
    r = await client.get(f"/api/cpq/quotes/{qid}", headers=auth_headers)
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_cpq_update_status(client: AsyncClient, auth_headers: dict):
    gen = await client.post(
        "/api/cpq/generate",
        json={
            "client_id": "f64-st",
            "lead_email": "st@test.com",
            "sector": "gym",
            "services": ["Social"],
            "send_email": False,
        },
        headers=auth_headers,
    )
    qid = gen.json()["id"]
    r = await client.patch(
        f"/api/cpq/quotes/{qid}/status",
        json={"status": "accepted"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert r.json().get("status") == "accepted"


@pytest.mark.asyncio
async def test_cpq_send(client: AsyncClient, auth_headers: dict):
    gen = await client.post(
        "/api/cpq/generate",
        json={
            "client_id": "f64-send",
            "lead_email": "send@test.com",
            "sector": "abogado",
            "services": ["SEO"],
            "send_email": False,
        },
        headers=auth_headers,
    )
    assert gen.status_code == 200, gen.text
    qid = gen.json()["id"]
    got = await client.get(f"/api/cpq/quotes/{qid}", headers=auth_headers)
    assert got.status_code == 200, got.text
    r = await client.post(f"/api/cpq/quotes/{qid}/send", headers=auth_headers)
    assert r.status_code == 200, r.text
    assert r.json().get("status") == "sent"


@pytest.mark.asyncio
async def test_cpq_viewed_pixel(client: AsyncClient, auth_headers: dict):
    gen = await client.post(
        "/api/cpq/generate",
        json={
            "client_id": "f64-view",
            "lead_email": "view@test.com",
            "sector": "hotel",
            "services": ["Ads"],
            "send_email": False,
        },
        headers=auth_headers,
    )
    qid = gen.json()["id"]
    r = await client.get(f"/api/cpq/quotes/{qid}/viewed")
    assert r.status_code == 200
    assert "image" in r.headers.get("content-type", "")


@pytest.mark.asyncio
async def test_cpq_requires_auth(client: AsyncClient):
    r = await client.get("/api/cpq/quotes")
    assert r.status_code in (401, 403)


@pytest.mark.asyncio
async def test_intent_cold_tier(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/intent/track",
        json={"lead_id": "cold-only", "event_type": "pageview", "page": "/blog"},
        headers=auth_headers,
    )
    assert r.json().get("tier") in ("cold", "warm", "hot")


@pytest.mark.asyncio
async def test_cpq_stats_in_list(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/cpq/quotes", headers=auth_headers)
    assert r.status_code == 200
    assert "stats" in r.json()


@pytest.mark.asyncio
async def test_intent_get_alerts(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/intent/settings/alerts", headers=auth_headers)
    assert r.status_code == 200
    assert "alerts_enabled" in r.json()


@pytest.mark.asyncio
async def test_cpq_generate_with_email(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/cpq/generate",
        json={
            "client_id": "f64-email",
            "lead_email": "auto@test.com",
            "sector": "ecommerce",
            "services": ["CRM"],
            "send_email": True,
        },
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    assert r.json().get("status") == "sent"
    assert r.json().get("email_result", {}).get("mock") is True


@pytest.mark.asyncio
async def test_intent_score_has_tier_and_signals(client: AsyncClient, auth_headers: dict):
    lid = "signals-lead"
    await client.post(
        "/api/intent/track",
        json={"lead_id": lid, "event_type": "time_on_page", "metadata": {"duration_seconds": 200}},
        headers=auth_headers,
    )
    r = await client.get(f"/api/intent/score/{lid}", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert "tier" in body
    assert "signals" in body
