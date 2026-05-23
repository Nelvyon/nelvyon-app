"""Loyalty / points program — earn, redeem, tiers, leaderboard."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from services.tenant_service import TenantService

logger = logging.getLogger(__name__)

_SCHEMA_READY = False
TIERS = (
    (0, 499, "Bronze"),
    (500, 1999, "Silver"),
    (2000, 4999, "Gold"),
    (5000, 10_000_000, "Platinum"),
)


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


def _tier_for_points(points: int) -> str:
    for low, high, name in TIERS:
        if low <= points <= high:
            return name
    return "Platinum"


class LoyaltyService:
    def __init__(self, session: AsyncSession, workspace_id: int | None = None):
        self.session = session
        self.workspace_id = int(workspace_id) if workspace_id is not None else None

    @classmethod
    async def ensure_schema(cls) -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        from core.database import db_manager

        sql_path = Path(__file__).resolve().parent.parent / "migrations" / "loyalty.sql"
        if sql_path.is_file():
            async with db_manager.get_session() as session:
                await session.execute(text(sql_path.read_text(encoding="utf-8")))
                await session.commit()
        _SCHEMA_READY = True

    async def _set_tenant(self, workspace_id: int) -> None:
        await TenantService(self.session).set_tenant_context(workspace_id)

    async def create_program(
        self,
        workspace_id: int,
        name: str,
        points_per_euro: float = 1.0,
        reward_rules: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        ws = int(workspace_id)
        await self._set_tenant(ws)
        rules = reward_rules or [
            {"trigger": "purchase", "points": 0, "description": "Puntos por euro gastado"},
            {"trigger": "referral", "points": 100, "description": "Referir un amigo"},
            {"trigger": "review", "points": 50, "description": "Dejar una reseña"},
            {"trigger": "birthday", "points": 200, "description": "Bonus cumpleaños"},
        ]
        result = await self.session.execute(
            text(
                """
                INSERT INTO loyalty_programs (workspace_id, name, points_per_euro, reward_rules)
                VALUES (:ws, :name, :ppe, CAST(:rules AS jsonb))
                RETURNING *
                """
            ),
            {"ws": ws, "name": name.strip(), "ppe": float(points_per_euro), "rules": _json_dumps(rules)},
        )
        row = _row(result.mappings().first())
        await self.session.commit()
        return row

    async def get_program(self, program_id: str) -> dict[str, Any]:
        await self.ensure_schema()
        params: dict[str, Any] = {"id": program_id}
        where = "id = CAST(:id AS uuid)"
        if self.workspace_id is not None:
            await self._set_tenant(self.workspace_id)
            where += " AND workspace_id = :ws"
            params["ws"] = self.workspace_id
        result = await self.session.execute(text(f"SELECT * FROM loyalty_programs WHERE {where}"), params)
        row = result.mappings().first()
        if not row:
            raise ValueError("Program not found")
        return _row(row)

    async def list_programs(self, workspace_id: int) -> list[dict[str, Any]]:
        await self.ensure_schema()
        ws = int(workspace_id)
        await self._set_tenant(ws)
        result = await self.session.execute(
            text("SELECT * FROM loyalty_programs WHERE workspace_id = :ws ORDER BY created_at DESC"),
            {"ws": ws},
        )
        return [_row(r) for r in result.mappings().all()]

    async def update_program(self, program_id: str, **fields: Any) -> dict[str, Any]:
        await self.ensure_schema()
        if self.workspace_id is None:
            raise ValueError("workspace_id required")
        await self._set_tenant(self.workspace_id)
        prog = await self.get_program(program_id)
        result = await self.session.execute(
            text(
                """
                UPDATE loyalty_programs SET
                    name = :name,
                    points_per_euro = :ppe,
                    reward_rules = CAST(:rules AS jsonb),
                    is_active = :active
                WHERE id = CAST(:id AS uuid) AND workspace_id = :ws
                RETURNING *
                """
            ),
            {
                "id": program_id,
                "ws": self.workspace_id,
                "name": fields.get("name", prog["name"]),
                "ppe": float(fields.get("points_per_euro", prog.get("points_per_euro", 1))),
                "rules": _json_dumps(fields.get("reward_rules", prog.get("reward_rules") or [])),
                "active": bool(fields.get("is_active", prog.get("is_active", True))),
            },
        )
        await self.session.commit()
        return _row(result.mappings().first())

    async def _get_or_create_customer(self, program_id: str, email: str, ws: int) -> dict[str, Any]:
        email_l = email.strip().lower()
        result = await self.session.execute(
            text(
                """
                SELECT * FROM loyalty_points
                WHERE program_id = CAST(:pid AS uuid) AND lower(customer_email) = :email
                """
            ),
            {"pid": program_id, "email": email_l},
        )
        row = result.mappings().first()
        if row:
            return _row(row)
        ins = await self.session.execute(
            text(
                """
                INSERT INTO loyalty_points (program_id, workspace_id, customer_email, tier)
                VALUES (CAST(:pid AS uuid), :ws, :email, 'Bronze')
                RETURNING *
                """
            ),
            {"pid": program_id, "ws": ws, "email": email_l},
        )
        return _row(ins.mappings().first())

    def _points_for_trigger(self, program: dict[str, Any], trigger: str, amount_euros: float) -> int:
        rules = program.get("reward_rules") or []
        if isinstance(rules, str):
            rules = json.loads(rules)
        trigger = trigger.lower()
        if trigger == "purchase":
            ppe = float(program.get("points_per_euro") or 1)
            base = int(amount_euros * ppe)
            for r in rules:
                if str(r.get("trigger", "")).lower() == "purchase" and r.get("points"):
                    base += int(r["points"])
            return max(0, base)
        for r in rules:
            if str(r.get("trigger", "")).lower() == trigger:
                return int(r.get("points") or 0)
        return 0

    async def award_points(
        self,
        program_id: str,
        customer_email: str,
        trigger: str,
        amount_euros: float = 0,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        prog = await self.get_program(program_id)
        ws = int(prog["workspace_id"])
        await self._set_tenant(ws)
        pts = self._points_for_trigger(prog, trigger, amount_euros)
        if pts <= 0 and trigger == "purchase" and amount_euros > 0:
            pts = int(float(prog.get("points_per_euro") or 1) * amount_euros)
        if pts <= 0:
            raise ValueError("No points to award for this trigger")
        cust = await self._get_or_create_customer(program_id, customer_email, ws)
        new_balance = int(cust.get("points_balance") or 0) + pts
        new_earned = int(cust.get("total_earned") or 0) + pts
        tier = _tier_for_points(new_earned)
        await self.session.execute(
            text(
                """
                UPDATE loyalty_points SET
                    points_balance = :bal,
                    total_earned = :earned,
                    tier = :tier,
                    updated_at = NOW()
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {"id": cust["id"], "bal": new_balance, "earned": new_earned, "tier": tier},
        )
        await self.session.execute(
            text(
                """
                INSERT INTO loyalty_transactions (program_id, workspace_id, customer_email, type, points, trigger, description)
                VALUES (CAST(:pid AS uuid), :ws, :email, 'earn', :pts, :trigger, :desc)
                """
            ),
            {
                "pid": program_id,
                "ws": ws,
                "email": customer_email.strip().lower(),
                "pts": pts,
                "trigger": trigger,
                "desc": f"+{pts} pts ({trigger})",
            },
        )
        await self.session.commit()
        return await self.get_customer_points(program_id, customer_email)

    async def redeem_points(
        self,
        program_id: str,
        customer_email: str,
        points_to_redeem: int,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        prog = await self.get_program(program_id)
        ws = int(prog["workspace_id"])
        await self._set_tenant(ws)
        pts = int(points_to_redeem)
        if pts <= 0:
            raise ValueError("points_to_redeem must be positive")
        cust = await self._get_or_create_customer(program_id, customer_email, ws)
        balance = int(cust.get("points_balance") or 0)
        if balance < pts:
            raise ValueError("Insufficient points")
        discount_euros = round(pts / 100.0, 2)
        new_balance = balance - pts
        new_redeemed = int(cust.get("total_redeemed") or 0) + pts
        await self.session.execute(
            text(
                """
                UPDATE loyalty_points SET
                    points_balance = :bal,
                    total_redeemed = :redeemed,
                    updated_at = NOW()
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {"id": cust["id"], "bal": new_balance, "redeemed": new_redeemed},
        )
        await self.session.execute(
            text(
                """
                INSERT INTO loyalty_transactions (program_id, workspace_id, customer_email, type, points, trigger, description)
                VALUES (CAST(:pid AS uuid), :ws, :email, 'redeem', :pts, 'redeem', :desc)
                """
            ),
            {
                "pid": program_id,
                "ws": ws,
                "email": customer_email.strip().lower(),
                "pts": -pts,
                "desc": f"Canje {pts} pts = {discount_euros}€",
            },
        )
        await self.session.commit()
        result = await self.get_customer_points(program_id, customer_email)
        result["discount_euros"] = discount_euros
        return result

    async def get_customer_points(self, program_id: str, customer_email: str) -> dict[str, Any]:
        await self.ensure_schema()
        prog = await self.get_program(program_id)
        ws = int(prog["workspace_id"])
        await self._set_tenant(ws)
        email_l = customer_email.strip().lower()
        cust = await self.session.execute(
            text(
                """
                SELECT * FROM loyalty_points
                WHERE program_id = CAST(:pid AS uuid) AND lower(customer_email) = :email
                """
            ),
            {"pid": program_id, "email": email_l},
        )
        row = cust.mappings().first()
        if not row:
            return {
                "customer_email": email_l,
                "points_balance": 0,
                "tier": "Bronze",
                "total_earned": 0,
                "total_redeemed": 0,
                "history": [],
            }
        data = _row(row)
        hist = await self.session.execute(
            text(
                """
                SELECT * FROM loyalty_transactions
                WHERE program_id = CAST(:pid AS uuid) AND lower(customer_email) = :email
                ORDER BY created_at DESC LIMIT 50
                """
            ),
            {"pid": program_id, "email": email_l},
        )
        data["history"] = [_row(r) for r in hist.mappings().all()]
        return data

    async def get_leaderboard(self, program_id: str, limit: int = 10) -> list[dict[str, Any]]:
        await self.ensure_schema()
        prog = await self.get_program(program_id)
        ws = int(prog["workspace_id"])
        await self._set_tenant(ws)
        result = await self.session.execute(
            text(
                """
                SELECT customer_email, points_balance, tier, total_earned
                FROM loyalty_points
                WHERE program_id = CAST(:pid AS uuid)
                ORDER BY points_balance DESC
                LIMIT :lim
                """
            ),
            {"pid": program_id, "lim": limit},
        )
        return [_row(r) for r in result.mappings().all()]

    async def get_program_stats(self, program_id: str) -> dict[str, Any]:
        await self.ensure_schema()
        prog = await self.get_program(program_id)
        ws = int(prog["workspace_id"])
        await self._set_tenant(ws)
        stats = await self.session.execute(
            text(
                """
                SELECT
                    COALESCE(SUM(points) FILTER (WHERE type = 'earn'), 0) AS points_issued,
                    COALESCE(SUM(ABS(points)) FILTER (WHERE type = 'redeem'), 0) AS points_redeemed,
                    COUNT(DISTINCT customer_email) AS active_customers
                FROM loyalty_transactions
                WHERE program_id = CAST(:pid AS uuid)
                """
            ),
            {"pid": program_id},
        )
        s = stats.mappings().first()
        issued = int(s["points_issued"] or 0)
        redeemed = int(s["points_redeemed"] or 0)
        estimated_cost = round(redeemed / 100.0, 2)
        recent = await self.session.execute(
            text(
                """
                SELECT * FROM loyalty_transactions
                WHERE program_id = CAST(:pid AS uuid)
                ORDER BY created_at DESC LIMIT 30
                """
            ),
            {"pid": program_id},
        )
        return {
            "points_issued": issued,
            "points_redeemed": redeemed,
            "active_customers": int(s["active_customers"] or 0),
            "estimated_cost_euros": estimated_cost,
            "recent_transactions": [_row(r) for r in recent.mappings().all()],
        }

    async def get_workspace_summary(self, workspace_id: int) -> dict[str, Any]:
        await self.ensure_schema()
        ws = int(workspace_id)
        await self._set_tenant(ws)
        programs = await self.list_programs(ws)
        if not programs:
            return {
                "points_issued": 0,
                "points_redeemed": 0,
                "active_customers": 0,
                "estimated_cost_euros": 0,
                "program": None,
            }
        prog = programs[0]
        stats = await self.get_program_stats(prog["id"])
        stats["program"] = prog
        return stats


def get_loyalty_service(session: AsyncSession, workspace_id: int | None = None) -> LoyaltyService:
    return LoyaltyService(session, workspace_id)
