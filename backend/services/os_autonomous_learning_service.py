"""Phase O — internal Learning Engine dashboard payload (read-only, workspace-scoped)."""
from __future__ import annotations

import json
import os
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from services.autonomous_portal_learning_service import learning_db_enabled

_AUTONOMOUS_ROOT = Path(__file__).resolve().parent.parent / "autonomous"
_LEARNING_OUTPUT = _AUTONOMOUS_ROOT / "output" / "learning"
_RANKINGS_PATH = _LEARNING_OUTPUT / "rankings.json"
_ENRICHED_PATH = _LEARNING_OUTPUT / "enrichedOutcomes.json"
_REPORT_PATH = _LEARNING_OUTPUT / "learningReport.json"
_ALERTS_PATH = _LEARNING_OUTPUT / "learningAlerts.json"
_REFRESH_STATUS_PATH = _LEARNING_OUTPUT / "refreshStatus.json"
_EXPORTS_DIR = _LEARNING_OUTPUT / "exports"
_LOCAL_OUTCOMES_PATH = _LEARNING_OUTPUT / "local-outcomes.json"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _parse_dt(raw: str | None) -> datetime | None:
    if not raw:
        return None
    try:
        t = raw.strip()
        if t.endswith("Z"):
            t = t[:-1] + "+00:00"
        dt = datetime.fromisoformat(t)
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except (ValueError, TypeError):
        return None


def _read_json(path: Path) -> Any:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None


def ga4_dashboard_status() -> Dict[str, Any]:
    """Public-safe GA4 flags — never expose credentials or property id."""
    flag = os.getenv("ENABLE_AUTONOMOUS_GA4", "false").strip().lower() in ("true", "1", "yes", "on")
    property_set = bool(os.getenv("GA4_PROPERTY_ID", "").strip())
    creds_set = bool(os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "").strip())
    mock = os.getenv("AUTONOMOUS_GA4_MOCK", "").strip().lower() == "realistic"

    if flag and property_set and creds_set:
        mode = "real"
        message = "GA4 read-only activo (staging). Ejecuta autonomous:enrich-outcomes para refrescar métricas."
    elif mock:
        mode = "mock"
        message = "GA4 mock realista (AUTONOMOUS_GA4_MOCK=realistic). Sin API externa."
    elif property_set and not flag:
        message = "GA4_PROPERTY_ID definido pero ENABLE_AUTONOMOUS_GA4=false — métricas null."
        mode = "none"
    else:
        mode = "none"
        message = "Sin GA4 configurado. conversion_rate y lead_count pueden estar vacíos."

    return {
        "mode": mode,
        "real_enabled": flag and property_set and creds_set,
        "mock_realistic": mock,
        "property_configured": property_set,
        "credentials_configured": creds_set,
        "message": message,
    }


def _aggregate_outcome_rows(rows: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    by_template: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for row in rows:
        tid = str(row.get("template_id") or "").strip()
        if tid:
            by_template[tid].append(row)

    agg: Dict[str, Dict[str, Any]] = {}
    for tid, items in by_template.items():
        n = len(items)
        qa = [float(x.get("qa_score") or 0) for x in items]
        approved = sum(1 for x in items if x.get("approved_by_client") is True)
        revisions = [int(x.get("revisions_count") or 0) for x in items]
        with_cr = [float(x["conversion_rate"]) for x in items if x.get("conversion_rate") is not None]
        leads = sum(int(x.get("lead_count") or 0) for x in items)
        agg[tid] = {
            "sample_size": n,
            "qa_score_avg": round(sum(qa) / n, 2) if n else 0,
            "approved_by_client_rate": round(approved / n, 3) if n else 0,
            "revisions_avg": round(sum(revisions) / n, 2) if n else 0,
            "conversion_rate_avg": round(sum(with_cr) / len(with_cr), 2) if with_cr else None,
            "lead_count_total": leads,
        }
    return agg


def _build_trend_30d(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    cutoff = _utcnow() - timedelta(days=30)
    buckets: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

    for row in rows:
        dt = _parse_dt(str(row.get("created_at") or ""))
        if not dt or dt < cutoff:
            continue
        key = dt.date().isoformat()
        buckets[key].append(row)

    trend: List[Dict[str, Any]] = []
    for day in sorted(buckets.keys()):
        items = buckets[day]
        with_cr = [float(x["conversion_rate"]) for x in items if x.get("conversion_rate") is not None]
        trend.append(
            {
                "date": day,
                "outcomes_count": len(items),
                "conversion_rate_avg": round(sum(with_cr) / len(with_cr), 2) if with_cr else None,
                "lead_count_total": sum(int(x.get("lead_count") or 0) for x in items),
            }
        )
    return trend


def _rankings_to_templates(rankings_raw: Any, outcome_agg: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not isinstance(rankings_raw, dict):
        return []

    slices = rankings_raw.get("slices") or []
    computed_at = rankings_raw.get("computed_at")
    items: List[Dict[str, Any]] = []

    for sl in slices:
        if not isinstance(sl, dict):
            continue
        slice_info = sl.get("slice") or {}
        ranked = sl.get("ranked") or []
        for rank_pos, entry in enumerate(ranked):
            if not isinstance(entry, dict):
                continue
            tid = str(entry.get("template_id") or "")
            metrics = entry.get("metrics") or {}
            oa = outcome_agg.get(tid, {})
            items.append(
                {
                    "template_id": tid,
                    "sector": str(slice_info.get("sector") or "general"),
                    "service": str(slice_info.get("service") or ""),
                    "category": str(slice_info.get("category") or ""),
                    "rank_position": rank_pos + 1,
                    "final_template_score": float(entry.get("final_template_score") or 0),
                    "conversion_score": float(entry.get("conversion_score") or 0),
                    "quality_score": float(entry.get("quality_score") or 0),
                    "sample_size": int(entry.get("sample_size") or oa.get("sample_size") or 0),
                    "qa_score": float(metrics.get("qa_avg") or oa.get("qa_score_avg") or 0),
                    "conversion_rate": metrics.get("conversion_avg") if metrics.get("conversion_avg") is not None else oa.get("conversion_rate_avg"),
                    "lead_count": int(oa.get("lead_count_total") or 0),
                    "approved_by_client": bool(oa.get("approved_by_client_rate", 0) >= 0.5),
                    "approved_by_client_rate": float(oa.get("approved_by_client_rate") or metrics.get("approval_rate") or 0),
                    "revisions_count": float(oa.get("revisions_avg") or metrics.get("revisions_avg") or 0),
                    "cold_start": bool(entry.get("cold_start")),
                }
            )

    items.sort(key=lambda x: (-x["final_template_score"], -x["conversion_score"]))
    return items[:50]


def _group_rankings(items: List[Dict[str, Any]], key: str) -> List[Dict[str, Any]]:
    groups: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for item in items:
        k = str(item.get(key) or "general")
        groups[k].append(item)

    out: List[Dict[str, Any]] = []
    for name, group in sorted(groups.items()):
        top = max(group, key=lambda x: x["final_template_score"])
        row: Dict[str, Any] = {
            "templates_count": len(group),
            "top_template_id": top["template_id"],
            "top_final_score": top["final_template_score"],
            "avg_conversion_score": round(
                sum(x["conversion_score"] for x in group) / len(group),
                2,
            ),
            "templates": group[:5],
        }
        if key == "sector":
            row["sector"] = name
            row["service"] = None
        else:
            row["sector"] = None
            row["service"] = name
        out.append(row)
    out.sort(key=lambda x: -x["top_final_score"])
    return out


class OsAutonomousLearningService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _load_outcomes_db(self, workspace_id: int) -> List[Dict[str, Any]]:
        if not learning_db_enabled():
            return []
        try:
            result = await self.db.execute(
                text(
                    """
                    SELECT template_id, category, sector, service, qa_score, approved_by_client,
                           revisions_count, conversion_rate, lead_count, result_status, created_at
                    FROM template_outcomes
                    WHERE workspace_id = :ws OR workspace_id IS NULL
                    ORDER BY created_at DESC
                    LIMIT 500
                    """
                ),
                {"ws": workspace_id},
            )
            rows = result.mappings().all()
            return [dict(r) for r in rows]
        except Exception:
            return []

    def _load_outcomes_local(self) -> List[Dict[str, Any]]:
        raw = _read_json(_LOCAL_OUTCOMES_PATH)
        if not isinstance(raw, list):
            return []
        return [x for x in raw if isinstance(x, dict)]

    async def get_dashboard(self, workspace_id: int) -> Dict[str, Any]:
        db_rows = await self._load_outcomes_db(workspace_id)
        local_rows = self._load_outcomes_local()

        if db_rows:
            storage_mode = "db"
            outcome_rows = db_rows
        elif local_rows:
            storage_mode = "local"
            outcome_rows = local_rows
        else:
            storage_mode = "none"
            outcome_rows = []

        outcome_agg = _aggregate_outcome_rows(outcome_rows)
        rankings_raw = _read_json(_RANKINGS_PATH)
        report_raw = _read_json(_REPORT_PATH)
        enriched_raw = _read_json(_ENRICHED_PATH)

        top_templates = _rankings_to_templates(rankings_raw, outcome_agg)
        if not top_templates and outcome_rows:
            for tid, oa in outcome_agg.items():
                sample = next((r for r in outcome_rows if r.get("template_id") == tid), {})
                top_templates.append(
                    {
                        "template_id": tid,
                        "sector": str(sample.get("sector") or "general"),
                        "service": str(sample.get("service") or ""),
                        "category": str(sample.get("category") or ""),
                        "rank_position": 1,
                        "final_template_score": 50.0,
                        "conversion_score": 50.0,
                        "quality_score": 50.0,
                        "sample_size": oa["sample_size"],
                        "qa_score": oa["qa_score_avg"],
                        "conversion_rate": oa["conversion_rate_avg"],
                        "lead_count": oa["lead_count_total"],
                        "approved_by_client": oa["approved_by_client_rate"] >= 0.5,
                        "approved_by_client_rate": oa["approved_by_client_rate"],
                        "revisions_count": oa["revisions_avg"],
                        "cold_start": oa["sample_size"] < 3,
                    }
                )
            top_templates.sort(key=lambda x: -x["sample_size"])

        computed_at = None
        if isinstance(rankings_raw, dict):
            computed_at = rankings_raw.get("computed_at")
        elif isinstance(report_raw, dict):
            computed_at = report_raw.get("computed_at")

        autonomy_pct = None
        if isinstance(report_raw, dict):
            ap = report_raw.get("autonomy_pct")
            if isinstance(ap, dict):
                autonomy_pct = ap.get("current")
        if autonomy_pct is None:
            autonomy_pct = 90

        enriched_count = 0
        if isinstance(enriched_raw, dict) and isinstance(enriched_raw.get("enriched"), list):
            enriched_count = len(enriched_raw["enriched"])

        alerts_raw = _read_json(_ALERTS_PATH)
        alerts: List[Dict[str, Any]] = []
        if isinstance(alerts_raw, dict) and isinstance(alerts_raw.get("alerts"), list):
            alerts = [a for a in alerts_raw["alerts"] if isinstance(a, dict)]

        refresh_status = _read_json(_REFRESH_STATUS_PATH)
        if not isinstance(refresh_status, dict):
            refresh_status = None

        export_files = {
            "rankings": _EXPORTS_DIR / "rankings.csv",
            "outcomes": _EXPORTS_DIR / "outcomes.csv",
            "sector_summary": _EXPORTS_DIR / "sector_summary.csv",
        }
        exports_available = {k: v.exists() for k, v in export_files.items()}

        if isinstance(report_raw, dict) and report_raw.get("phase") == "P":
            ap = report_raw.get("autonomy_pct")
            if isinstance(ap, dict) and ap.get("current") is not None:
                autonomy_pct = ap.get("current")

        return {
            "computed_at": computed_at,
            "storage_mode": storage_mode,
            "ga4": ga4_dashboard_status(),
            "outcomes_count": len(outcome_rows),
            "enriched_count": enriched_count,
            "autonomy_pct": autonomy_pct,
            "top_templates": top_templates[:20],
            "by_sector": _group_rankings(top_templates, "sector"),
            "by_service": _group_rankings(top_templates, "service"),
            "trend_30d": _build_trend_30d(outcome_rows),
            "has_rankings_file": _RANKINGS_PATH.exists(),
            "alerts": alerts[:50],
            "alerts_count": len(alerts),
            "refresh_status": refresh_status,
            "exports_available": exports_available,
        }

    def get_export_path(self, export_key: str) -> Optional[Path]:
        mapping = {
            "rankings": _EXPORTS_DIR / "rankings.csv",
            "outcomes": _EXPORTS_DIR / "outcomes.csv",
            "sector_summary": _EXPORTS_DIR / "sector_summary.csv",
        }
        path = mapping.get(export_key)
        if not path or not path.exists():
            return None
        return path
