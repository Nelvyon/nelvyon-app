"""Phase M — autonomous portal learning hook (isolated)."""
import json
import uuid
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest

from services.autonomous_portal_learning_service import (
    _build_outcome_payload,
    _has_autonomous_provenance,
    learning_db_enabled,
    maybe_record_portal_outcome,
)

_AUTONOMOUS_ROOT = Path(__file__).resolve().parent.parent / "autonomous"
_LOCAL_OUTCOMES = _AUTONOMOUS_ROOT / "output" / "learning" / "local-outcomes.json"


def _meta(**overrides):
    base = {
        "autonomous_provenance": True,
        "template_id": "landing-cro-v3",
        "sector": "restaurant",
        "sku": "landing",
        "qa_score": 90,
        "autonomous_project_id": "proj-py-1",
        "client_review_history": [],
    }
    base.update(overrides)
    return base


def test_has_autonomous_provenance():
    assert _has_autonomous_provenance(_meta()) is True
    assert _has_autonomous_provenance({"template_id": "x"}) is False
    assert _has_autonomous_provenance(None) is False


def test_build_outcome_approve():
    payload = _build_outcome_payload(
        deliverable_id="del-1",
        workspace_id=1,
        metadata=_meta(),
        decision="approve",
    )
    assert payload is not None
    assert payload["approved_by_client"] is True
    assert payload["result_status"] == "client_approved"
    assert payload["template_id"] == "landing-cro-v3"
    assert payload["conversion_rate"] is None
    assert payload["lead_count"] is None


def test_build_outcome_reject_increments_revisions():
    payload = _build_outcome_payload(
        deliverable_id="del-2",
        workspace_id=1,
        metadata=_meta(client_review_history=[{"decision": "reject"}]),
        decision="reject",
    )
    assert payload is not None
    assert payload["approved_by_client"] is False
    assert payload["revisions_count"] >= 1
    assert payload["result_status"] == "client_rejected"


def test_non_autonomous_returns_none():
    payload = _build_outcome_payload(
        deliverable_id="del-3",
        workspace_id=1,
        metadata={"template_id": "landing-cro-v3"},
        decision="approve",
    )
    assert payload is None


@pytest.mark.asyncio
async def test_maybe_record_portal_outcome_local_fallback(monkeypatch, tmp_path):
    monkeypatch.delenv("ENABLE_TEMPLATE_LEARNING_DB", raising=False)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    assert learning_db_enabled() is False

    local_path = tmp_path / "local-outcomes.json"
    monkeypatch.setattr(
        "services.autonomous_portal_learning_service._LOCAL_OUTCOMES_PATH",
        local_path,
    )

    db = AsyncMock()
    await maybe_record_portal_outcome(
        db,
        deliverable_id=str(uuid.uuid4()),
        workspace_id=1,
        deliverable_metadata=_meta(),
        decision="approve",
    )

    assert local_path.exists()
    rows = json.loads(local_path.read_text(encoding="utf-8"))
    assert len(rows) == 1
    assert rows[0]["approved_by_client"] is True
    assert rows[0]["template_id"] == "landing-cro-v3"


@pytest.mark.asyncio
async def test_maybe_record_portal_outcome_skips_manual_deliverable():
    db = MagicMock()
    await maybe_record_portal_outcome(
        db,
        deliverable_id="del-manual",
        workspace_id=1,
        deliverable_metadata={"sector": "restaurant"},
        decision="approve",
    )
    db.execute.assert_not_called()
