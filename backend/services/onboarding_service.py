"""Automated workspace onboarding — setup, checklist, progress."""

from __future__ import annotations

import json
import logging
import re
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import db_manager
from services.crm_service import CRMService
from services.reports_service import default_date_range, get_reports_service
from services.ses_service import get_ses_service
from services.workspaces import WorkspacesService

logger = logging.getLogger(__name__)

_SCHEMA_READY = False
_SYSTEM_USER = "__onboarding__"

AUTO_CHECKLIST_STEPS = (
    "demo_contact",
    "demo_deal",
    "welcome_campaign",
    "initial_report",
    "welcome_email",
)


def _slugify(name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:48]
    return base or "workspace"


class OnboardingService:
    """Workspace onboarding automation."""

    def __init__(self, session: AsyncSession, workspace_id: int | None = None):
        self.session = session
        self.workspace_id = int(workspace_id) if workspace_id is not None else None

    @staticmethod
    async def ensure_schema() -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        if not db_manager.async_session_maker:
            await db_manager.ensure_initialized()
        sql_path = Path(__file__).resolve().parent.parent / "migrations" / "onboarding.sql"
        if sql_path.exists():
            raw = sql_path.read_text(encoding="utf-8")
            statements = [s.strip() for s in raw.split(";") if s.strip()]
            async with db_manager.async_session_maker() as session:
                for stmt in statements:
                    try:
                        await session.execute(text(stmt))
                    except Exception as exc:
                        if "already exists" not in str(exc).lower():
                            logger.debug("onboarding schema stmt skipped: %s", exc)
                await session.commit()
        _SCHEMA_READY = True

    async def create_workspace_complete(
        self,
        *,
        name: str,
        plan: str = "free",
        language: str = "es",
        currency: str = "EUR",
        timezone: str = "Europe/Madrid",
        owner_email: str,
        owner_user_id: str | None = None,
    ) -> dict[str, Any]:
        """Create workspace with initial configuration and seed onboarding row."""
        await self.ensure_schema()

        user_id = owner_user_id
        if not user_id:
            r = await self.session.execute(
                text("SELECT id FROM users WHERE lower(email) = :email LIMIT 1"),
                {"email": owner_email.strip().lower()},
            )
            row = r.fetchone()
            if row:
                user_id = str(row._mapping["id"])
            else:
                user_id = f"email:{owner_email.strip().lower()}"

        features = json.dumps({"currency": currency.upper(), "onboarding": "pending"})
        ws_svc = WorkspacesService(self.session)
        ws = await ws_svc.create(
            {
                "name": name.strip(),
                "slug": f"{_slugify(name)}-{uuid.uuid4().hex[:6]}",
                "plan": (plan or "free").lower(),
                "status": "active",
                "locale": language,
                "timezone": timezone,
                "features_json": features,
            },
            user_id=user_id,
        )
        if not ws:
            raise RuntimeError("Failed to create workspace")

        workspace_id = int(ws.id)
        self.workspace_id = workspace_id

        for step in AUTO_CHECKLIST_STEPS:
            await self._upsert_step(workspace_id, step, completed=False)

        await self.session.commit()
        return {
            "workspace_id": workspace_id,
            "name": ws.name,
            "plan": ws.plan,
            "language": language,
            "currency": currency.upper(),
            "timezone": timezone,
            "owner_email": owner_email,
            "owner_user_id": user_id,
        }

    async def run_onboarding_checklist(self, workspace_id: int) -> dict[str, Any]:
        """Execute automated onboarding checklist for a workspace."""
        await self.ensure_schema()
        self.workspace_id = int(workspace_id)
        await CRMService.ensure_db()

        ws_row = await self._get_workspace(workspace_id)
        if not ws_row:
            raise ValueError("Workspace not found")

        owner_id = str(ws_row.get("user_id") or _SYSTEM_USER)
        currency = "EUR"
        try:
            feats = json.loads(ws_row.get("features_json") or "{}")
            currency = feats.get("currency", "EUR")
        except json.JSONDecodeError:
            pass

        results: dict[str, Any] = {}

        # 1. Demo contact
        crm = CRMService(self.session, workspace_id)
        contact = await crm.create_contact(
            name="Contacto Demo NELVYON",
            email=f"demo+{workspace_id}@nelvyon.app",
            phone="+34 600 000 000",
            company="Empresa Demo",
            status="active",
            tags=["onboarding", "demo"],
            metadata={"source": "onboarding"},
        )
        results["demo_contact"] = contact
        await self.complete_onboarding_step(workspace_id, "demo_contact")

        contact_id = str(contact.get("id"))

        # 2. Demo deal
        deal = await crm.create_deal(
            contact_id=contact_id,
            title="Oportunidad Demo — Plan Pro",
            value=14900.0,
            currency=currency,
            stage="qualified",
            notes="Deal de ejemplo generado durante el onboarding automático.",
        )
        results["demo_deal"] = deal
        await self.complete_onboarding_step(workspace_id, "demo_deal")

        # 3. Welcome campaign
        now = datetime.now(timezone.utc)
        camp = await self.session.execute(
            text(
                """
                INSERT INTO campaigns (
                    user_id, workspace_id, name, type, status, subject, content,
                    recipients_count, created_at
                )
                VALUES (
                    :uid, :ws, :name, 'email', 'draft',
                    :subject, :content, 1, :now
                )
                RETURNING id, name, status
                """
            ),
            {
                "uid": owner_id,
                "ws": workspace_id,
                "name": "Bienvenida NELVYON",
                "subject": "¡Bienvenido a NELVYON!",
                "content": (
                    "<p>Tu workspace está listo. Explora CRM, campañas y reportes "
                    "desde el dashboard.</p>"
                ),
                "now": now,
            },
        )
        results["welcome_campaign"] = dict(camp.fetchone()._mapping)
        await self.complete_onboarding_step(workspace_id, "welcome_campaign")

        # 4. Initial empty report skeleton
        start, end = default_date_range(7)
        reports = get_reports_service(self.session, workspace_id)
        empty_report = {
            "report_type": "onboarding",
            "workspace_id": workspace_id,
            "period": {"start_date": start, "end_date": end},
            "seo": None,
            "analytics": None,
            "crm": {"note": "Reporte inicial — conecta integraciones para datos reales"},
            "onboarding": True,
        }
        try:
            persisted = await reports._persist_report(empty_report, "onboarding")
            results["initial_report"] = {"report_id": persisted.get("report_id")}
        except Exception as exc:
            logger.warning("initial report persist skipped: %s", exc)
            results["initial_report"] = {"status": "skipped", "error": str(exc)}
        await self.complete_onboarding_step(workspace_id, "initial_report")

        # 5. Welcome email via SES
        to_email = ws_row.get("billing_email")
        if not to_email:
            r = await self.session.execute(
                text("SELECT email FROM users WHERE id = :uid LIMIT 1"),
                {"uid": owner_id},
            )
            u = r.fetchone()
            to_email = u._mapping["email"] if u else None

        email_result: dict[str, Any] = {"sent": False}
        if to_email:
            ses = get_ses_service()
            html = (
                f"<h1>Bienvenido a NELVYON</h1>"
                f"<p>Tu workspace <strong>{ws_row.get('name')}</strong> está configurado.</p>"
                f"<p>Contacto demo, deal de ejemplo y campaña de bienvenida creados.</p>"
            )
            try:
                email_result = await ses.send_email(
                    str(to_email),
                    "Bienvenido a NELVYON — tu workspace está listo",
                    html,
                )
                email_result["sent"] = True
            except Exception as exc:
                email_result = {"sent": False, "error": str(exc), "mock": ses.is_mock}
        results["welcome_email"] = email_result
        await self.complete_onboarding_step(workspace_id, "welcome_email")

        progress = await self.get_onboarding_progress(workspace_id)
        return {
            "workspace_id": workspace_id,
            "checklist_results": results,
            "progress": progress,
        }

    async def get_onboarding_progress(self, workspace_id: int) -> dict[str, Any]:
        await self.ensure_schema()
        r = await self.session.execute(
            text(
                """
                SELECT step, completed, completed_at
                FROM onboarding_workspace_steps
                WHERE workspace_id = :ws
                ORDER BY step
                """
            ),
            {"ws": workspace_id},
        )
        rows = {row._mapping["step"]: dict(row._mapping) for row in r.fetchall()}
        steps_out = []
        completed = 0
        for step in AUTO_CHECKLIST_STEPS:
            row = rows.get(step, {})
            done = bool(row.get("completed"))
            if done:
                completed += 1
            steps_out.append(
                {
                    "step": step,
                    "completed": done,
                    "completed_at": (
                        row["completed_at"].isoformat()
                        if row.get("completed_at")
                        else None
                    ),
                }
            )
        total = len(AUTO_CHECKLIST_STEPS)
        pct = round((completed / total) * 100) if total else 0
        return {
            "workspace_id": workspace_id,
            "steps": steps_out,
            "completed_count": completed,
            "total_count": total,
            "progress_percent": pct,
            "is_complete": completed >= total,
        }

    async def complete_onboarding_step(
        self, workspace_id: int, step: str
    ) -> dict[str, Any]:
        if step not in AUTO_CHECKLIST_STEPS:
            raise ValueError(f"Invalid onboarding step: {step}")
        await self.ensure_schema()
        now = datetime.now(timezone.utc)
        await self._upsert_step(workspace_id, step, completed=True, completed_at=now)
        await self.session.commit()
        return await self.get_onboarding_progress(workspace_id)

    async def _upsert_step(
        self,
        workspace_id: int,
        step: str,
        *,
        completed: bool,
        completed_at: datetime | None = None,
    ) -> None:
        await self.session.execute(
            text(
                """
                INSERT INTO onboarding_workspace_steps (
                    workspace_id, step, completed, completed_at
                )
                VALUES (:ws, :step, :completed, :completed_at)
                ON CONFLICT (workspace_id, step)
                DO UPDATE SET
                    completed = EXCLUDED.completed,
                    completed_at = COALESCE(EXCLUDED.completed_at, onboarding_workspace_steps.completed_at)
                """
            ),
            {
                "ws": workspace_id,
                "step": step,
                "completed": completed,
                "completed_at": completed_at,
            },
        )

    async def _get_workspace(self, workspace_id: int) -> dict[str, Any] | None:
        r = await self.session.execute(
            text(
                """
                SELECT id, user_id, name, plan, status, locale, timezone,
                       billing_email, features_json
                FROM workspaces WHERE id = :id
                """
            ),
            {"id": workspace_id},
        )
        row = r.fetchone()
        return dict(row._mapping) if row else None


def get_onboarding_service(session: AsyncSession, workspace_id: int | None = None) -> OnboardingService:
    return OnboardingService(session, workspace_id)
