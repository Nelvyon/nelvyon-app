"""NELVYON CDP — event ingestion, identity resolution, segments, CRM sync."""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from services.crm_service import CRMService
from services.tenant_service import TenantService

logger = logging.getLogger(__name__)

_SCHEMA_READY = False
CDP_SOURCES = frozenset(
    {"web", "email", "crm", "store", "webinar", "lms", "chatbot", "sms", "social"}
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


def _parse_relative_date(value: str) -> datetime | None:
    m = re.match(r"^(\d+)(d|h|m)$", (value or "").strip().lower())
    if not m:
        return None
    n, unit = int(m.group(1)), m.group(2)
    delta = {"d": timedelta(days=n), "h": timedelta(hours=n), "m": timedelta(minutes=n)}[unit]
    return datetime.now(timezone.utc) - delta


def _coerce_number(val: Any) -> float | None:
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


class CdpService:
    def __init__(self, session: AsyncSession, workspace_id: int | None = None):
        self.session = session
        self.workspace_id = int(workspace_id) if workspace_id is not None else None

    @classmethod
    async def ensure_schema(cls) -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        from core.database import db_manager

        sql_path = Path(__file__).resolve().parent.parent / "migrations" / "cdp.sql"
        if sql_path.is_file():
            async with db_manager.get_session() as session:
                await session.execute(text(sql_path.read_text(encoding="utf-8")))
                await session.commit()
        _SCHEMA_READY = True

    async def _set_tenant(self, workspace_id: int) -> None:
        await TenantService(self.session).set_tenant_context(workspace_id)

    async def ingest_event(
        self,
        workspace_id: int,
        source: str,
        event_type: str,
        properties: dict[str, Any] | None = None,
        user_id: str | None = None,
        anonymous_id: str | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        ws = int(workspace_id)
        src = (source or "web").lower()
        if src not in CDP_SOURCES:
            raise ValueError(f"source must be one of: {', '.join(sorted(CDP_SOURCES))}")
        await self._set_tenant(ws)
        uid = (user_id or "").strip() or None
        anon = (anonymous_id or "").strip() or None
        result = await self.session.execute(
            text(
                """
                INSERT INTO cdp_events (workspace_id, source, event_type, properties, user_id, anonymous_id)
                VALUES (:ws, :src, :etype, CAST(:props AS jsonb), :uid, :anon)
                RETURNING *
                """
            ),
            {
                "ws": ws,
                "src": src,
                "etype": event_type,
                "props": _json_dumps(properties or {}),
                "uid": uid,
                "anon": anon,
            },
        )
        row = _row(result.mappings().first())
        if uid:
            await self._touch_identity(ws, uid, anon, properties or {})
        await self.session.commit()
        return row

    async def _touch_identity(
        self,
        workspace_id: int,
        user_id: str,
        anonymous_id: str | None,
        traits: dict[str, Any],
    ) -> None:
        existing = await self.session.execute(
            text(
                """
                SELECT * FROM cdp_identities
                WHERE workspace_id = :ws AND lower(user_id) = lower(:uid)
                """
            ),
            {"ws": workspace_id, "uid": user_id},
        )
        row = existing.mappings().first()
        if row:
            merged = dict(row._mapping.get("traits") or {})
            if isinstance(merged, str):
                merged = json.loads(merged)
            merged.update(traits)
            await self.session.execute(
                text(
                    """
                    UPDATE cdp_identities SET
                        last_seen = NOW(),
                        anonymous_id = COALESCE(:anon, anonymous_id),
                        traits = CAST(:traits AS jsonb)
                    WHERE id = CAST(:id AS uuid)
                    """
                ),
                {"id": str(row._mapping["id"]), "anon": anonymous_id, "traits": _json_dumps(merged)},
            )
        else:
            await self.session.execute(
                text(
                    """
                    INSERT INTO cdp_identities (workspace_id, anonymous_id, user_id, traits)
                    VALUES (:ws, :anon, :uid, CAST(:traits AS jsonb))
                    """
                ),
                {
                    "ws": workspace_id,
                    "anon": anonymous_id,
                    "uid": user_id,
                    "traits": _json_dumps(traits),
                },
            )

    async def identify_user(
        self,
        workspace_id: int,
        anonymous_id: str,
        user_id: str,
        traits: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        ws = int(workspace_id)
        await self._set_tenant(ws)
        uid = user_id.strip()
        anon = anonymous_id.strip()
        if not uid:
            raise ValueError("user_id required")
        await self._touch_identity(ws, uid, anon, traits or {})
        if anon:
            await self.session.execute(
                text(
                    """
                    UPDATE cdp_events SET user_id = :uid
                    WHERE workspace_id = :ws AND anonymous_id = :anon AND user_id IS NULL
                    """
                ),
                {"ws": ws, "uid": uid, "anon": anon},
            )
        result = await self.session.execute(
            text(
                """
                SELECT * FROM cdp_identities
                WHERE workspace_id = :ws AND lower(user_id) = lower(:uid)
                """
            ),
            {"ws": ws, "uid": uid},
        )
        row = _row(result.mappings().first())
        await self.session.commit()
        return row

    async def _aggregate_profile_traits(self, workspace_id: int, user_id: str) -> dict[str, Any]:
        ws = workspace_id
        uid = user_id.strip().lower()
        traits: dict[str, Any] = {"user_id": user_id, "sources": []}

        ident = await self.session.execute(
            text(
                """
                SELECT * FROM cdp_identities
                WHERE workspace_id = :ws AND lower(user_id) = :uid
                """
            ),
            {"ws": ws, "uid": uid},
        )
        id_row = ident.mappings().first()
        if id_row:
            t = id_row._mapping.get("traits") or {}
            if isinstance(t, str):
                t = json.loads(t)
            traits.update(t)
            traits["first_seen"] = _row(id_row).get("first_seen")
            traits["last_seen"] = _row(id_row).get("last_seen")

        events = await self.session.execute(
            text(
                """
                SELECT source, event_type, COUNT(*) AS cnt
                FROM cdp_events
                WHERE workspace_id = :ws AND lower(COALESCE(user_id, '')) = :uid
                GROUP BY source, event_type
                """
            ),
            {"ws": ws, "uid": uid},
        )
        event_summary = [_row(r) for r in events.mappings().all()]
        traits["events_summary"] = event_summary
        traits["sources"] = sorted({str(e.get("source")) for e in event_summary})

        crm = await self.session.execute(
            text(
                """
                SELECT * FROM crm_contacts
                WHERE workspace_id = :ws AND lower(email) = :uid
                LIMIT 1
                """
            ),
            {"ws": ws, "uid": uid},
        )
        crm_row = crm.mappings().first()
        if crm_row:
            traits["crm"] = _row(crm_row)

        try:
            lms = await self.session.execute(
                text(
                    """
                    SELECT COUNT(*) FROM lms_enrollments e
                    JOIN lms_courses c ON c.id = e.course_id
                    WHERE c.workspace_id = :ws AND lower(e.student_email) = :uid
                    """
                ),
                {"ws": ws, "uid": uid},
            )
            traits["lms_enrollments"] = int(lms.scalar_one() or 0)
        except Exception:
            traits["lms_enrollments"] = 0

        try:
            web = await self.session.execute(
                text(
                    """
                    SELECT COUNT(*) FROM webinar_registrations r
                    JOIN webinars w ON w.id = r.webinar_id
                    WHERE w.workspace_id = :ws AND lower(r.email) = :uid
                    """
                ),
                {"ws": ws, "uid": uid},
            )
            traits["webinar_registrations"] = int(web.scalar_one() or 0)
        except Exception:
            traits["webinar_registrations"] = 0

        try:
            loyalty = await self.session.execute(
                text(
                    """
                    SELECT points_balance, tier FROM loyalty_points
                    WHERE workspace_id = :ws AND lower(customer_email) = :uid
                    LIMIT 1
                    """
                ),
                {"ws": ws, "uid": uid},
            )
            loy = loyalty.mappings().first()
            if loy:
                traits["loyalty"] = _row(loy)
        except Exception:
            pass

        try:
            chat = await self.session.execute(
                text(
                    """
                    SELECT COUNT(*) FROM chatbot_conversations
                    WHERE workspace_id = :ws AND lower(COALESCE(visitor_info->>'email', '')) = :uid
                    """
                ),
                {"ws": ws, "uid": uid},
            )
            traits["chatbot_conversations"] = int(chat.scalar_one() or 0)
        except Exception:
            traits["chatbot_conversations"] = 0

        purchases = await self.session.execute(
            text(
                """
                SELECT COUNT(*) FROM cdp_events
                WHERE workspace_id = :ws AND lower(COALESCE(user_id, '')) = :uid
                  AND event_type IN ('purchase', 'order_completed', 'payment')
                """
            ),
            {"ws": ws, "uid": uid},
        )
        traits["total_purchases"] = int(purchases.scalar_one() or 0)

        return traits

    async def get_unified_profile(self, workspace_id: int, user_id: str) -> dict[str, Any]:
        await self.ensure_schema()
        ws = int(workspace_id)
        await self._set_tenant(ws)
        traits = await self._aggregate_profile_traits(ws, user_id)
        recent = await self.session.execute(
            text(
                """
                SELECT * FROM cdp_events
                WHERE workspace_id = :ws AND lower(COALESCE(user_id, '')) = lower(:uid)
                ORDER BY created_at DESC LIMIT 50
                """
            ),
            {"ws": ws, "uid": user_id},
        )
        return {
            "user_id": user_id,
            "profile": traits,
            "recent_events": [_row(r) for r in recent.mappings().all()],
        }

    async def list_profiles(self, workspace_id: int, limit: int = 50) -> list[dict[str, Any]]:
        await self.ensure_schema()
        ws = int(workspace_id)
        await self._set_tenant(ws)
        result = await self.session.execute(
            text(
                """
                SELECT user_id, traits, first_seen, last_seen
                FROM cdp_identities
                WHERE workspace_id = :ws
                ORDER BY last_seen DESC
                LIMIT :lim
                """
            ),
            {"ws": ws, "lim": limit},
        )
        items = []
        for r in result.mappings().all():
            row = _row(r)
            traits = row.get("traits") or {}
            if isinstance(traits, str):
                traits = json.loads(traits)
            items.append(
                {
                    "user_id": row["user_id"],
                    "email": traits.get("email") or row["user_id"],
                    "sources": traits.get("sources", []),
                    "last_seen": row.get("last_seen"),
                    "first_seen": row.get("first_seen"),
                }
            )
        return items

    async def create_segment(
        self,
        workspace_id: int,
        name: str,
        conditions: list[dict[str, Any]],
    ) -> dict[str, Any]:
        await self.ensure_schema()
        ws = int(workspace_id)
        await self._set_tenant(ws)
        result = await self.session.execute(
            text(
                """
                INSERT INTO cdp_segments (workspace_id, name, conditions)
                VALUES (:ws, :name, CAST(:conds AS jsonb))
                RETURNING *
                """
            ),
            {"ws": ws, "name": name.strip(), "conds": _json_dumps(conditions or [])},
        )
        row = _row(result.mappings().first())
        await self.session.commit()
        return row

    async def list_segments(self, workspace_id: int) -> list[dict[str, Any]]:
        await self.ensure_schema()
        ws = int(workspace_id)
        await self._set_tenant(ws)
        result = await self.session.execute(
            text("SELECT * FROM cdp_segments WHERE workspace_id = :ws ORDER BY created_at DESC"),
            {"ws": ws},
        )
        return [_row(r) for r in result.mappings().all()]

    def _match_condition(self, profile: dict[str, Any], cond: dict[str, Any]) -> bool:
        field = str(cond.get("field", ""))
        op = str(cond.get("operator", "eq")).lower()
        value = cond.get("value")
        actual = profile.get(field)
        if field == "last_seen" and isinstance(actual, str):
            actual_dt = datetime.fromisoformat(actual.replace("Z", "+00:00"))
            rel = _parse_relative_date(str(value))
            if rel and op == "lt":
                return actual_dt >= rel
            if rel and op == "gt":
                return actual_dt <= rel
        num_a = _coerce_number(actual)
        num_v = _coerce_number(value)
        if num_a is not None and num_v is not None:
            if op == "gt":
                return num_a > num_v
            if op == "lt":
                return num_a < num_v
            if op == "gte":
                return num_a >= num_v
            if op == "lte":
                return num_a <= num_v
            if op == "eq":
                return num_a == num_v
            if op == "ne":
                return num_a != num_v
        if op == "eq":
            return str(actual) == str(value)
        if op == "ne":
            return str(actual) != str(value)
        if op == "contains":
            return str(value).lower() in str(actual or "").lower()
        return False

    async def evaluate_segment(self, segment_id: str) -> dict[str, Any]:
        await self.ensure_schema()
        if self.workspace_id is None:
            raise ValueError("workspace_id required")
        await self._set_tenant(self.workspace_id)
        seg = await self.session.execute(
            text("SELECT * FROM cdp_segments WHERE id = CAST(:id AS uuid) AND workspace_id = :ws"),
            {"id": segment_id, "ws": self.workspace_id},
        )
        row = seg.mappings().first()
        if not row:
            raise ValueError("Segment not found")
        segment = _row(row)
        conditions = segment.get("conditions") or []
        if isinstance(conditions, str):
            conditions = json.loads(conditions)

        ids_result = await self.session.execute(
            text("SELECT user_id FROM cdp_identities WHERE workspace_id = :ws"),
            {"ws": self.workspace_id},
        )
        matched: list[str] = []
        for r in ids_result.mappings().all():
            uid = str(r["user_id"])
            profile = await self._aggregate_profile_traits(self.workspace_id, uid)
            if all(self._match_condition(profile, c) for c in conditions):
                matched.append(uid)

        await self.session.execute(
            text(
                """
                UPDATE cdp_segments SET user_count = :cnt, last_evaluated_at = NOW()
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {"id": segment_id, "cnt": len(matched)},
        )
        await self.session.commit()
        return {"segment_id": segment_id, "user_ids": matched, "count": len(matched)}

    async def sync_segment_to_crm(self, segment_id: str) -> dict[str, Any]:
        await self.ensure_schema()
        if self.workspace_id is None:
            raise ValueError("workspace_id required")
        eval_result = await self.evaluate_segment(segment_id)
        crm = CRMService(self.session, self.workspace_id)
        tag = f"cdp-segment:{segment_id}"
        synced = 0
        for uid in eval_result["user_ids"]:
            email = uid.strip().lower()
            existing = await self.session.execute(
                text(
                    """
                    SELECT id, tags FROM crm_contacts
                    WHERE workspace_id = :ws AND lower(email) = :email
                    LIMIT 1
                    """
                ),
                {"ws": self.workspace_id, "email": email},
            )
            ex = existing.mappings().first()
            if ex:
                tags = ex._mapping.get("tags") or []
                if isinstance(tags, str):
                    tags = json.loads(tags)
                if tag not in tags:
                    tags.append(tag)
                    await crm.update_contact(str(ex._mapping["id"]), tags=tags)
                synced += 1
            else:
                await crm.create_contact(name=email.split("@")[0], email=email, tags=[tag])
                synced += 1
        return {"segment_id": segment_id, "synced_contacts": synced}

    async def list_recent_events(self, workspace_id: int, limit: int = 50) -> list[dict[str, Any]]:
        await self.ensure_schema()
        ws = int(workspace_id)
        await self._set_tenant(ws)
        result = await self.session.execute(
            text(
                """
                SELECT * FROM cdp_events
                WHERE workspace_id = :ws
                ORDER BY created_at DESC LIMIT :lim
                """
            ),
            {"ws": ws, "lim": limit},
        )
        return [_row(r) for r in result.mappings().all()]

    async def get_cdp_stats(self, workspace_id: int) -> dict[str, Any]:
        await self.ensure_schema()
        ws = int(workspace_id)
        await self._set_tenant(ws)
        profiles = await self.session.execute(
            text("SELECT COUNT(*) FROM cdp_identities WHERE workspace_id = :ws"),
            {"ws": ws},
        )
        events_24h = await self.session.execute(
            text(
                """
                SELECT COUNT(*) FROM cdp_events
                WHERE workspace_id = :ws AND created_at >= NOW() - INTERVAL '24 hours'
                """
            ),
            {"ws": ws},
        )
        segments = await self.session.execute(
            text("SELECT COUNT(*) FROM cdp_segments WHERE workspace_id = :ws"),
            {"ws": ws},
        )
        return {
            "unified_profiles": int(profiles.scalar_one() or 0),
            "events_last_24h": int(events_24h.scalar_one() or 0),
            "active_segments": int(segments.scalar_one() or 0),
        }


def get_cdp_service(session: AsyncSession, workspace_id: int | None = None) -> CdpService:
    return CdpService(session, workspace_id)
