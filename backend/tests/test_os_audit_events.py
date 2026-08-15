"""OS audit helper — security_events + structured logs."""
from unittest.mock import AsyncMock, patch

import pytest

from services.os_audit_service import record_os_event


@pytest.mark.asyncio
async def test_record_os_event_writes_security_event():
    db = AsyncMock()
    with patch("services.os_audit_service.write_audit_event_best_effort", new_callable=AsyncMock) as mock_write:
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
    # Se rompe la BASE, no el helper: asi corre la politica best-effort real
    # (captura de `AuditPersistError` + log ERROR) en vez de un mock que la
    # sustituye. Mockear el propio helper dejaba sin probar lo unico que aqui
    # importa: que un fallo de persistencia no propague.
    class _DbRota:
        async def execute(self, *_a, **_k):
            raise RuntimeError("db down")

        async def commit(self):
            raise RuntimeError("db down")

    db = _DbRota()
    await record_os_event(
        db,
        category="portal",
        action="login",
        resource_type="os_portal_user",
        resource_id="a@b.com",
        result="error",
    )
