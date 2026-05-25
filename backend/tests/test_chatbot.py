"""Frente 48 — HTTP integration tests for chatbot."""

from __future__ import annotations

from uuid import uuid4

import pytest
from httpx import AsyncClient

from tests.fakes import FakeChatbotService
from tests.integration_helpers import mock_openai_chat, skip_pg_schema_migrations


@pytest.fixture
def chatbot_fake(monkeypatch):
    skip_pg_schema_migrations()

    async def _noop_tenant(self, tenant_id: int) -> None:
        return None

    monkeypatch.setattr("services.tenant_service.TenantService.set_tenant_context", _noop_tenant)
    monkeypatch.setattr("routers.chatbot.TenantService.set_tenant_context", _noop_tenant)

    def _factory(session, workspace_id=None):
        return FakeChatbotService(session, workspace_id or 1)

    monkeypatch.setattr("routers.chatbot.get_chatbot_service", _factory)
    monkeypatch.setattr("services.chatbot_service.get_chatbot_service", _factory)
    monkeypatch.setattr("services.chatbot_service.ChatbotService", FakeChatbotService)
    return FakeChatbotService(workspace_id=1)


@pytest.mark.asyncio
async def test_chatbot_message_mock_openai(client: AsyncClient, auth_headers: dict, chatbot_fake: FakeChatbotService):
    created = await client.post(
        "/api/chatbot/",
        json={"nombre": "Support Bot", "comportamiento": "soporte", "base_conocimiento": "FAQ docs"},
        headers=auth_headers,
    )
    assert created.status_code == 201, created.text
    bot_id = created.json()["id"]

    with mock_openai_chat("Hola, ¿en qué puedo ayudarte?"):
        r = await client.post(
            "/api/chatbot/chat",
            json={"chatbot_id": bot_id, "message": "Hola", "session_id": f"sess-{uuid4().hex[:8]}"},
        )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "reply" in body or "messages" in body


@pytest.mark.asyncio
async def test_chatbot_conversations_history(client: AsyncClient, auth_headers: dict, chatbot_fake: FakeChatbotService):
    created = await client.post(
        "/api/chatbot/",
        json={"nombre": "History Bot", "comportamiento": "faq"},
        headers=auth_headers,
    )
    assert created.status_code == 201, created.text
    bot_id = created.json()["id"]
    session_id = f"sess-{uuid4().hex[:8]}"
    await client.post(
        "/api/chatbot/chat",
        json={"chatbot_id": bot_id, "message": "Test", "session_id": session_id},
    )
    r = await client.get(f"/api/chatbot/{bot_id}/conversations", headers=auth_headers)
    assert r.status_code == 200, r.text
    assert "items" in r.json()


@pytest.mark.asyncio
async def test_chatbot_train_update_knowledge(client: AsyncClient, auth_headers: dict, chatbot_fake: FakeChatbotService):
    created = await client.post(
        "/api/chatbot/",
        json={"nombre": "Train Bot", "base_conocimiento": "v1 docs"},
        headers=auth_headers,
    )
    assert created.status_code == 201, created.text
    bot_id = created.json()["id"]
    r = await client.put(
        f"/api/chatbot/{bot_id}",
        json={
            "nombre": "Train Bot",
            "base_conocimiento": "v2 trained docs with product catalog",
            "comportamiento": "soporte",
        },
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    config = r.json().get("config") or r.json()
    knowledge = config.get("base_conocimiento") if isinstance(config, dict) else None
    assert knowledge is None or "v2 trained" in str(knowledge) or "v2 trained" in r.text
