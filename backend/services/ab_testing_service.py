"""A/B testing — experiments, variants, chi-square significance, GPT winner recommendation."""

from __future__ import annotations

import json
import logging
import math
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from openai import AsyncOpenAI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from services.tenant_service import TenantService

logger = logging.getLogger(__name__)

_SCHEMA_READY = False
METRIC_GOALS = frozenset({"conversion", "clicks", "revenue", "conversions", "ingresos"})
EVENT_TYPES = frozenset({"impression", "conversion", "click", "revenue"})


def _json_dumps(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, default=str)


def _row(row: Any) -> dict[str, Any]:
    if row is None:
        return {}
    data = dict(row._mapping)
    for k, v in list(data.items()):
        if isinstance(v, datetime):
            data[k] = v.isoformat()
        elif hasattr(v, "hex"):
            data[k] = str(v)
    return data


def _openai_client() -> AsyncOpenAI | None:
    key = os.environ.get("OPENAI_API_KEY", "").strip() or os.environ.get("APP_AI_KEY", "").strip()
    if not key:
        return None
    base = os.environ.get("OPENAI_BASE_URL", "").strip() or None
    return AsyncOpenAI(api_key=key, base_url=base)


def _chi2_p_value(chi2: float, df: int = 1) -> float:
    if chi2 <= 0:
        return 1.0
    if df == 1:
        return float(math.erfc(math.sqrt(chi2 / 2.0)))
    k = df / 2.0
    x = chi2 / 2.0
    term = (x ** k) * math.exp(-x) / math.gamma(k + 1.0)
    p = term
    for i in range(1, 50):
        term *= x / (k + i)
        p += term
        if term < 1e-12:
            break
    return max(0.0, min(1.0, 1.0 - p))


def _chi_square_independence(rows: list[tuple[int, int]]) -> tuple[float, float]:
    """rows: [(success, total), ...] per variant. Returns chi2, p-value."""
    if len(rows) < 2:
        return 0.0, 1.0
    total_success = sum(r[0] for r in rows)
    total_fail = sum(r[1] - r[0] for r in rows)
    grand = total_success + total_fail
    if grand == 0:
        return 0.0, 1.0
    chi2 = 0.0
    for success, n in rows:
        fail = n - success
        exp_success = n * total_success / grand if grand else 0
        exp_fail = n * total_fail / grand if grand else 0
        if exp_success > 0:
            chi2 += (success - exp_success) ** 2 / exp_success
        if exp_fail > 0:
            chi2 += (fail - exp_fail) ** 2 / exp_fail
    df = max(1, len(rows) - 1)
    return chi2, _chi2_p_value(chi2, df)


class AbTestingService:
    def __init__(self, session: AsyncSession, workspace_id: int | None = None):
        self.session = session
        self.workspace_id = int(workspace_id) if workspace_id is not None else None

    @classmethod
    async def ensure_schema(cls) -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        from core.database import db_manager

        sql_path = Path(__file__).resolve().parent.parent / "migrations" / "ab_testing.sql"
        if sql_path.is_file():
            async with db_manager.get_session() as session:
                await session.execute(text(sql_path.read_text(encoding="utf-8")))
                await session.commit()
        _SCHEMA_READY = True

    async def _set_tenant(self, workspace_id: int) -> None:
        await TenantService(self.session).set_tenant_context(workspace_id)

    async def create_experiment(
        self,
        workspace_id: int,
        name: str,
        hypothesis: str,
        variants: list[dict[str, Any]],
        metric_goal: str = "conversion",
        traffic_split: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        ws = int(workspace_id)
        await self._set_tenant(ws)
        if len(variants) < 2:
            raise ValueError("At least 2 variants required (control + variant)")
        mg = (metric_goal or "conversion").lower()
        if mg in ("conversions", "ingresos"):
            mg = "conversion" if mg == "conversions" else "revenue"
        split = traffic_split or {}
        if not split:
            pct = 100 // len(variants)
            split = {str(i): pct for i in range(len(variants))}

        exp_result = await self.session.execute(
            text(
                """
                INSERT INTO ab_experiments (workspace_id, name, hypothesis, metric_goal, traffic_split)
                VALUES (:ws, :name, :hypothesis, :metric, CAST(:split AS jsonb))
                RETURNING *
                """
            ),
            {
                "ws": ws,
                "name": name.strip(),
                "hypothesis": hypothesis or "",
                "metric": mg,
                "split": _json_dumps(split),
            },
        )
        exp = _row(exp_result.mappings().first())
        exp_id = exp["id"]
        created_variants: list[dict[str, Any]] = []
        has_control = any(v.get("is_control") for v in variants)
        for i, v in enumerate(variants):
            is_control = bool(v.get("is_control")) if has_control else i == 0
            vr = await self.session.execute(
                text(
                    """
                    INSERT INTO ab_variants (experiment_id, workspace_id, name, description, changes, is_control)
                    VALUES (CAST(:eid AS uuid), :ws, :name, :desc, CAST(:changes AS jsonb), :control)
                    RETURNING *
                    """
                ),
                {
                    "eid": exp_id,
                    "ws": ws,
                    "name": str(v.get("name", f"Variant {i + 1}")).strip(),
                    "desc": str(v.get("description", "")),
                    "changes": _json_dumps(v.get("changes") or {}),
                    "control": is_control,
                },
            )
            created_variants.append(_row(vr.mappings().first()))
        await self.session.commit()
        exp["variants"] = created_variants
        return exp

    async def get_experiment(self, experiment_id: str) -> dict[str, Any]:
        await self.ensure_schema()
        params: dict[str, Any] = {"id": experiment_id}
        where = "id = CAST(:id AS uuid)"
        if self.workspace_id is not None:
            await self._set_tenant(self.workspace_id)
            where += " AND workspace_id = :ws"
            params["ws"] = self.workspace_id
        result = await self.session.execute(text(f"SELECT * FROM ab_experiments WHERE {where}"), params)
        row = result.mappings().first()
        if not row:
            raise ValueError("Experiment not found")
        exp = _row(row)
        vr = await self.session.execute(
            text("SELECT * FROM ab_variants WHERE experiment_id = CAST(:id AS uuid) ORDER BY is_control DESC, name"),
            {"id": experiment_id},
        )
        exp["variants"] = [_row(r) for r in vr.mappings().all()]
        return exp

    async def list_experiments(self, workspace_id: int) -> list[dict[str, Any]]:
        await self.ensure_schema()
        ws = int(workspace_id)
        await self._set_tenant(ws)
        result = await self.session.execute(
            text(
                """
                SELECT e.*,
                    COUNT(DISTINCT v.id) AS variant_count,
                    COUNT(ev.id) FILTER (WHERE ev.event_type = 'impression') AS impressions,
                    COUNT(ev.id) FILTER (WHERE ev.event_type = 'conversion') AS conversions
                FROM ab_experiments e
                LEFT JOIN ab_variants v ON v.experiment_id = e.id
                LEFT JOIN ab_events ev ON ev.experiment_id = e.id
                WHERE e.workspace_id = :ws
                GROUP BY e.id
                ORDER BY e.created_at DESC
                """
            ),
            {"ws": ws},
        )
        items = []
        for r in result.mappings().all():
            item = _row(r)
            imp = int(item.get("impressions") or 0)
            conv = int(item.get("conversions") or 0)
            item["conversion_rate"] = round((conv / imp) * 100, 2) if imp else 0.0
            items.append(item)
        return items

    async def update_experiment(self, experiment_id: str, **fields: Any) -> dict[str, Any]:
        await self.ensure_schema()
        if self.workspace_id is None:
            raise ValueError("workspace_id required")
        await self._set_tenant(self.workspace_id)
        exp = await self.get_experiment(experiment_id)
        if exp.get("status") not in ("draft", "paused"):
            raise ValueError("Cannot update running or ended experiment")
        result = await self.session.execute(
            text(
                """
                UPDATE ab_experiments SET
                    name = :name, hypothesis = :hypothesis, metric_goal = :metric,
                    traffic_split = CAST(:split AS jsonb)
                WHERE id = CAST(:id AS uuid) AND workspace_id = :ws
                RETURNING *
                """
            ),
            {
                "id": experiment_id,
                "ws": self.workspace_id,
                "name": fields.get("name", exp["name"]),
                "hypothesis": fields.get("hypothesis", exp.get("hypothesis")),
                "metric": fields.get("metric_goal", exp.get("metric_goal")),
                "split": _json_dumps(fields.get("traffic_split", exp.get("traffic_split") or {})),
            },
        )
        await self.session.commit()
        return await self.get_experiment(experiment_id)

    async def delete_experiment(self, experiment_id: str) -> bool:
        await self.ensure_schema()
        if self.workspace_id is None:
            raise ValueError("workspace_id required")
        await self._set_tenant(self.workspace_id)
        result = await self.session.execute(
            text("DELETE FROM ab_experiments WHERE id = CAST(:id AS uuid) AND workspace_id = :ws RETURNING id"),
            {"id": experiment_id, "ws": self.workspace_id},
        )
        ok = result.mappings().first() is not None
        await self.session.commit()
        return ok

    async def start_experiment(self, experiment_id: str) -> dict[str, Any]:
        return await self._set_status(experiment_id, "running", started=True)

    async def pause_experiment(self, experiment_id: str) -> dict[str, Any]:
        return await self._set_status(experiment_id, "paused")

    async def end_experiment(self, experiment_id: str) -> dict[str, Any]:
        return await self._set_status(experiment_id, "ended", ended=True)

    async def _set_status(
        self,
        experiment_id: str,
        status: str,
        *,
        started: bool = False,
        ended: bool = False,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        if self.workspace_id is None:
            raise ValueError("workspace_id required")
        await self._set_tenant(self.workspace_id)
        now = datetime.now(timezone.utc)
        sets = ["status = :status"]
        params: dict[str, Any] = {"id": experiment_id, "ws": self.workspace_id, "status": status}
        if started:
            sets.append("started_at = :now")
            params["now"] = now
        if ended:
            sets.append("ended_at = :now")
            params["now"] = now
        await self.session.execute(
            text(
                f"""
                UPDATE ab_experiments SET {", ".join(sets)}
                WHERE id = CAST(:id AS uuid) AND workspace_id = :ws
                """
            ),
            params,
        )
        await self.session.commit()
        return await self.get_experiment(experiment_id)

    async def track_event(
        self,
        experiment_id: str,
        variant_id: str,
        session_id: str,
        event_type: str,
        value: float = 0,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        et = (event_type or "impression").lower()
        if et not in EVENT_TYPES:
            raise ValueError(f"event_type must be one of: {', '.join(sorted(EVENT_TYPES))}")
        exp = await self.session.execute(
            text("SELECT * FROM ab_experiments WHERE id = CAST(:id AS uuid) AND status = 'running'"),
            {"id": experiment_id},
        )
        exp_row = exp.mappings().first()
        if not exp_row:
            raise ValueError("Experiment not running")
        ws = int(exp_row["workspace_id"])
        await self._set_tenant(ws)
        result = await self.session.execute(
            text(
                """
                INSERT INTO ab_events (experiment_id, variant_id, workspace_id, session_id, event_type, value)
                VALUES (
                    CAST(:eid AS uuid), CAST(:vid AS uuid), :ws, :sid, :etype, :val
                )
                RETURNING *
                """
            ),
            {
                "eid": experiment_id,
                "vid": variant_id,
                "ws": ws,
                "sid": session_id or "anonymous",
                "etype": et,
                "val": float(value or 0),
            },
        )
        row = _row(result.mappings().first())
        await self.session.commit()
        return row

    async def get_results(self, experiment_id: str) -> dict[str, Any]:
        await self.ensure_schema()
        exp = await self.get_experiment(experiment_id)
        variant_stats: list[dict[str, Any]] = []
        chi_rows: list[tuple[int, int]] = []
        for v in exp.get("variants") or []:
            vid = str(v["id"])
            stats = await self.session.execute(
                text(
                    """
                    SELECT
                        COUNT(*) FILTER (WHERE event_type = 'impression') AS impressions,
                        COUNT(*) FILTER (WHERE event_type = 'conversion') AS conversions,
                        COUNT(*) FILTER (WHERE event_type = 'click') AS clicks,
                        COALESCE(SUM(value) FILTER (WHERE event_type = 'revenue'), 0) AS revenue
                    FROM ab_events
                    WHERE variant_id = CAST(:vid AS uuid)
                    """
                ),
                {"vid": vid},
            )
            s = stats.mappings().first()
            imp = int(s["impressions"] or 0)
            conv = int(s["conversions"] or 0)
            clicks = int(s["clicks"] or 0)
            revenue = float(s["revenue"] or 0)
            rate = round((conv / imp) * 100, 2) if imp else 0.0
            variant_stats.append(
                {
                    "variant_id": vid,
                    "name": v.get("name"),
                    "is_control": v.get("is_control"),
                    "impressions": imp,
                    "conversions": conv,
                    "clicks": clicks,
                    "conversion_rate": rate,
                    "revenue": revenue,
                }
            )
            chi_rows.append((conv, max(imp, 1)))

        chi2, p_value = _chi_square_independence(chi_rows)
        confidence = round((1 - p_value) * 100, 1)
        significant = p_value < 0.05

        daily = await self.session.execute(
            text(
                """
                SELECT
                    DATE(created_at AT TIME ZONE 'UTC') AS day,
                    variant_id,
                    COUNT(*) FILTER (WHERE event_type = 'conversion') AS conversions,
                    COUNT(*) FILTER (WHERE event_type = 'impression') AS impressions
                FROM ab_events
                WHERE experiment_id = CAST(:eid AS uuid)
                GROUP BY DATE(created_at AT TIME ZONE 'UTC'), variant_id
                ORDER BY day ASC
                """
            ),
            {"eid": experiment_id},
        )
        by_day: dict[str, dict[str, Any]] = {}
        for r in daily.mappings().all():
            day = str(r["day"])
            vid = str(r["variant_id"])
            if day not in by_day:
                by_day[day] = {"day": day, "variants": {}}
            imp_d = int(r["impressions"] or 0)
            conv_d = int(r["conversions"] or 0)
            by_day[day]["variants"][vid] = {
                "conversions": conv_d,
                "conversion_rate": round((conv_d / imp_d) * 100, 2) if imp_d else 0,
            }

        return {
            "experiment_id": experiment_id,
            "status": exp.get("status"),
            "metric_goal": exp.get("metric_goal"),
            "winner_variant_id": exp.get("winner_variant_id"),
            "variants": variant_stats,
            "chi_square": round(chi2, 4),
            "p_value": round(p_value, 4),
            "statistically_significant": significant,
            "confidence_percent": confidence,
            "conversion_by_day": list(by_day.values()),
            "ai_recommendation": exp.get("ai_recommendation"),
        }

    async def declare_winner(self, experiment_id: str, variant_id: str) -> dict[str, Any]:
        await self.ensure_schema()
        if self.workspace_id is None:
            raise ValueError("workspace_id required")
        await self._set_tenant(self.workspace_id)
        results = await self.get_results(experiment_id)
        exp = await self.get_experiment(experiment_id)
        winner = next((v for v in results["variants"] if v["variant_id"] == variant_id), None)
        recommendation = await self._ai_recommendation(exp, results, winner)
        await self.session.execute(
            text(
                """
                UPDATE ab_experiments SET
                    winner_variant_id = CAST(:vid AS uuid),
                    ai_recommendation = :rec,
                    status = 'ended',
                    ended_at = NOW()
                WHERE id = CAST(:id AS uuid) AND workspace_id = :ws
                """
            ),
            {
                "id": experiment_id,
                "ws": self.workspace_id,
                "vid": variant_id,
                "rec": recommendation,
            },
        )
        await self.session.commit()
        results = await self.get_results(experiment_id)
        results["ai_recommendation"] = recommendation
        results["winner_variant_id"] = variant_id
        return results

    async def _ai_recommendation(
        self,
        exp: dict[str, Any],
        results: dict[str, Any],
        winner: dict[str, Any] | None,
    ) -> str:
        client = _openai_client()
        if not client:
            name = winner.get("name") if winner else "variant"
            return (
                f"Se declara ganadora la variante «{name}» con tasa de conversión "
                f"{winner.get('conversion_rate', 0) if winner else 0}%. "
                "Implementa los cambios de la variante ganadora en producción."
            )
        try:
            resp = await client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": "Eres analista CRO. Resume el experimento A/B y da recomendaciones accionables en español (máx 3 párrafos).",
                    },
                    {
                        "role": "user",
                        "content": _json_dumps(
                            {
                                "experiment": exp.get("name"),
                                "hypothesis": exp.get("hypothesis"),
                                "results": results.get("variants"),
                                "significant": results.get("statistically_significant"),
                                "winner": winner,
                            }
                        ),
                    },
                ],
                temperature=0.4,
                max_tokens=400,
            )
            return (resp.choices[0].message.content or "").strip()
        except Exception as exc:
            logger.warning("AB AI recommendation failed: %s", exc)
            return "Variante ganadora declarada. Revisa los resultados e implementa los cambios en producción."


def get_ab_testing_service(session: AsyncSession, workspace_id: int | None = None) -> AbTestingService:
    return AbTestingService(session, workspace_id)
