"""NELVYON CRM — contacts, deals pipeline, activities, scoring (Postgres/asyncpg)."""

from __future__ import annotations

import json
import logging
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import db_manager
from core.sentry_utils import capture_exception

logger = logging.getLogger(__name__)

PIPELINE_STAGES = (
    "lead",
    "qualified",
    "proposal",
    "negotiation",
    "closed_won",
    "closed_lost",
)

OPEN_STAGES = ("lead", "qualified", "proposal", "negotiation")

STAGE_DEFAULT_PROBABILITY = {
    "lead": 10,
    "qualified": 25,
    "proposal": 50,
    "negotiation": 75,
    "closed_won": 100,
    "closed_lost": 0,
}


def _json_dumps(value: Any) -> str:
    return json.dumps(value if value is not None else {}, ensure_ascii=False, default=str)


def _row_to_dict(row: Any) -> dict[str, Any]:
    if row is None:
        return {}
    data = dict(row._mapping)
    for key, val in list(data.items()):
        if isinstance(val, UUID):
            data[key] = str(val)
        elif isinstance(val, Decimal):
            data[key] = float(val)
        elif isinstance(val, (datetime, date)):
            data[key] = val.isoformat()
    return data


class CRMService:
    """Workspace-scoped CRM operations on crm_contacts / crm_deals / crm_activities."""

    def __init__(self, session: AsyncSession, workspace_id: int):
        if workspace_id is None:
            raise ValueError("workspace_id is required")
        self.session = session
        self.workspace_id = int(workspace_id)

    @staticmethod
    async def ensure_db() -> None:
        if not db_manager.async_session_maker:
            await db_manager.ensure_initialized()
        if not db_manager.async_session_maker:
            raise RuntimeError("Database not initialized")

    # ─── Contacts ───────────────────────────────────────────────────────────

    async def create_contact(
        self,
        *,
        name: str,
        email: str | None = None,
        phone: str | None = None,
        company: str | None = None,
        status: str = "active",
        tags: list | None = None,
        metadata: dict | None = None,
    ) -> dict[str, Any]:
        try:
            return await self._create_contact_impl(
                name=name,
                email=email,
                phone=phone,
                company=company,
                status=status,
                tags=tags,
                metadata=metadata,
            )
        except Exception as exc:
            capture_exception(exc, service="crm", method="create_contact")
            raise

    async def _create_contact_impl(
        self,
        *,
        name: str,
        email: str | None = None,
        phone: str | None = None,
        company: str | None = None,
        status: str = "active",
        tags: list | None = None,
        metadata: dict | None = None,
    ) -> dict[str, Any]:
        result = await self.session.execute(
            text(
                """
                INSERT INTO crm_contacts (
                    workspace_id, name, email, phone, company, status, tags, metadata
                )
                VALUES (
                    :workspace_id, :name, :email, :phone, :company, :status,
                    CAST(:tags AS jsonb), CAST(:metadata AS jsonb)
                )
                RETURNING *
                """
            ),
            {
                "workspace_id": self.workspace_id,
                "name": name.strip(),
                "email": (email or "").strip() or None,
                "phone": (phone or "").strip() or None,
                "company": (company or "").strip() or None,
                "status": (status or "active").strip(),
                "tags": _json_dumps(tags or []),
                "metadata": _json_dumps(metadata or {}),
            },
        )
        row = _row_to_dict(result.mappings().first())
        await self.recalculate_contact_score(row["id"])
        return await self.get_contact_by_id(row["id"])

    async def update_contact(self, contact_id: str, **fields: Any) -> dict[str, Any]:
        await self._assert_contact(contact_id)
        allowed = {"name", "email", "phone", "company", "status", "tags", "metadata", "score"}
        sets: list[str] = []
        params: dict[str, Any] = {"id": contact_id, "workspace_id": self.workspace_id}

        for key, val in fields.items():
            if key not in allowed or val is None:
                continue
            if key in ("tags", "metadata"):
                sets.append(f"{key} = CAST(:{key} AS jsonb)")
                params[key] = _json_dumps(val)
            else:
                sets.append(f"{key} = :{key}")
                params[key] = val.strip() if isinstance(val, str) else val

        if not sets:
            return await self.get_contact_by_id(contact_id)

        sets.append("updated_at = now()")
        await self.session.execute(
            text(f"UPDATE crm_contacts SET {', '.join(sets)} WHERE id = CAST(:id AS uuid) AND workspace_id = :workspace_id"),
            params,
        )
        return await self.get_contact_by_id(contact_id)

    async def delete_contact(self, contact_id: str) -> bool:
        await self._assert_contact(contact_id)
        result = await self.session.execute(
            text("DELETE FROM crm_contacts WHERE id = CAST(:id AS uuid) AND workspace_id = :workspace_id"),
            {"id": contact_id, "workspace_id": self.workspace_id},
        )
        return (result.rowcount or 0) > 0

    async def get_contact_by_id(self, contact_id: str) -> dict[str, Any]:
        result = await self.session.execute(
            text("SELECT * FROM crm_contacts WHERE id = CAST(:id AS uuid) AND workspace_id = :workspace_id"),
            {"id": contact_id, "workspace_id": self.workspace_id},
        )
        row = result.mappings().first()
        if not row:
            raise ValueError("Contact not found")
        return _row_to_dict(row)

    async def list_contacts(
        self,
        *,
        skip: int = 0,
        limit: int = 50,
        status: str | None = None,
    ) -> dict[str, Any]:
        params: dict[str, Any] = {
            "workspace_id": self.workspace_id,
            "skip": max(0, skip),
            "limit": min(max(1, limit), 200),
        }
        where = "workspace_id = :workspace_id"
        if status:
            where += " AND status = :status"
            params["status"] = status

        count = await self.session.execute(
            text(f"SELECT COUNT(*) FROM crm_contacts WHERE {where}"),
            params,
        )
        total = int(count.scalar_one())

        result = await self.session.execute(
            text(
                f"""
                SELECT * FROM crm_contacts
                WHERE {where}
                ORDER BY score DESC, created_at DESC
                OFFSET :skip LIMIT :limit
                """
            ),
            params,
        )
        items = [_row_to_dict(r) for r in result.mappings().all()]
        return {"total": total, "items": items, "skip": params["skip"], "limit": params["limit"]}

    async def search_contacts(self, query: str, *, limit: int = 25) -> list[dict[str, Any]]:
        q = f"%{query.strip()}%"
        result = await self.session.execute(
            text(
                """
                SELECT * FROM crm_contacts
                WHERE workspace_id = :workspace_id
                  AND (
                    name ILIKE :q OR email ILIKE :q OR phone ILIKE :q
                    OR company ILIKE :q OR status ILIKE :q
                  )
                ORDER BY score DESC, created_at DESC
                LIMIT :limit
                """
            ),
            {"workspace_id": self.workspace_id, "q": q, "limit": min(max(1, limit), 100)},
        )
        return [_row_to_dict(r) for r in result.mappings().all()]

    # ─── Deals ──────────────────────────────────────────────────────────────

    async def create_deal(
        self,
        *,
        contact_id: str,
        title: str,
        value: float = 0,
        currency: str = "EUR",
        stage: str = "lead",
        probability: int | None = None,
        close_date: date | None = None,
        notes: str | None = None,
    ) -> dict[str, Any]:
        try:
            return await self._create_deal_impl(
                contact_id=contact_id,
                title=title,
                value=value,
                currency=currency,
                stage=stage,
                probability=probability,
                close_date=close_date,
                notes=notes,
            )
        except Exception as exc:
            capture_exception(exc, service="crm", method="create_deal")
            raise

    async def _create_deal_impl(
        self,
        *,
        contact_id: str,
        title: str,
        value: float = 0,
        currency: str = "EUR",
        stage: str = "lead",
        probability: int | None = None,
        close_date: date | None = None,
        notes: str | None = None,
    ) -> dict[str, Any]:
        await self._assert_contact(contact_id)
        stage_norm = self._validate_stage(stage)
        prob = probability if probability is not None else STAGE_DEFAULT_PROBABILITY[stage_norm]

        result = await self.session.execute(
            text(
                """
                INSERT INTO crm_deals (
                    workspace_id, contact_id, title, value, currency, stage,
                    probability, close_date, notes
                )
                VALUES (
                    :workspace_id, CAST(:contact_id AS uuid), :title, :value, :currency,
                    :stage, :probability, :close_date, :notes
                )
                RETURNING *
                """
            ),
            {
                "workspace_id": self.workspace_id,
                "contact_id": contact_id,
                "title": title.strip(),
                "value": value,
                "currency": (currency or "EUR").strip().upper()[:8],
                "stage": stage_norm,
                "probability": max(0, min(100, int(prob))),
                "close_date": close_date,
                "notes": (notes or "").strip() or None,
            },
        )
        deal = _row_to_dict(result.mappings().first())
        await self.recalculate_contact_score(contact_id)
        return deal

    async def update_deal(self, deal_id: str, **fields: Any) -> dict[str, Any]:
        deal = await self.get_deal_by_id(deal_id)
        allowed = {"title", "value", "currency", "stage", "probability", "close_date", "notes", "contact_id"}
        sets: list[str] = []
        params: dict[str, Any] = {"id": deal_id, "workspace_id": self.workspace_id}

        for key, val in fields.items():
            if key not in allowed or val is None:
                continue
            if key == "stage":
                val = self._validate_stage(str(val))
                if "probability" not in fields:
                    sets.append("probability = :probability")
                    params["probability"] = STAGE_DEFAULT_PROBABILITY[val]
            if key == "contact_id":
                await self._assert_contact(str(val))
                sets.append("contact_id = CAST(:contact_id AS uuid)")
                params["contact_id"] = str(val)
                continue
            sets.append(f"{key} = :{key}")
            params[key] = val.strip() if isinstance(val, str) and key != "close_date" else val

        if not sets:
            return deal

        sets.append("updated_at = now()")
        await self.session.execute(
            text(f"UPDATE crm_deals SET {', '.join(sets)} WHERE id = CAST(:id AS uuid) AND workspace_id = :workspace_id"),
            params,
        )
        updated = await self.get_deal_by_id(deal_id)
        await self.recalculate_contact_score(updated["contact_id"])
        return updated

    async def move_stage(self, deal_id: str, stage: str) -> dict[str, Any]:
        stage_norm = self._validate_stage(stage)
        return await self.update_deal(
            deal_id,
            stage=stage_norm,
            probability=STAGE_DEFAULT_PROBABILITY[stage_norm],
        )

    async def delete_deal(self, deal_id: str) -> bool:
        deal = await self.get_deal_by_id(deal_id)
        result = await self.session.execute(
            text("DELETE FROM crm_deals WHERE id = CAST(:id AS uuid) AND workspace_id = :workspace_id"),
            {"id": deal_id, "workspace_id": self.workspace_id},
        )
        deleted = (result.rowcount or 0) > 0
        if deleted:
            await self.recalculate_contact_score(deal["contact_id"])
        return deleted

    async def get_deal_by_id(self, deal_id: str) -> dict[str, Any]:
        result = await self.session.execute(
            text("SELECT * FROM crm_deals WHERE id = CAST(:id AS uuid) AND workspace_id = :workspace_id"),
            {"id": deal_id, "workspace_id": self.workspace_id},
        )
        row = result.mappings().first()
        if not row:
            raise ValueError("Deal not found")
        return _row_to_dict(row)

    async def list_deals(
        self,
        *,
        skip: int = 0,
        limit: int = 50,
        stage: str | None = None,
        contact_id: str | None = None,
    ) -> dict[str, Any]:
        params: dict[str, Any] = {
            "workspace_id": self.workspace_id,
            "skip": max(0, skip),
            "limit": min(max(1, limit), 200),
        }
        where = "workspace_id = :workspace_id"
        if stage:
            where += " AND stage = :stage"
            params["stage"] = self._validate_stage(stage)
        if contact_id:
            where += " AND contact_id = CAST(:contact_id AS uuid)"
            params["contact_id"] = contact_id

        count = await self.session.execute(
            text(f"SELECT COUNT(*) FROM crm_deals WHERE {where}"),
            params,
        )
        total = int(count.scalar_one())

        result = await self.session.execute(
            text(
                f"""
                SELECT * FROM crm_deals
                WHERE {where}
                ORDER BY updated_at DESC
                OFFSET :skip LIMIT :limit
                """
            ),
            params,
        )
        return {
            "total": total,
            "items": [_row_to_dict(r) for r in result.mappings().all()],
            "skip": params["skip"],
            "limit": params["limit"],
        }

    async def list_by_stage(self) -> dict[str, list[dict[str, Any]]]:
        grouped = {s: [] for s in PIPELINE_STAGES}
        result = await self.session.execute(
            text(
                """
                SELECT * FROM crm_deals
                WHERE workspace_id = :workspace_id
                ORDER BY updated_at DESC
                """
            ),
            {"workspace_id": self.workspace_id},
        )
        for row in result.mappings().all():
            deal = _row_to_dict(row)
            stage = deal.get("stage", "lead")
            if stage in grouped:
                grouped[stage].append(deal)
        return grouped

    async def calculate_pipeline_value(self) -> dict[str, Any]:
        result = await self.session.execute(
            text(
                """
                SELECT
                    stage,
                    COUNT(*) AS deal_count,
                    COALESCE(SUM(value), 0) AS total_value,
                    COALESCE(SUM(value * probability / 100.0), 0) AS weighted_value
                FROM crm_deals
                WHERE workspace_id = :workspace_id
                GROUP BY stage
                """
            ),
            {"workspace_id": self.workspace_id},
        )
        by_stage: dict[str, Any] = {}
        total_raw = 0.0
        total_weighted = 0.0
        open_raw = 0.0
        open_weighted = 0.0

        for row in result.mappings().all():
            stage = row["stage"]
            raw = float(row["total_value"] or 0)
            weighted = float(row["weighted_value"] or 0)
            by_stage[stage] = {
                "deal_count": int(row["deal_count"]),
                "total_value": raw,
                "weighted_value": round(weighted, 2),
            }
            total_raw += raw
            total_weighted += weighted
            if stage in OPEN_STAGES:
                open_raw += raw
                open_weighted += weighted

        return {
            "by_stage": by_stage,
            "total_value": round(total_raw, 2),
            "weighted_pipeline_value": round(total_weighted, 2),
            "open_pipeline_value": round(open_raw, 2),
            "open_weighted_value": round(open_weighted, 2),
        }

    # ─── Activities ─────────────────────────────────────────────────────────

    async def create_activity(
        self,
        *,
        contact_id: str,
        type: str,
        description: str,
        deal_id: str | None = None,
        outcome: str | None = None,
        scheduled_at: datetime | None = None,
    ) -> dict[str, Any]:
        await self._assert_contact(contact_id)
        if deal_id:
            await self.get_deal_by_id(deal_id)

        result = await self.session.execute(
            text(
                """
                INSERT INTO crm_activities (
                    workspace_id, contact_id, deal_id, type, description,
                    outcome, scheduled_at
                )
                VALUES (
                    :workspace_id, CAST(:contact_id AS uuid),
                    CAST(:deal_id AS uuid), :type, :description,
                    :outcome, :scheduled_at
                )
                RETURNING *
                """
            ),
            {
                "workspace_id": self.workspace_id,
                "contact_id": contact_id,
                "deal_id": deal_id,
                "type": type.strip(),
                "description": description.strip(),
                "outcome": (outcome or "").strip() or None,
                "scheduled_at": scheduled_at,
            },
        )
        activity = _row_to_dict(result.mappings().first())
        await self.recalculate_contact_score(contact_id)
        return activity

    async def complete_activity(self, activity_id: str, outcome: str | None = None) -> dict[str, Any]:
        activity = await self.get_activity_by_id(activity_id)
        await self.session.execute(
            text(
                """
                UPDATE crm_activities
                SET completed_at = now(),
                    outcome = COALESCE(:outcome, outcome),
                    updated_at = now()
                WHERE id = CAST(:id AS uuid) AND workspace_id = :workspace_id
                """
            ),
            {
                "id": activity_id,
                "workspace_id": self.workspace_id,
                "outcome": (outcome or "").strip() or None,
            },
        )
        updated = await self.get_activity_by_id(activity_id)
        await self.recalculate_contact_score(activity["contact_id"])
        return updated

    async def update_activity(self, activity_id: str, **fields: Any) -> dict[str, Any]:
        await self.get_activity_by_id(activity_id)
        allowed = {"type", "description", "outcome", "scheduled_at", "completed_at", "deal_id"}
        sets: list[str] = []
        params: dict[str, Any] = {"id": activity_id, "workspace_id": self.workspace_id}

        for key, val in fields.items():
            if key not in allowed:
                continue
            if key == "deal_id" and val is not None:
                await self.get_deal_by_id(str(val))
                sets.append("deal_id = CAST(:deal_id AS uuid)")
                params["deal_id"] = str(val)
                continue
            if val is None:
                continue
            sets.append(f"{key} = :{key}")
            params[key] = val.strip() if isinstance(val, str) and key not in ("scheduled_at", "completed_at") else val

        if not sets:
            return await self.get_activity_by_id(activity_id)

        sets.append("updated_at = now()")
        await self.session.execute(
            text(
                f"UPDATE crm_activities SET {', '.join(sets)} WHERE id = CAST(:id AS uuid) AND workspace_id = :workspace_id"
            ),
            params,
        )
        activity = await self.get_activity_by_id(activity_id)
        await self.recalculate_contact_score(activity["contact_id"])
        return activity

    async def delete_activity(self, activity_id: str) -> bool:
        activity = await self.get_activity_by_id(activity_id)
        result = await self.session.execute(
            text("DELETE FROM crm_activities WHERE id = CAST(:id AS uuid) AND workspace_id = :workspace_id"),
            {"id": activity_id, "workspace_id": self.workspace_id},
        )
        deleted = (result.rowcount or 0) > 0
        if deleted:
            await self.recalculate_contact_score(activity["contact_id"])
        return deleted

    async def get_activity_by_id(self, activity_id: str) -> dict[str, Any]:
        result = await self.session.execute(
            text("SELECT * FROM crm_activities WHERE id = CAST(:id AS uuid) AND workspace_id = :workspace_id"),
            {"id": activity_id, "workspace_id": self.workspace_id},
        )
        row = result.mappings().first()
        if not row:
            raise ValueError("Activity not found")
        return _row_to_dict(row)

    async def list_activities(
        self,
        *,
        skip: int = 0,
        limit: int = 50,
        contact_id: str | None = None,
        deal_id: str | None = None,
    ) -> dict[str, Any]:
        params: dict[str, Any] = {
            "workspace_id": self.workspace_id,
            "skip": max(0, skip),
            "limit": min(max(1, limit), 200),
        }
        where = "workspace_id = :workspace_id"
        if contact_id:
            where += " AND contact_id = CAST(:contact_id AS uuid)"
            params["contact_id"] = contact_id
        if deal_id:
            where += " AND deal_id = CAST(:deal_id AS uuid)"
            params["deal_id"] = deal_id

        count = await self.session.execute(
            text(f"SELECT COUNT(*) FROM crm_activities WHERE {where}"),
            params,
        )
        total = int(count.scalar_one())

        result = await self.session.execute(
            text(
                f"""
                SELECT * FROM crm_activities
                WHERE {where}
                ORDER BY COALESCE(scheduled_at, created_at) DESC
                OFFSET :skip LIMIT :limit
                """
            ),
            params,
        )
        return {
            "total": total,
            "items": [_row_to_dict(r) for r in result.mappings().all()],
            "skip": params["skip"],
            "limit": params["limit"],
        }

    async def list_by_contact(self, contact_id: str, *, limit: int = 50) -> list[dict[str, Any]]:
        data = await self.list_activities(contact_id=contact_id, limit=limit)
        return data["items"]

    # ─── Pipeline / stats / scoring ─────────────────────────────────────────

    async def get_pipeline_view(self) -> dict[str, Any]:
        by_stage = await self.list_by_stage()
        values = await self.calculate_pipeline_value()
        columns = []
        for stage in PIPELINE_STAGES:
            deals = by_stage.get(stage, [])
            stage_vals = values["by_stage"].get(stage, {})
            columns.append(
                {
                    "stage": stage,
                    "deals": deals,
                    "deal_count": len(deals),
                    "total_value": stage_vals.get("total_value", 0),
                    "weighted_value": stage_vals.get("weighted_value", 0),
                }
            )
        return {
            "stages": PIPELINE_STAGES,
            "columns": columns,
            "totals": values,
        }

    async def get_stats(self) -> dict[str, Any]:
        counts = await self.session.execute(
            text(
                """
                SELECT
                    COUNT(*) AS total_deals,
                    COUNT(*) FILTER (WHERE stage = 'closed_won') AS won,
                    COUNT(*) FILTER (WHERE stage = 'closed_lost') AS lost,
                    COALESCE(AVG(value), 0) AS avg_deal_size,
                    COALESCE(SUM(value) FILTER (WHERE stage IN ('lead','qualified','proposal','negotiation')), 0) AS open_value
                FROM crm_deals
                WHERE workspace_id = :workspace_id
                """
            ),
            {"workspace_id": self.workspace_id},
        )
        row = counts.mappings().first()
        total_deals = int(row["total_deals"] or 0)
        won = int(row["won"] or 0)
        lost = int(row["lost"] or 0)
        closed = won + lost
        win_rate = round((won / closed) * 100, 2) if closed else 0.0
        pipeline = await self.calculate_pipeline_value()

        contact_count = await self.session.execute(
            text("SELECT COUNT(*) FROM crm_contacts WHERE workspace_id = :workspace_id"),
            {"workspace_id": self.workspace_id},
        )

        return {
            "contacts": int(contact_count.scalar_one()),
            "total_deals": total_deals,
            "pipeline_value": pipeline["open_pipeline_value"],
            "weighted_pipeline_value": pipeline["open_weighted_value"],
            "win_rate_percent": win_rate,
            "deals_won": won,
            "deals_lost": lost,
            "avg_deal_size": round(float(row["avg_deal_size"] or 0), 2),
            "open_deal_value_sum": round(float(row["open_value"] or 0), 2),
        }

    async def recalculate_contact_score(self, contact_id: str) -> dict[str, Any]:
        await self._assert_contact(contact_id)
        now = datetime.now(timezone.utc)
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        act = await self.session.execute(
            text(
                """
                SELECT
                    COUNT(*) FILTER (WHERE completed_at >= :week_ago) AS completed_7d,
                    COUNT(*) FILTER (WHERE created_at >= :month_ago) AS activity_30d,
                    MAX(completed_at) AS last_completed
                FROM crm_activities
                WHERE contact_id = CAST(:contact_id AS uuid) AND workspace_id = :workspace_id
                """
            ),
            {
                "contact_id": contact_id,
                "workspace_id": self.workspace_id,
                "week_ago": week_ago,
                "month_ago": month_ago,
            },
        )
        act_row = act.mappings().first()
        completed_7d = int(act_row["completed_7d"] or 0)
        activity_30d = int(act_row["activity_30d"] or 0)

        deals = await self.session.execute(
            text(
                """
                SELECT stage, value, probability, updated_at
                FROM crm_deals
                WHERE contact_id = CAST(:contact_id AS uuid) AND workspace_id = :workspace_id
                """
            ),
            {"contact_id": contact_id, "workspace_id": self.workspace_id},
        )
        deal_rows = deals.mappings().all()

        score = 10
        if activity_30d > 0:
            score += min(20, activity_30d * 4)
        if completed_7d > 0:
            score += min(15, completed_7d * 5)

        stage_rank = {
            "lead": 5,
            "qualified": 12,
            "proposal": 18,
            "negotiation": 25,
            "closed_won": 30,
            "closed_lost": 0,
        }
        max_stage_bonus = 0
        weighted_value = 0.0
        for d in deal_rows:
            stage = d["stage"]
            max_stage_bonus = max(max_stage_bonus, stage_rank.get(stage, 0))
            if stage in OPEN_STAGES:
                val = float(d["value"] or 0)
                prob = int(d["probability"] or STAGE_DEFAULT_PROBABILITY.get(stage, 10))
                weighted_value += val * prob / 100.0

        score += max_stage_bonus
        score += min(35, int(weighted_value / 500))

        score = max(0, min(100, score))

        await self.session.execute(
            text(
                """
                UPDATE crm_contacts
                SET score = :score, updated_at = now()
                WHERE id = CAST(:id AS uuid) AND workspace_id = :workspace_id
                """
            ),
            {"score": score, "id": contact_id, "workspace_id": self.workspace_id},
        )
        contact = await self.get_contact_by_id(contact_id)
        return {"contact_id": contact_id, "score": score, "contact": contact}

    # ─── Helpers ────────────────────────────────────────────────────────────

    async def _assert_contact(self, contact_id: str) -> None:
        await self.get_contact_by_id(contact_id)

    @staticmethod
    def _validate_stage(stage: str) -> str:
        s = (stage or "").strip().lower()
        if s not in PIPELINE_STAGES:
            raise ValueError(f"stage must be one of: {', '.join(PIPELINE_STAGES)}")
        return s
