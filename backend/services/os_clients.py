"""Service layer for os_clients — workspace-scoped, no SaaS tables."""
from __future__ import annotations

import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.os_clients import Os_clients

logger = logging.getLogger(__name__)

VALID_STATUSES = frozenset({"active", "archived"})
_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_email(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    t = value.strip().lower()
    return t if t else None


class OsClientsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _validate_status(self, status: Optional[str]) -> str:
        s = (status or "active").strip().lower()
        if s not in VALID_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(sorted(VALID_STATUSES))}")
        return s

    def _validate_email(self, email: Optional[str]) -> None:
        if email is None:
            return
        if not _EMAIL_RE.match(email):
            raise ValueError("contact_email is invalid")

    async def _enforce_workspace_body(
        self, data: Dict[str, Any], workspace_id: int
    ) -> None:
        raw = data.pop("workspace_id", None)
        if raw is None:
            return
        try:
            body_ws = int(raw)
        except (TypeError, ValueError) as exc:
            raise ValueError("workspace_id in body must be a valid integer or omitted") from exc
        if body_ws != workspace_id:
            raise ValueError(
                "workspace_id in request body must match X-Workspace-Id, or omit workspace_id"
            )

    async def create(
        self,
        data: Dict[str, Any],
        *,
        user_id: str,
        workspace_id: int,
    ) -> Os_clients:
        payload = dict(data)
        await self._enforce_workspace_body(payload, workspace_id)

        business_name = (payload.get("business_name") or "").strip()
        if not business_name:
            raise ValueError("business_name is required")

        contact_email = _normalize_email(payload.get("contact_email"))
        self._validate_email(contact_email)

        now = _utcnow()
        obj = Os_clients(
            id=str(uuid.uuid4()),
            workspace_id=workspace_id,
            created_by_user_id=user_id,
            business_name=business_name,
            sector=payload.get("sector"),
            country=payload.get("country"),
            city=payload.get("city"),
            status=self._validate_status(payload.get("status")),
            contact_email=contact_email,
            contact_name=payload.get("contact_name"),
            website_url=payload.get("website_url"),
            ideal_customer=payload.get("ideal_customer"),
            value_proposition=payload.get("value_proposition"),
            differentiator=payload.get("differentiator"),
            services=payload.get("services"),
            objectives=payload.get("objectives"),
            brand_tone=payload.get("brand_tone"),
            visual_style=payload.get("visual_style"),
            brand_colors=payload.get("brand_colors"),
            logo_url=payload.get("logo_url"),
            competition=payload.get("competition"),
            testimonials=payload.get("testimonials"),
            case_studies=payload.get("case_studies"),
            budget=payload.get("budget"),
            language=payload.get("language"),
            market=payload.get("market"),
            client_metadata=payload.get("metadata") or {},
            created_at=now,
            updated_at=now,
        )
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        logger.info("Created os_clients id=%s workspace=%s", obj.id, workspace_id)
        return obj

    async def get_by_id(self, client_id: str, *, workspace_id: int) -> Optional[Os_clients]:
        try:
            uuid.UUID(str(client_id))
        except ValueError:
            return None
        q = select(Os_clients).where(
            Os_clients.id == str(client_id),
            Os_clients.workspace_id == workspace_id,
        )
        result = await self.db.execute(q)
        return result.scalar_one_or_none()

    async def list_clients(
        self,
        *,
        workspace_id: int,
        skip: int = 0,
        limit: int = 20,
        q: Optional[str] = None,
        status: Optional[str] = None,
        sector: Optional[str] = None,
    ) -> Dict[str, Any]:
        base = select(Os_clients).where(Os_clients.workspace_id == workspace_id)
        count_q = select(func.count(Os_clients.id)).where(Os_clients.workspace_id == workspace_id)

        if status:
            st = status.strip().lower()
            if st not in VALID_STATUSES:
                raise ValueError(f"status filter must be one of: {', '.join(sorted(VALID_STATUSES))}")
            base = base.where(Os_clients.status == st)
            count_q = count_q.where(Os_clients.status == st)

        if sector:
            sec = sector.strip()
            base = base.where(Os_clients.sector == sec)
            count_q = count_q.where(Os_clients.sector == sec)

        if q:
            term = f"%{q.strip().lower()}%"
            search_clause = or_(
                func.lower(Os_clients.business_name).like(term),
                func.lower(func.coalesce(Os_clients.contact_email, "")).like(term),
                func.lower(func.coalesce(Os_clients.contact_name, "")).like(term),
            )
            base = base.where(search_clause)
            count_q = count_q.where(search_clause)

        total_result = await self.db.execute(count_q)
        total = int(total_result.scalar() or 0)

        rows_result = await self.db.execute(
            base.order_by(Os_clients.created_at.desc(), Os_clients.business_name.asc())
            .offset(skip)
            .limit(limit)
        )
        items: List[Os_clients] = list(rows_result.scalars().all())
        return {"items": items, "total": total, "skip": skip, "limit": limit}

    async def update(
        self,
        client_id: str,
        update_data: Dict[str, Any],
        *,
        workspace_id: int,
    ) -> Optional[Os_clients]:
        obj = await self.get_by_id(client_id, workspace_id=workspace_id)
        if not obj:
            return None

        payload = dict(update_data)
        await self._enforce_workspace_body(payload, workspace_id)

        if "business_name" in payload:
            name = (payload["business_name"] or "").strip()
            if not name:
                raise ValueError("business_name cannot be empty")
            obj.business_name = name

        if "contact_email" in payload:
            email = _normalize_email(payload["contact_email"])
            self._validate_email(email)
            obj.contact_email = email

        if "status" in payload and payload["status"] is not None:
            obj.status = self._validate_status(payload["status"])

        simple_fields = (
            "sector",
            "country",
            "city",
            "contact_name",
            "website_url",
            "ideal_customer",
            "value_proposition",
            "differentiator",
            "services",
            "objectives",
            "brand_tone",
            "visual_style",
            "brand_colors",
            "logo_url",
            "competition",
            "testimonials",
            "case_studies",
            "budget",
            "language",
            "market",
        )
        for field in simple_fields:
            if field in payload:
                setattr(obj, field, payload[field])

        if "metadata" in payload and payload["metadata"] is not None:
            obj.client_metadata = payload["metadata"]

        obj.updated_at = _utcnow()
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def delete(self, client_id: str, *, workspace_id: int) -> bool:
        """Soft-delete: status → archived."""
        obj = await self.get_by_id(client_id, workspace_id=workspace_id)
        if not obj:
            return False
        obj.status = "archived"
        obj.updated_at = _utcnow()
        await self.db.commit()
        return True
