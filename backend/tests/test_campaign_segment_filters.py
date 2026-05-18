"""
B1-3 — Campaign audience segmentation filters (workspace-safe).
"""
from uuid import uuid4

import pytest
from httpx import AsyncClient


def _headers_for_workspace(auth_headers: dict, workspace_id: int) -> dict:
    h = dict(auth_headers)
    h["X-Workspace-Id"] = str(workspace_id)
    return h


async def _create_contact(
    client: AsyncClient,
    headers: dict,
    *,
    first_name: str,
    email: str,
    status: str,
    tags: str,
    source: str,
    score: int,
):
    resp = await client.post(
        "/api/v1/entities/contacts",
        json={
            "first_name": first_name,
            "email": email,
            "status": status,
            "tags": tags,
            "source": source,
            "score": score,
        },
        headers=headers,
    )
    assert resp.status_code in (200, 201), resp.text


@pytest.mark.asyncio
async def test_campaign_preview_filters_status_tags_source_score(client: AsyncClient, auth_headers: dict):
    suffix = uuid4().hex[:8]
    headers_a = _headers_for_workspace(auth_headers, int(auth_headers["X-Workspace-Id"]))
    uniq = f"preview_seg_{suffix}"

    await _create_contact(
        client,
        headers_a,
        first_name="Match",
        email=f"match-{suffix}@test.com",
        status="active",
        tags=f"vip,b2b,{uniq}",
        source="web",
        score=92,
    )
    await _create_contact(
        client,
        headers_a,
        first_name="NoTag",
        email=f"notag-{suffix}@test.com",
        status="active",
        tags="newsletter",
        source="web",
        score=90,
    )
    await _create_contact(
        client,
        headers_a,
        first_name="NoStatus",
        email=f"nostatus-{suffix}@test.com",
        status="inactive",
        tags=f"vip,{uniq}",
        source="web",
        score=95,
    )
    await _create_contact(
        client,
        headers_a,
        first_name="NoScore",
        email=f"noscore-{suffix}@test.com",
        status="active",
        tags=f"vip,{uniq}",
        source="web",
        score=40,
    )

    preview = await client.get(
        "/api/v1/campaign-sender/preview-recipients",
        params={
            "status": "active",
            "tags": uniq,
            "source": "web",
            "score_min": 80,
        },
        headers=headers_a,
    )
    assert preview.status_code == 200, preview.text
    data = preview.json()
    assert data["total_recipients"] == 1
    assert data["applied_filters"]["status"] == "active"
    assert data["applied_filters"]["source"] == "web"
    assert data["applied_filters"]["score_min"] == 80
    assert data["preview"][0]["email"] == f"match-{suffix}@test.com"


@pytest.mark.asyncio
async def test_campaign_send_uses_same_segment_logic_as_preview(client: AsyncClient, auth_headers: dict):
    suffix = uuid4().hex[:8]
    headers_a = _headers_for_workspace(auth_headers, int(auth_headers["X-Workspace-Id"]))
    uniq = f"send_seg_{suffix}"

    await _create_contact(
        client,
        headers_a,
        first_name="A1",
        email=f"a1-{suffix}@test.com",
        status="active",
        tags=f"vip,{uniq}",
        source="web",
        score=88,
    )
    await _create_contact(
        client,
        headers_a,
        first_name="A2",
        email=f"a2-{suffix}@test.com",
        status="active",
        tags=f"vip,{uniq}",
        source="web",
        score=91,
    )
    await _create_contact(
        client,
        headers_a,
        first_name="B1",
        email=f"b1-{suffix}@test.com",
        status="active",
        tags="other",
        source="ads",
        score=97,
    )

    campaign = await client.post(
        "/api/v1/entities/campaigns",
        json={
            "name": f"Segmented-{suffix}",
            "type": "email",
            "status": "draft",
            "subject": "Segment test",
            "content": "Body",
        },
        headers=headers_a,
    )
    assert campaign.status_code in (200, 201), campaign.text
    campaign_id = campaign.json()["id"]

    params = {"status": "active", "tags": uniq, "source": "web", "score_min": 80}
    preview = await client.get("/api/v1/campaign-sender/preview-recipients", params=params, headers=headers_a)
    assert preview.status_code == 200
    preview_total = preview.json()["total_recipients"]
    assert preview_total == 2

    send = await client.post(
        "/api/v1/campaign-sender/send",
        json={"campaign_id": campaign_id, "segment_filters": params},
        headers=headers_a,
    )
    assert send.status_code == 200, send.text
    send_data = send.json()
    assert send_data["recipients_count"] == preview_total
    assert uniq in (send_data.get("applied_filters") or {}).get("tags", [])

    campaign_after = await client.get(f"/api/v1/entities/campaigns/{campaign_id}", headers=headers_a)
    assert campaign_after.status_code == 200
    assert campaign_after.json()["recipients_count"] == preview_total


def _without_workspace_header(auth_headers: dict) -> dict:
    return {k: v for k, v in auth_headers.items() if k.lower() != "x-workspace-id"}


@pytest.mark.asyncio
async def test_campaign_segment_filters_are_workspace_isolated(client: AsyncClient, auth_headers: dict):
    suffix = uuid4().hex[:8]
    ws_a = int(auth_headers["X-Workspace-Id"])
    headers_a = _headers_for_workspace(auth_headers, ws_a)
    no_ws = _without_workspace_header(auth_headers)

    ws_resp = await client.post(
        "/api/v1/workspace/create",
        json={"name": f"QA-SEG-{suffix}", "slug": f"qa-seg-{suffix}"},
        headers=no_ws,
    )
    assert ws_resp.status_code == 201, ws_resp.text
    ws_b = ws_resp.json()["id"]
    headers_b = _headers_for_workspace(auth_headers, ws_b)
    uniq = f"ws_iso_{suffix}"

    await _create_contact(
        client,
        headers_a,
        first_name="A-Only",
        email=f"a-only-{suffix}@test.com",
        status="active",
        tags=f"vip,{uniq}",
        source="web",
        score=90,
    )
    await _create_contact(
        client,
        headers_b,
        first_name="B-Only",
        email=f"b-only-{suffix}@test.com",
        status="active",
        tags=f"vip,{uniq}",
        source="web",
        score=90,
    )

    params = {"status": "active", "tags": uniq, "source": "web", "score_min": 80}
    preview_a = await client.get("/api/v1/campaign-sender/preview-recipients", params=params, headers=headers_a)
    preview_b = await client.get("/api/v1/campaign-sender/preview-recipients", params=params, headers=headers_b)
    assert preview_a.status_code == 200 and preview_b.status_code == 200
    assert preview_a.json()["total_recipients"] == 1
    assert preview_b.json()["total_recipients"] == 1
    assert preview_a.json()["preview"][0]["email"] != preview_b.json()["preview"][0]["email"]
