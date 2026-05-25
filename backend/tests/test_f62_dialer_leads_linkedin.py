"""F62 — Advanced dialer, Apollo leads, LinkedIn outreach."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

QUEUE = [{"phone": "+34600111222"}, {"phone": "+34600333444"}]


@pytest.mark.asyncio
async def test_power_dial(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/dialer-advanced/power-dial",
        json={"client_id": "f62", "queue": QUEUE, "max_calls": 2},
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("session_id")
    assert body.get("mode") == "power"


@pytest.mark.asyncio
async def test_parallel_dial(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/dialer-advanced/parallel-dial",
        json={"client_id": "f62", "queue": QUEUE, "parallel_limit": 2},
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert r.json().get("mode") == "parallel"


@pytest.mark.asyncio
async def test_session_stats(client: AsyncClient, auth_headers: dict):
    gen = await client.post(
        "/api/dialer-advanced/power-dial",
        json={"client_id": "f62-stats", "queue": QUEUE[:1]},
        headers=auth_headers,
    )
    sid = gen.json()["session_id"]
    r = await client.get(f"/api/dialer-advanced/session/{sid}/stats", headers=auth_headers)
    assert r.status_code == 200
    assert "stats" in r.json()


@pytest.mark.asyncio
async def test_calls_history(client: AsyncClient, auth_headers: dict):
    await client.post(
        "/api/dialer-advanced/power-dial",
        json={"client_id": "f62-hist", "queue": QUEUE[:1]},
        headers=auth_headers,
    )
    r = await client.get("/api/dialer-advanced/calls/f62-hist", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json().get("items"), list)


@pytest.mark.asyncio
async def test_voicemail_drop(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/dialer-advanced/voicemail-drop",
        json={"to_number": "+34600999888", "voicemail_url": "https://demo.nelvyon.com/vm.mp3"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert r.json().get("status") == "voicemail_dropped"


@pytest.mark.asyncio
async def test_power_dial_mock_flag(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/dialer-advanced/power-dial",
        json={"client_id": "f62-mock", "queue": QUEUE},
        headers=auth_headers,
    )
    assert r.json().get("mock") is True


@pytest.mark.asyncio
async def test_dialer_advanced_requires_auth(client: AsyncClient):
    r = await client.post("/api/dialer-advanced/power-dial", json={"client_id": "x", "queue": QUEUE})
    assert r.status_code in (401, 403)


@pytest.mark.asyncio
async def test_apollo_search(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/apollo/search",
        json={"sector": "saas", "city": "Madrid", "limit": 5},
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert len(r.json().get("items", [])) >= 1


@pytest.mark.asyncio
async def test_apollo_search_mock(client: AsyncClient, auth_headers: dict):
    r = await client.post("/api/apollo/search", json={"sector": "saas"}, headers=auth_headers)
    assert r.json().get("mock") is True


@pytest.mark.asyncio
async def test_apollo_sync_crm(client: AsyncClient, auth_headers: dict):
    search = await client.post("/api/apollo/search", json={"sector": "ecommerce"}, headers=auth_headers)
    leads = search.json().get("items", [])[:2]
    r = await client.post("/api/apollo/sync-crm", json={"leads": leads}, headers=auth_headers)
    assert r.status_code == 200
    assert r.json().get("synced", 0) >= 1


@pytest.mark.asyncio
async def test_apollo_suggestions(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/apollo/suggestions/f62-client?sector=saas", headers=auth_headers)
    assert r.status_code == 200
    assert "suggestions" in r.json()


@pytest.mark.asyncio
async def test_apollo_enrich_contact(client: AsyncClient, auth_headers: dict):
    sync = await client.post(
        "/api/apollo/sync-crm",
        json={
            "leads": [
                {
                    "name": "Enrich Target",
                    "email": None,
                    "phone": None,
                    "company": "Test Co",
                    "apollo_id": "enrich-1",
                }
            ]
        },
        headers=auth_headers,
    )
    cid = sync.json()["contacts"][0]["contact_id"]
    r = await client.post(f"/api/apollo/enrich/{cid}", headers=auth_headers)
    assert r.status_code == 200
    assert r.json().get("enriched")


@pytest.mark.asyncio
async def test_apollo_requires_auth(client: AsyncClient):
    r = await client.post("/api/apollo/search", json={"sector": "saas"})
    assert r.status_code in (401, 403)


@pytest.mark.asyncio
async def test_linkedin_connect_preview(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/linkedin/connect",
        json={
            "client_id": "f62-li",
            "prospect_name": "Pedro SaaS",
            "company": "Acme",
            "preview_only": True,
        },
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert r.json().get("preview")


@pytest.mark.asyncio
async def test_linkedin_sequence(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/linkedin/sequence/contact-abc",
        json={
            "client_id": "f62-li",
            "prospect_name": "Maria B2B",
            "company": "Growth SL",
            "sector": "saas",
        },
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert r.json().get("sequence_status") == "active"


@pytest.mark.asyncio
async def test_linkedin_stats(client: AsyncClient, auth_headers: dict):
    await client.post(
        "/api/linkedin/sequence/c1",
        json={"client_id": "f62-stats", "prospect_name": "A", "company": "B"},
        headers=auth_headers,
    )
    r = await client.get("/api/linkedin/stats/f62-stats", headers=auth_headers)
    assert r.status_code == 200
    assert "acceptance_rate_percent" in r.json()


@pytest.mark.asyncio
async def test_linkedin_inbox(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/linkedin/inbox/f62-inbox", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json().get("items"), list)


@pytest.mark.asyncio
async def test_linkedin_prospects(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/linkedin/prospects/f62-li", headers=auth_headers)
    assert r.status_code == 200
    assert "prospects" in r.json()


@pytest.mark.asyncio
async def test_linkedin_mock(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/linkedin/connect",
        json={"client_id": "f62", "prospect_name": "Test", "company": "Co"},
        headers=auth_headers,
    )
    assert r.json().get("mock") is True


@pytest.mark.asyncio
async def test_linkedin_requires_auth(client: AsyncClient):
    r = await client.get("/api/linkedin/stats/x")
    assert r.status_code in (401, 403)


@pytest.mark.asyncio
async def test_parallel_has_connected_call(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/dialer-advanced/parallel-dial",
        json={"client_id": "f62-par", "queue": QUEUE, "parallel_limit": 2},
        headers=auth_headers,
    )
    assert r.json().get("calls")
    assert "stats" in r.json()
