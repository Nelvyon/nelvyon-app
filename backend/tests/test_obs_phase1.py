"""
OBS-1 FASE 1 — healthcheck ampliado y logs estructurados (JSON en mensaje).
"""
import json
import logging

import pytest
from httpx import AsyncClient

from core.structured_log import log_structured


@pytest.mark.asyncio
async def test_health_returns_200_with_expected_shape(client: AsyncClient):
    r = await client.get("/health")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "healthy"
    assert data.get("process") == "up"
    assert data.get("database") == "ok"
    assert data.get("version") == "2.0.0"
    assert "environment" in data


def test_structured_log_emits_json_line(caplog):
    caplog.set_level(logging.ERROR)
    lg = logging.getLogger("nelvyon.obs.phase1")
    log_structured(
        lg,
        logging.ERROR,
        "obs_phase1_selftest",
        "controlled failure",
        code=42,
    )
    assert len(caplog.records) == 1
    raw = caplog.records[0].getMessage()
    payload = json.loads(raw)
    assert payload["event"] == "obs_phase1_selftest"
    assert payload["message"] == "controlled failure"
    assert payload["code"] == 42
    assert "request_id" in payload
    assert "workspace_id" in payload
    assert "user_id" in payload
