"""Shared helpers for Frente 48 HTTP integration tests."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import httpx


def skip_pg_schema_migrations() -> None:
    """Mark module schemas as ready so PG migration SQL is not executed on SQLite."""
    import services.chatbot_service as chatbot_mod
    import services.forms_service as forms_mod
    import services.landing_builder_service as landing_mod
    import services.webinar_service as webinar_mod

    chatbot_mod._SCHEMA_READY = True
    forms_mod._SCHEMA_READY = True
    landing_mod._SCHEMA_READY = True
    webinar_mod._SCHEMA_READY = True


def mock_platform_token_verify(
    *,
    user_id: str = "new-user-00000000-0000-0000-0000-000000000099",
    email: str = "newuser@nelvyon-test.com",
    name: str = "New User",
) -> Any:
    """Patch httpx.AsyncClient to simulate OIDC platform token verification."""

    class _FakeResponse:
        status_code = 200

        @staticmethod
        def json() -> dict[str, Any]:
            return {
                "success": True,
                "data": {"user_id": user_id, "email": email, "name": name},
            }

    fake_client = MagicMock()
    fake_client.__aenter__ = AsyncMock(return_value=fake_client)
    fake_client.__aexit__ = AsyncMock(return_value=None)
    fake_client.post = AsyncMock(return_value=_FakeResponse())
    return patch("routers.auth.httpx.AsyncClient", return_value=fake_client)


def mock_openai_chat(reply: str = "Mocked AI response") -> Any:
    """Patch OpenAI chat completions used by chatbot / landing / store."""

    class _Choice:
        message = MagicMock(content=reply)

    class _Completion:
        choices = [_Choice()]

    mock_client = MagicMock()
    mock_client.chat = MagicMock()
    mock_client.chat.completions = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=_Completion())
    return patch(
        "services.chatbot_service._openai_client",
        return_value=mock_client,
    )


def mock_ses_send() -> Any:
    """Patch SES email send for campaign tests."""
    mock_ses = MagicMock()
    mock_ses.send_email = AsyncMock(return_value={"MessageId": "mock-ses-id"})
    return patch("services.email_service.get_ses_service", return_value=mock_ses)
