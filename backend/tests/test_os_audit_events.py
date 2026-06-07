"""OS audit helper — security_events + structured logs."""
from unittest.mock import AsyncMock, patch

import pytest

from services.os_audit_service import record_os_event


@pytest.mark.asyncio
async def test_record_os_event_writes_security_event():
    db = AsyncMock()
    with patch("services.os_audit_service.write_audit_event", new_callable=AsyncMock) as mock_write:
        await record_os_event(
            db,
            category="upload",
            action="file_uploaded",
            resource_type="os_deliverable",
            resource_id="del-1",
            result="success",
            workspace_id=1,
            actor_user_id="user-1",
        )
    mock_write.assert_awaited_once()
    kwargs = mock_write.await_args.kwargs
    assert kwargs["source"] == "os"
    assert kwargs["event_type"] == "os.upload.file_uploaded"
    assert kwargs["workspace_id"] == 1
    assert kwargs["result"] == "success"


@pytest.mark.asyncio
async def test_record_os_event_survives_write_failure():
    db = AsyncMock()
    with patch(
        "services.os_audit_service.write_audit_event",
        new_callable=AsyncMock,
        side_effect=RuntimeError("db down"),
    ):
        await record_os_event(
            db,
            category="portal",
            action="login",
            resource_type="os_portal_user",
            resource_id="a@b.com",
            result="error",
        )
