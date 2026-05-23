"""NELVYON visual funnel builder — multi-step funnels with landing pages."""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import db_manager
from services.landing_builder_service import LandingBuilderService
from services.tenant_service import TenantService

logger = logging.getLogger(__name__)

_SCHEMA_READY = False


def _json_dumps(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, default=str)


def _row(row: Any) -> dict[str, Any]:
    if row is None:
        return {}
    data = dict(row._mapping)
    for k, v in list(data.items()):
        if isinstance(v, datetime):
            data[k] = v.isoformat()
        elif isinstance(v, uuid.UUID):
            data[k] = str(v)
    return data


class FunnelBuilderService:
    """Multi-step funnels chaining landing pages."""

    def __init__(self, session: AsyncSession, workspace_id: int | None = None):
        self.session = session
        self.workspace_id = int(workspace_id) if workspace_id is not None else None

    @staticmethod
    async def ensure_schema() -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        await LandingBuilderService.ensure_schema()
        await TenantService.ensure_schema()
        if not db_manager.async_session_maker:
            await db_manager.ensure_initialized()
        sql_path = Path(__file__).resolve().parent.parent / "migrations" / "funnel_builder.sql"
        if sql_path.exists():
            raw = sql_path.read_text(encoding="utf-8")
            async with db_manager.async_session_maker() as session:
                for stmt in [s.strip() for s in raw.split(";") if s.strip()]:
                    try:
                        await session.execute(text(stmt))
                    except Exception as exc:
                        if "already exists" not in str(exc).lower():
                            logger.debug("funnel_builder schema skipped: %s", exc)
                await session.commit()
        _SCHEMA_READY = True

    async def _set_workspace(self, workspace_id: int) -> None:
        await TenantService(self.session).set_tenant_context(workspace_id)

    async def create_funnel(
        self,
        workspace_id: int,
        name: str,
        steps: list[dict[str, Any]],
        *,
        status: str = "draft",
    ) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_workspace(workspace_id)
        funnel_id = str(uuid.uuid4())
        await self.session.execute(
            text(
                """
                INSERT INTO funnels (id, workspace_id, name, status)
                VALUES (:id, :ws, :name, :status)
                """
            ),
            {"id": funnel_id, "ws": workspace_id, "name": name.strip(), "status": status},
        )
        step_ids: list[str] = []
        for i, step in enumerate(steps):
            sid = str(uuid.uuid4())
            step_ids.append(sid)
            await self.session.execute(
                text(
                    """
                    INSERT INTO funnel_steps (
                        id, funnel_id, step_order, name, landing_page_id, exit_url
                    )
                    VALUES (
                        :id, :fid, :ord, :name,
                        NULLIF(:lpid, '')::uuid, :exit_url
                    )
                    """
                ),
                {
                    "id": sid,
                    "fid": funnel_id,
                    "ord": i,
                    "name": step.get("name") or f"Step {i + 1}",
                    "lpid": step.get("landing_page_id") or "",
                    "exit_url": step.get("exit_url"),
                },
            )
        for i, step in enumerate(steps):
            next_id = step.get("next_step_id")
            if next_id:
                await self.session.execute(
                    text(
                        "UPDATE funnel_steps SET next_step_id = :next::uuid WHERE id = :id::uuid"
                    ),
                    {"id": step_ids[i], "next": next_id},
                )
            elif i < len(step_ids) - 1:
                await self.session.execute(
                    text(
                        "UPDATE funnel_steps SET next_step_id = :next::uuid WHERE id = :id::uuid"
                    ),
                    {"id": step_ids[i], "next": step_ids[i + 1]},
                )
        await self.session.commit()
        return await self.get_funnel(funnel_id, workspace_id) or {}

    async def get_funnel(self, funnel_id: str, workspace_id: int) -> dict[str, Any] | None:
        await self.ensure_schema()
        await self._set_workspace(workspace_id)
        r = await self.session.execute(
            text("SELECT * FROM funnels WHERE id = :id::uuid AND workspace_id = :ws"),
            {"id": funnel_id, "ws": workspace_id},
        )
        funnel = _row(r.fetchone())
        if not funnel:
            return None
        sr = await self.session.execute(
            text(
                """
                SELECT * FROM funnel_steps
                WHERE funnel_id = :fid
                ORDER BY step_order ASC
                """
            ),
            {"fid": funnel_id},
        )
        funnel["steps"] = [_row(x) for x in sr.fetchall()]
        return funnel

    async def list_funnels(self, workspace_id: int) -> list[dict[str, Any]]:
        await self.ensure_schema()
        await self._set_workspace(workspace_id)
        r = await self.session.execute(
            text(
                """
                SELECT f.*,
                       (SELECT COUNT(*) FROM funnel_steps s WHERE s.funnel_id = f.id) AS step_count
                FROM funnels f
                WHERE f.workspace_id = :ws
                ORDER BY f.updated_at DESC
                """
            ),
            {"ws": workspace_id},
        )
        return [_row(x) for x in r.fetchall()]

    async def update_funnel(
        self, funnel_id: str, workspace_id: int, updates: dict[str, Any]
    ) -> dict[str, Any]:
        await self.ensure_schema()
        existing = await self.get_funnel(funnel_id, workspace_id)
        if not existing:
            raise ValueError("Funnel not found")
        await self._set_workspace(workspace_id)

        sets = ["updated_at = NOW()"]
        params: dict[str, Any] = {"id": funnel_id, "ws": workspace_id}
        if "name" in updates:
            sets.append("name = :name")
            params["name"] = updates["name"]
        if "status" in updates:
            sets.append("status = :status")
            params["status"] = updates["status"]
        if "metadata" in updates:
            sets.append("metadata = CAST(:metadata AS jsonb)")
            params["metadata"] = _json_dumps(updates["metadata"])

        await self.session.execute(
            text(
                f"UPDATE funnels SET {', '.join(sets)} WHERE id = :id::uuid AND workspace_id = :ws"
            ),
            params,
        )

        if "steps" in updates:
            await self.session.execute(
                text("DELETE FROM funnel_steps WHERE funnel_id = :fid::uuid"),
                {"fid": funnel_id},
            )
            steps = updates["steps"]
            step_ids: list[str] = []
            for i, step in enumerate(steps):
                sid = str(uuid.uuid4())
                step_ids.append(sid)
                await self.session.execute(
                    text(
                        """
                        INSERT INTO funnel_steps (
                            id, funnel_id, step_order, name, landing_page_id, exit_url
                        )
                        VALUES (
                            :id, :fid, :ord, :name,
                            NULLIF(:lpid, '')::uuid, :exit_url
                        )
                        """
                    ),
                    {
                        "id": sid,
                        "fid": funnel_id,
                        "ord": i,
                        "name": step.get("name") or f"Step {i + 1}",
                        "lpid": step.get("landing_page_id") or "",
                        "exit_url": step.get("exit_url"),
                    },
                )
            for i in range(len(step_ids) - 1):
                await self.session.execute(
                    text(
                        "UPDATE funnel_steps SET next_step_id = :next::uuid WHERE id = :id::uuid"
                    ),
                    {"id": step_ids[i], "next": step_ids[i + 1]},
                )

        await self.session.commit()
        return await self.get_funnel(funnel_id, workspace_id) or {}

    async def delete_funnel(self, funnel_id: str, workspace_id: int) -> bool:
        await self.ensure_schema()
        await self._set_workspace(workspace_id)
        r = await self.session.execute(
            text(
                "DELETE FROM funnels WHERE id = :id::uuid AND workspace_id = :ws RETURNING id"
            ),
            {"id": funnel_id, "ws": workspace_id},
        )
        await self.session.commit()
        return r.fetchone() is not None

    async def attach_campaign(
        self, funnel_id: str, workspace_id: int, campaign_id: int
    ) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_workspace(workspace_id)
        r = await self.session.execute(
            text(
                """
                UPDATE funnels
                SET campaign_id = :cid, updated_at = NOW()
                WHERE id = :id::uuid AND workspace_id = :ws
                RETURNING id
                """
            ),
            {"id": funnel_id, "ws": workspace_id, "cid": campaign_id},
        )
        if not r.fetchone():
            raise ValueError("Funnel not found")
        await self.session.commit()
        return await self.get_funnel(funnel_id, workspace_id) or {}

    async def get_funnel_analytics(self, funnel_id: str, workspace_id: int) -> dict[str, Any]:
        funnel = await self.get_funnel(funnel_id, workspace_id)
        if not funnel:
            raise ValueError("Funnel not found")
        await self._set_workspace(workspace_id)

        steps_analytics: list[dict[str, Any]] = []
        prev_visits = None
        total_revenue = 0.0

        for step in funnel.get("steps") or []:
            lpid = step.get("landing_page_id")
            if not lpid:
                steps_analytics.append(
                    {
                        "step_id": step["id"],
                        "name": step["name"],
                        "visits": 0,
                        "conversions": 0,
                        "conversion_rate": 0,
                        "drop_off_rate": 0,
                    }
                )
                continue

            r = await self.session.execute(
                text(
                    """
                    SELECT event_type, COUNT(*) AS cnt
                    FROM landing_analytics
                    WHERE page_id = :pid::uuid
                    GROUP BY event_type
                    """
                ),
                {"pid": lpid},
            )
            counts = {row._mapping["event_type"]: int(row._mapping["cnt"]) for row in r.fetchall()}
            visits = counts.get("impression", 0)
            conversions = counts.get("conversion", 0) + counts.get("form_submit", 0)
            conv_rate = round(100 * conversions / visits, 2) if visits else 0.0
            drop_off = 0.0
            if prev_visits and prev_visits > 0:
                drop_off = round(100 * (1 - visits / prev_visits), 2)
            prev_visits = visits

            rev_r = await self.session.execute(
                text(
                    """
                    SELECT COALESCE(SUM((metadata->>'revenue')::numeric), 0) AS rev
                    FROM landing_analytics
                    WHERE page_id = :pid::uuid AND event_type = 'conversion'
                    """
                ),
                {"pid": lpid},
            )
            step_rev = float(rev_r.scalar() or 0)
            total_revenue += step_rev

            steps_analytics.append(
                {
                    "step_id": step["id"],
                    "name": step["name"],
                    "landing_page_id": lpid,
                    "visits": visits,
                    "conversions": conversions,
                    "conversion_rate": conv_rate,
                    "drop_off_rate": drop_off,
                    "attributed_revenue": step_rev,
                }
            )

        return {
            "funnel_id": funnel_id,
            "name": funnel.get("name"),
            "campaign_id": funnel.get("campaign_id"),
            "steps": steps_analytics,
            "total_attributed_revenue": total_revenue,
        }


def get_funnel_builder_service(
    session: AsyncSession, workspace_id: int | None = None
) -> FunnelBuilderService:
    return FunnelBuilderService(session, workspace_id)
