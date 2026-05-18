import uuid

import pytest
from httpx import AsyncClient


async def _create_blog_post(client: AsyncClient, headers: dict, title: str) -> int:
    resp = await client.post(
        "/api/v1/entities/blog_posts",
        headers=headers,
        json={"title": title, "content": "hello"},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


async def _create_report_item(client: AsyncClient, headers: dict, name: str) -> int:
    resp = await client.post(
        "/api/v1/entities/report_items",
        headers=headers,
        json={"name": name, "report_type": "kpi"},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


async def _create_segment_result(client: AsyncClient, headers: dict, top_segment: str) -> int:
    resp = await client.post(
        "/api/v1/entities/segment_results",
        headers=headers,
        json={"top_segment": top_segment, "total_contacts": 10},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_blog_posts_member_forbidden_create(client: AsyncClient, member_headers: dict):
    resp = await client.post(
        "/api/v1/entities/blog_posts",
        headers=member_headers,
        json={"title": "nope"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_blog_posts_cross_workspace_rejected(client: AsyncClient, auth_headers: dict, admin_headers: dict):
    post_id = await _create_blog_post(client, admin_headers, f"cross-{uuid.uuid4().hex[:6]}")
    resp = await client.put(
        f"/api/v1/entities/blog_posts/{post_id}",
        headers=auth_headers,
        json={"title": "hijack"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_blog_posts_operator_happy_path(client: AsyncClient, auth_headers: dict):
    title = f"bp-{uuid.uuid4().hex[:6]}"
    create_resp = await client.post(
        "/api/v1/entities/blog_posts",
        headers=auth_headers,
        json={"title": title},
    )
    assert create_resp.status_code == 201, create_resp.text
    assert create_resp.json()["workspace_id"] == int(auth_headers["X-Workspace-Id"])


@pytest.mark.asyncio
async def test_report_items_member_forbidden_create(client: AsyncClient, member_headers: dict):
    resp = await client.post(
        "/api/v1/entities/report_items",
        headers=member_headers,
        json={"name": "nope"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_report_items_cross_workspace_rejected(client: AsyncClient, auth_headers: dict, admin_headers: dict):
    item_id = await _create_report_item(client, admin_headers, f"cross-{uuid.uuid4().hex[:6]}")
    resp = await client.delete(f"/api/v1/entities/report_items/{item_id}", headers=auth_headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_report_items_operator_happy_path(client: AsyncClient, auth_headers: dict):
    name = f"ri-{uuid.uuid4().hex[:6]}"
    create_resp = await client.post(
        "/api/v1/entities/report_items",
        headers=auth_headers,
        json={"name": name, "status": "ready"},
    )
    assert create_resp.status_code == 201, create_resp.text
    assert create_resp.json()["workspace_id"] == int(auth_headers["X-Workspace-Id"])


@pytest.mark.asyncio
async def test_segment_results_member_forbidden_create(client: AsyncClient, member_headers: dict):
    resp = await client.post(
        "/api/v1/entities/segment_results",
        headers=member_headers,
        json={"top_segment": "A"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_segment_results_cross_workspace_rejected(client: AsyncClient, auth_headers: dict, admin_headers: dict):
    row_id = await _create_segment_result(client, admin_headers, "cross")
    resp = await client.put(
        f"/api/v1/entities/segment_results/{row_id}",
        headers=auth_headers,
        json={"top_segment": "hijack"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_segment_results_operator_happy_path(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post(
        "/api/v1/entities/segment_results",
        headers=auth_headers,
        json={"top_segment": "A", "total_contacts": 42},
    )
    assert create_resp.status_code == 201, create_resp.text
    assert create_resp.json()["workspace_id"] == int(auth_headers["X-Workspace-Id"])
