"""
Onboarding API — automated workspace setup + legacy wizard (v1 via admin_router).
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from core.secrets import sanitize_text
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from schemas.auth import UserResponse
from services.onboarding_service import AUTO_CHECKLIST_STEPS, get_onboarding_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])
admin_router = APIRouter(prefix="/api/v1/onboarding", tags=["onboarding-legacy"])


# ── New automated onboarding ──


class StartOnboardingBody(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    plan: str = Field("free")
    language: str = Field("es")
    currency: str = Field("EUR", min_length=3, max_length=3)
    timezone: str = Field("Europe/Madrid")
    owner_email: EmailStr
    run_checklist: bool = Field(True)


@router.post("/start")
async def start_onboarding(
    body: StartOnboardingBody,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create workspace with full initial config and optional automated checklist."""
    svc = get_onboarding_service(db)
    try:
        created = await svc.create_workspace_complete(
            name=body.name,
            plan=body.plan,
            language=body.language,
            currency=body.currency,
            timezone=body.timezone,
            owner_email=str(body.owner_email),
            owner_user_id=str(current_user.id),
        )
        checklist = None
        if body.run_checklist:
            checklist = await svc.run_onboarding_checklist(created["workspace_id"])
        return {
            "workspace": created,
            "checklist": checklist,
        }
    except Exception as exc:
        logger.error("start_onboarding: %s", sanitize_text(str(exc)), exc_info=True)
        raise HTTPException(status_code=500, detail="Onboarding start failed") from exc


@router.get("/progress")
async def get_progress(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Automated onboarding checklist progress for the workspace."""
    svc = get_onboarding_service(db, ws.workspace_id)
    return await svc.get_onboarding_progress(int(ws.workspace_id))


@router.post("/step/{step}")
async def complete_step(
    step: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Mark an automated onboarding step as completed."""
    svc = get_onboarding_service(db, ws.workspace_id)
    try:
        return await svc.complete_onboarding_step(int(ws.workspace_id), step)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/run-checklist")
async def run_checklist(
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Run full automated onboarding checklist on existing workspace."""
    svc = get_onboarding_service(db, ws.workspace_id)
    try:
        return await svc.run_onboarding_checklist(int(ws.workspace_id))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("run_checklist: %s", sanitize_text(str(exc)), exc_info=True)
        raise HTTPException(status_code=500, detail="Checklist execution failed") from exc


@router.get("/steps")
async def list_automated_steps(
    _ws: WorkspaceContext = Depends(require_workspace),
):
    return {"steps": list(AUTO_CHECKLIST_STEPS)}


# ── Legacy wizard (v1) — backward compatible ──

ONBOARDING_STEPS = [
    {"key": "profile", "title": "Configura tu perfil", "description": "Añade tu nombre, foto y datos de contacto", "icon": "user", "order": 1, "category": "setup"},
    {"key": "workspace", "title": "Configura tu workspace", "description": "Nombre de empresa, logo, zona horaria e idioma", "icon": "building", "order": 2, "category": "setup"},
    {"key": "first_contact", "title": "Crea tu primer contacto", "description": "Añade un contacto al CRM para empezar", "icon": "user-plus", "order": 3, "category": "activation"},
    {"key": "first_deal", "title": "Crea tu primer deal", "description": "Abre un deal en el pipeline para trackear oportunidades", "icon": "target", "order": 4, "category": "activation"},
    {"key": "first_campaign", "title": "Lanza tu primera campaña", "description": "Crea una campaña de email o social media", "icon": "megaphone", "order": 5, "category": "activation"},
    {"key": "invite_team", "title": "Invita a tu equipo", "description": "Añade miembros a tu workspace para colaborar", "icon": "users", "order": 6, "category": "team"},
    {"key": "connect_integration", "title": "Conecta una integración", "description": "Conecta Stripe, Google, Meta u otra herramienta", "icon": "plug", "order": 7, "category": "integrations"},
    {"key": "explore_dashboard", "title": "Explora el dashboard", "description": "Revisa tus métricas y KPIs en el dashboard principal", "icon": "bar-chart", "order": 8, "category": "explore"},
]


class OnboardingStepStatus(BaseModel):
    key: str
    title: str
    description: str
    icon: str
    order: int
    category: str
    completed: bool = False
    completed_at: Optional[str] = None


class OnboardingProgressResponse(BaseModel):
    workspace_id: int
    user_id: str
    steps: List[OnboardingStepStatus]
    completed_count: int
    total_count: int
    progress_percent: int
    is_complete: bool


class CompleteStepRequest(BaseModel):
    step_key: str
    data: Optional[Dict[str, Any]] = None


class SeedDemoDataRequest(BaseModel):
    modules: List[str] = ["contacts", "deals", "campaigns"]


_DEMO_CONTACT_EMAILS_SQL = (
    "'maria@ejemplo.com', 'carlos@ejemplo.com', 'ana@ejemplo.com', "
    "'pedro@ejemplo.com', 'laura@ejemplo.com'"
)
_DEMO_CAMPAIGN_NAMES_SQL = "'Newsletter Abril 2026', 'Promo Primavera', 'Lanzamiento Producto'"


@admin_router.get("/progress", response_model=OnboardingProgressResponse)
async def get_onboarding_progress_legacy(
    ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("""
            SELECT step_key, completed, completed_at
            FROM onboarding_progress
            WHERE workspace_id = :ws_id AND user_id = :uid
        """),
        {"ws_id": ctx.workspace_id, "uid": ctx.user_id},
    )
    completed_map = {r["step_key"]: r for r in result.mappings().all()}
    steps = []
    completed_count = 0
    for step_def in ONBOARDING_STEPS:
        progress = completed_map.get(step_def["key"])
        is_completed = bool(progress and progress.get("completed"))
        if is_completed:
            completed_count += 1
        steps.append(OnboardingStepStatus(
            key=step_def["key"], title=step_def["title"], description=step_def["description"],
            icon=step_def["icon"], order=step_def["order"], category=step_def["category"],
            completed=is_completed,
            completed_at=str(progress["completed_at"]) if progress and progress.get("completed_at") else None,
        ))
    total = len(ONBOARDING_STEPS)
    return OnboardingProgressResponse(
        workspace_id=ctx.workspace_id, user_id=ctx.user_id, steps=steps,
        completed_count=completed_count, total_count=total,
        progress_percent=round((completed_count / total) * 100) if total > 0 else 0,
        is_complete=completed_count >= total,
    )


@admin_router.post("/complete-step", response_model=OnboardingStepStatus)
async def complete_onboarding_step_legacy(
    data: CompleteStepRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    valid_keys = {s["key"] for s in ONBOARDING_STEPS}
    if data.step_key not in valid_keys:
        raise HTTPException(status_code=400, detail=f"Invalid step: {data.step_key}")
    now = datetime.now(timezone.utc)
    data_json = json.dumps(data.data) if data.data else None
    await db.execute(
        text("""
            INSERT INTO onboarding_progress (workspace_id, user_id, step_key, completed, completed_at, data_json)
            VALUES (:ws_id, :uid, :key, TRUE, :now, :data)
            ON CONFLICT (workspace_id, user_id, step_key)
            DO UPDATE SET completed = TRUE, completed_at = :now,
                data_json = COALESCE(:data, onboarding_progress.data_json)
        """),
        {"ws_id": ctx.workspace_id, "uid": ctx.user_id, "key": data.step_key, "now": now, "data": data_json},
    )
    await db.commit()
    step_def = next(s for s in ONBOARDING_STEPS if s["key"] == data.step_key)
    return OnboardingStepStatus(
        key=step_def["key"], title=step_def["title"], description=step_def["description"],
        icon=step_def["icon"], order=step_def["order"], category=step_def["category"],
        completed=True, completed_at=now.isoformat(),
    )


@admin_router.post("/reset")
async def reset_onboarding_legacy(
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        text("DELETE FROM onboarding_progress WHERE workspace_id = :ws_id AND user_id = :uid"),
        {"ws_id": ctx.workspace_id, "uid": ctx.user_id},
    )
    await db.commit()
    return {"message": "Onboarding progress reset", "workspace_id": ctx.workspace_id}


@admin_router.get("/steps")
async def get_onboarding_steps_legacy(_ctx: WorkspaceContext = Depends(require_workspace)):
    return {"steps": ONBOARDING_STEPS}


@admin_router.post("/seed-demo")
async def seed_demo_data_legacy(
    data: SeedDemoDataRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    ws_id = ctx.workspace_id
    uid = ctx.user_id
    now = datetime.now(timezone.utc)
    seeded: Dict[str, int] = {}
    try:
        if "contacts" in data.modules:
            await db.execute(text("DELETE FROM contacts WHERE workspace_id = :ws_id AND source = 'demo'"), {"ws_id": ws_id})
            demo_rows = [
                ("María", "García", "maria@ejemplo.com", "+34 612 345 678", "lead"),
                ("Carlos", "López", "carlos@ejemplo.com", "+34 623 456 789", "customer"),
                ("Ana", "Martínez", "ana@ejemplo.com", "+34 634 567 890", "lead"),
                ("Pedro", "Sánchez", "pedro@ejemplo.com", "+34 645 678 901", "prospect"),
                ("Laura", "Fernández", "laura@ejemplo.com", "+34 656 789 012", "customer"),
            ]
            n = 0
            for first, last, email, phone, status in demo_rows:
                await db.execute(
                    text("""
                        INSERT INTO contacts (user_id, workspace_id, first_name, last_name, email, phone, status, source, created_at, updated_at)
                        VALUES (:uid, :ws_id, :first_name, :last_name, :email, :phone, :status, 'demo', :now, :now)
                    """),
                    {"uid": uid, "ws_id": ws_id, "first_name": first, "last_name": last, "email": email, "phone": phone, "status": status, "now": now},
                )
                n += 1
            seeded["contacts"] = n
        if "campaigns" in data.modules:
            await db.execute(
                text(f"DELETE FROM campaigns WHERE workspace_id = :ws_id AND name IN ({_DEMO_CAMPAIGN_NAMES_SQL})"),
                {"ws_id": ws_id},
            )
            n = 0
            for name, ctype, status, recipients in [
                ("Newsletter Abril 2026", "email", "active", 1250),
                ("Promo Primavera", "email", "draft", 0),
                ("Lanzamiento Producto", "social", "active", 3400),
            ]:
                await db.execute(
                    text("""
                        INSERT INTO campaigns (user_id, workspace_id, name, type, status, recipients_count, created_at)
                        VALUES (:uid, :ws_id, :name, :type, :status, :recipients, :now)
                    """),
                    {"uid": uid, "ws_id": ws_id, "name": name, "type": ctype, "status": status, "recipients": recipients, "now": now},
                )
                n += 1
            seeded["campaigns"] = n
        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.exception("seed_demo_data failed for workspace_id=%s", ws_id)
        raise HTTPException(status_code=500, detail=f"No se pudo completar el seed de datos demo: {e!s}") from e
    return {"message": "Demo data seeded successfully", "seeded": seeded, "workspace_id": ws_id}
