"""Phase M — portal approve/reject → template_outcomes (isolated, never breaks portal)."""
from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

_AUTONOMOUS_ROOT = Path(__file__).resolve().parent.parent / "autonomous"
_LOCAL_OUTCOMES_PATH = _AUTONOMOUS_ROOT / "output" / "learning" / "local-outcomes.json"

_SKU_CONTEXT: Dict[str, Dict[str, str]] = {
    "landing": {"category": "landing", "service": "landing"},
    "NELVYON-LANDING": {"category": "landing", "service": "landing"},
    "chatbot": {"category": "chatbot", "service": "chatbot"},
    "NELVYON-CHATBOT": {"category": "chatbot", "service": "chatbot"},
    "seo": {"category": "landing", "service": "landing"},
    "NELVYON-SEO": {"category": "landing", "service": "landing"},
}


def learning_db_enabled() -> bool:
    flag = os.getenv("ENABLE_TEMPLATE_LEARNING_DB", "false").strip().lower()
    db_url = os.getenv("DATABASE_URL", "").strip()
    return flag in ("true", "1", "yes", "on") and bool(db_url)


def _has_autonomous_provenance(metadata: Any) -> bool:
    return isinstance(metadata, dict) and metadata.get("autonomous_provenance") is True


def _resolve_template_id(metadata: Dict[str, Any]) -> Optional[str]:
    raw = metadata.get("template_id")
    if isinstance(raw, str) and raw.strip():
        return raw.strip()
    artifacts = metadata.get("artifacts") if isinstance(metadata.get("artifacts"), dict) else {}
    plan = artifacts.get("plan") if isinstance(artifacts.get("plan"), dict) else {}
    tpl = plan.get("template_id")
    if isinstance(tpl, str) and tpl.strip():
        return tpl.strip()
    pipeline = (
        artifacts.get("template_pipeline")
        if isinstance(artifacts.get("template_pipeline"), dict)
        else {}
    )
    selected = pipeline.get("selected_template_id")
    if isinstance(selected, str) and selected.strip():
        return selected.strip()
    return None


def _sku_context(sku: Optional[str]) -> Dict[str, str]:
    key = (sku or "landing").strip()
    return _SKU_CONTEXT.get(key, _SKU_CONTEXT["landing"])


def _count_revisions(metadata: Dict[str, Any]) -> int:
    history = metadata.get("client_review_history")
    if not isinstance(history, list):
        return 0
    return sum(1 for h in history if isinstance(h, dict) and h.get("decision") == "reject")


def _conversion_placeholder() -> Dict[str, Any]:
    property_id = os.getenv("GA4_PROPERTY_ID", "").strip()
    return {
        "conversion_rate": None,
        "lead_count": None,
        "source": "ga4" if property_id else "none",
    }


def _build_outcome_payload(
    *,
    deliverable_id: str,
    workspace_id: int,
    metadata: Dict[str, Any],
    decision: str,
) -> Optional[Dict[str, Any]]:
    if not _has_autonomous_provenance(metadata):
        return None

    template_id = _resolve_template_id(metadata)
    if not template_id:
        logger.info(
            "Portal learning skipped deliverable=%s: autonomous but no template_id",
            deliverable_id,
        )
        return None

    ctx = _sku_context(metadata.get("sku") if isinstance(metadata.get("sku"), str) else None)
    sector = str(metadata.get("sector") or "general")
    revisions = _count_revisions(metadata)
    conversion = _conversion_placeholder()
    approved = decision == "approve"

    qa_score = metadata.get("qa_score")
    qa_val: Optional[float] = None
    if isinstance(qa_score, (int, float)):
        qa_val = float(qa_score)

    return {
        "id": str(uuid.uuid4()),
        "workspace_id": workspace_id,
        "template_id": template_id,
        "category": ctx["category"],
        "sector": sector,
        "service": ctx["service"],
        "objective": "lead_gen",
        "channel": "web",
        "language": "es",
        "level": "professional",
        "qa_score": qa_val,
        "approved_by_client": approved,
        "revisions_count": revisions if approved else max(revisions, 1),
        "conversion_rate": conversion["conversion_rate"],
        "lead_count": conversion["lead_count"],
        "client_rating": None,
        "delivery_time_hours": None,
        "result_status": "client_approved" if approved else "client_rejected",
        "notes": f"Portal {decision} — Phase M learning loop",
        "metadata": {
            "project_ref": metadata.get("autonomous_project_id") or deliverable_id,
            "deliverable_id": deliverable_id,
            "autonomous_job_id": metadata.get("autonomous_job_id"),
            "portal_decision": decision,
            "conversion_source": conversion["source"],
            "phase": "M",
        },
    }


async def _insert_db(db: AsyncSession, payload: Dict[str, Any]) -> None:
    await db.execute(
        text(
            """
            INSERT INTO template_outcomes (
              id, workspace_id, template_id, category, sector, service, objective, channel, language, level,
              qa_score, approved_by_client, revisions_count, conversion_rate, lead_count, client_rating,
              delivery_time_hours, result_status, notes, metadata, created_at
            ) VALUES (
              :id, :workspace_id, :template_id, :category, :sector, :service, :objective, :channel, :language, :level,
              :qa_score, :approved_by_client, :revisions_count, :conversion_rate, :lead_count, :client_rating,
              :delivery_time_hours, :result_status, :notes, :metadata::jsonb, NOW()
            )
            """
        ),
        {
            **payload,
            "metadata": json.dumps(payload["metadata"]),
        },
    )
    await db.commit()


def _append_local(payload: Dict[str, Any]) -> None:
    _LOCAL_OUTCOMES_PATH.parent.mkdir(parents=True, exist_ok=True)
    rows: list = []
    if _LOCAL_OUTCOMES_PATH.exists():
        try:
            raw = json.loads(_LOCAL_OUTCOMES_PATH.read_text(encoding="utf-8"))
            if isinstance(raw, list):
                rows = raw
        except (json.JSONDecodeError, OSError):
            rows = []

    now = datetime.now(timezone.utc).isoformat()
    rows.append(
        {
            "id": payload["id"],
            "project_ref": payload["metadata"].get("project_ref") or payload["id"],
            "template_id": payload["template_id"],
            "category": payload["category"],
            "sector": payload["sector"],
            "service": payload["service"],
            "objective": payload["objective"],
            "channel": payload["channel"],
            "language": payload["language"],
            "level": payload["level"],
            "qa_score": payload["qa_score"] or 0,
            "approved_by_client": payload["approved_by_client"],
            "revisions_count": payload["revisions_count"],
            "conversion_rate": payload["conversion_rate"],
            "lead_count": payload["lead_count"] or 0,
            "client_rating": payload["client_rating"],
            "delivery_time_hours": payload["delivery_time_hours"] or 0,
            "result_status": payload["result_status"],
            "notes": payload["notes"],
            "created_at": now,
        }
    )
    _LOCAL_OUTCOMES_PATH.write_text(json.dumps(rows, indent=2), encoding="utf-8")


async def maybe_record_portal_outcome(
    db: AsyncSession,
    *,
    deliverable_id: str,
    workspace_id: int,
    deliverable_metadata: Any,
    decision: str,
) -> None:
    """Side-effect only — never raises; portal flow unchanged if this fails."""
    try:
        meta = dict(deliverable_metadata) if isinstance(deliverable_metadata, dict) else {}
        payload = _build_outcome_payload(
            deliverable_id=deliverable_id,
            workspace_id=workspace_id,
            metadata=meta,
            decision=decision,
        )
        if not payload:
            return

        if learning_db_enabled():
            try:
                await _insert_db(db, payload)
                logger.info(
                    "Portal learning outcome recorded (db) deliverable=%s decision=%s template=%s",
                    deliverable_id,
                    decision,
                    payload["template_id"],
                )
                return
            except Exception as exc:
                logger.warning("Portal learning DB insert failed, falling back local: %s", exc)

        _append_local(payload)
        logger.info(
            "Portal learning outcome recorded (local) deliverable=%s decision=%s template=%s",
            deliverable_id,
            decision,
            payload["template_id"],
        )
    except Exception as exc:
        logger.warning("Portal learning outcome skipped deliverable=%s: %s", deliverable_id, exc)
