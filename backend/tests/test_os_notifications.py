"""OS notification hooks — invite, publish, revision."""
import uuid
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from tests.test_os_deliverables_api import (
    CLIENTS_BASE,
    DELIVERABLES_BASE,
    PROJECTS_BASE,
    _create_deliverable,
    _create_os_client,
    _create_project,
)
from tests.test_portal_api import PORTAL_BASE, _portal_user_headers

PORTAL_INVITES = f"{PORTAL_BASE}/invites"


@pytest.fixture
def operator_headers():
    from core.auth import create_access_token

    token = create_access_token(
        {
            "sub": "operator-user-00000000-0000-0000-0000-000000000077",
            "email": "operator@test.com",
            "name": "Operator User",
            "role": "user",
        }
    )
    return {"Authorization": f"Bearer {token}", "X-Workspace-Id": "1"}


@pytest.fixture
async def seed_portal_operator(db_session):
    from sqlalchemy import text

    await db_session.execute(
        text(
            """
            INSERT OR IGNORE INTO users (id, email, name, role)
            VALUES ('operator-user-00000000-0000-0000-0000-000000000077', 'operator@test.com', 'Operator', 'user')
            """
        )
    )
    await db_session.execute(
        text(
            """
            INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, email, role, status)
            VALUES (1, 'operator-user-00000000-0000-0000-0000-000000000077', 'operator@test.com', 'operator', 'active')
            """
        )
    )
    await db_session.commit()


@pytest.mark.asyncio
async def test_list_portal_invites_for_client(
    client: AsyncClient,
    auth_headers: dict,
    operator_headers: dict,
    seed_portal_operator,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"Inv {suf}")
    email = f"inv_{suf}@test.com"
    created = await client.post(
        PORTAL_INVITES,
        headers=operator_headers,
        json={"client_id": os_client["id"], "email": email},
    )
    assert created.status_code == 201, created.text

    listed = await client.get(
        f"{PORTAL_INVITES}?client_id={os_client['id']}",
        headers=operator_headers,
    )
    assert listed.status_code == 200
    body = listed.json()
    assert body["total"] >= 1
    assert any(i["email"] == email and i["status"] == "pending" for i in body["items"])


@pytest.mark.asyncio
async def test_invite_triggers_notification_hook(
    client: AsyncClient,
    auth_headers: dict,
    operator_headers: dict,
    seed_portal_operator,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"Mail {suf}")
    with patch(
        "services.os_notification_service.notify_portal_invite_created",
        new_callable=AsyncMock,
    ) as mock_notify:
        r = await client.post(
            PORTAL_INVITES,
            headers=operator_headers,
            json={"client_id": os_client["id"], "email": f"mail_{suf}@test.com"},
        )
        assert r.status_code == 201
        mock_notify.assert_awaited_once()


@pytest.mark.asyncio
async def test_publish_triggers_notification_hook(
    client: AsyncClient,
    auth_headers: dict,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"Pub {suf}")
    project = await _create_project(client, auth_headers, client_id=os_client["id"], name=f"P {suf}")
    deliverable = await _create_deliverable(
        client,
        auth_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"Pub {suf}",
    )
    did = deliverable["id"]
    for step in ("submit-review", "deliver", "approve"):
        wr = await client.post(f"{DELIVERABLES_BASE}/{did}/{step}", headers=auth_headers)
        assert wr.status_code == 200, wr.text

    with patch(
        "services.os_notification_service.notify_deliverable_published",
        new_callable=AsyncMock,
    ) as mock_notify:
        pub = await client.post(f"{DELIVERABLES_BASE}/{did}/publish", headers=auth_headers)
        assert pub.status_code == 200
        mock_notify.assert_awaited_once()


@pytest.mark.asyncio
async def test_reject_triggers_revision_notification(
    client: AsyncClient,
    auth_headers: dict,
    operator_headers: dict,
    seed_portal_operator,
):
    from tests.test_portal_api import _create_and_publish_deliverable

    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"Rej {suf}")
    project = await _create_project(client, auth_headers, client_id=os_client["id"], name=f"RP {suf}")
    created = await _create_and_publish_deliverable(
        client,
        auth_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"RejDel {suf}",
    )
    portal_h = await _portal_user_headers(
        client,
        operator_headers,
        client_id=os_client["id"],
        email=f"rej_{suf}@test.com",
    )
    with patch(
        "services.os_notification_service.notify_deliverable_revision_requested",
        new_callable=AsyncMock,
    ) as mock_notify:
        rej = await client.post(
            f"{PORTAL_BASE}/deliverables/{created['id']}/reject",
            headers=portal_h,
            json={"feedback": "Please update section 2"},
        )
        assert rej.status_code == 200
        mock_notify.assert_awaited_once()
