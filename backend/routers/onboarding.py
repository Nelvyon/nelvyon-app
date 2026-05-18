"""
Onboarding Router — Guided setup wizard and activation tracking for NELVYON.
Tracks onboarding progress per workspace, seeds demo data, and manages checklist state.
"""
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/onboarding", tags=["onboarding"])

# ── Onboarding Steps Definition ──

ONBOARDING_STEPS = [
    {
        "key": "profile",
        "title": "Configura tu perfil",
        "description": "Añade tu nombre, foto y datos de contacto",
        "icon": "user",
        "order": 1,
        "category": "setup",
    },
    {
        "key": "workspace",
        "title": "Configura tu workspace",
        "description": "Nombre de empresa, logo, zona horaria e idioma",
        "icon": "building",
        "order": 2,
        "category": "setup",
    },
    {
        "key": "first_contact",
        "title": "Crea tu primer contacto",
        "description": "Añade un contacto al CRM para empezar",
        "icon": "user-plus",
        "order": 3,
        "category": "activation",
    },
    {
        "key": "first_deal",
        "title": "Crea tu primer deal",
        "description": "Abre un deal en el pipeline para trackear oportunidades",
        "icon": "target",
        "order": 4,
        "category": "activation",
    },
    {
        "key": "first_campaign",
        "title": "Lanza tu primera campaña",
        "description": "Crea una campaña de email o social media",
        "icon": "megaphone",
        "order": 5,
        "category": "activation",
    },
    {
        "key": "invite_team",
        "title": "Invita a tu equipo",
        "description": "Añade miembros a tu workspace para colaborar",
        "icon": "users",
        "order": 6,
        "category": "team",
    },
    {
        "key": "connect_integration",
        "title": "Conecta una integración",
        "description": "Conecta Stripe, Google, Meta u otra herramienta",
        "icon": "plug",
        "order": 7,
        "category": "integrations",
    },
    {
        "key": "explore_dashboard",
        "title": "Explora el dashboard",
        "description": "Revisa tus métricas y KPIs en el dashboard principal",
        "icon": "bar-chart",
        "order": 8,
        "category": "explore",
    },
]


# ── Schemas ──

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


# onboarding_progress: modelo `models.onboarding_progress` + migración Alembic pr03.


async def _ensure_table(db: AsyncSession):
    """No-op: tabla creada vía metadata SQLAlchemy."""
    return


# ── Get Progress ──

@router.get("/progress", response_model=OnboardingProgressResponse)
async def get_onboarding_progress(
    ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get the current onboarding progress for the workspace."""
    await _ensure_table(db)

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
            key=step_def["key"],
            title=step_def["title"],
            description=step_def["description"],
            icon=step_def["icon"],
            order=step_def["order"],
            category=step_def["category"],
            completed=is_completed,
            completed_at=str(progress["completed_at"]) if progress and progress.get("completed_at") else None,
        ))

    total = len(ONBOARDING_STEPS)
    return OnboardingProgressResponse(
        workspace_id=ctx.workspace_id,
        user_id=ctx.user_id,
        steps=steps,
        completed_count=completed_count,
        total_count=total,
        progress_percent=round((completed_count / total) * 100) if total > 0 else 0,
        is_complete=completed_count >= total,
    )


# ── Complete Step ──

@router.post("/complete-step", response_model=OnboardingStepStatus)
async def complete_onboarding_step(
    data: CompleteStepRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Mark an onboarding step as completed."""
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
            DO UPDATE SET completed = TRUE, completed_at = :now, data_json = COALESCE(:data, onboarding_progress.data_json)
        """),
        {
            "ws_id": ctx.workspace_id,
            "uid": ctx.user_id,
            "key": data.step_key,
            "now": now,
            "data": data_json,
        },
    )
    await db.commit()

    step_def = next(s for s in ONBOARDING_STEPS if s["key"] == data.step_key)
    return OnboardingStepStatus(
        key=step_def["key"],
        title=step_def["title"],
        description=step_def["description"],
        icon=step_def["icon"],
        order=step_def["order"],
        category=step_def["category"],
        completed=True,
        completed_at=now.isoformat(),
    )


# ── Reset Progress ──

@router.post("/reset")
async def reset_onboarding(
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Reset onboarding progress for the workspace."""
    await db.execute(
        text("DELETE FROM onboarding_progress WHERE workspace_id = :ws_id AND user_id = :uid"),
        {"ws_id": ctx.workspace_id, "uid": ctx.user_id},
    )
    await db.commit()

    return {"message": "Onboarding progress reset", "workspace_id": ctx.workspace_id}


# ── Seed Demo Data ──

_DEMO_CONTACT_EMAILS_SQL = (
    "'maria@ejemplo.com', 'carlos@ejemplo.com', 'ana@ejemplo.com', "
    "'pedro@ejemplo.com', 'laura@ejemplo.com'"
)
_DEMO_CAMPAIGN_NAMES_SQL = (
    "'Newsletter Abril 2026', 'Promo Primavera', 'Lanzamiento Producto'"
)


@router.post("/seed-demo")
async def seed_demo_data(
    data: SeedDemoDataRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Seed demo data for the workspace to help users explore features."""
    ws_id = ctx.workspace_id
    uid = ctx.user_id
    now = datetime.now(timezone.utc)
    seeded: Dict[str, int] = {}

    try:
        if "contacts" in data.modules:
            await db.execute(
                text(
                    "DELETE FROM contacts WHERE workspace_id = :ws_id AND source = 'demo'"
                ),
                {"ws_id": ws_id},
            )
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
                        INSERT INTO contacts (
                            user_id, workspace_id, first_name, last_name, email, phone,
                            status, source, created_at, updated_at
                        )
                        VALUES (
                            :uid, :ws_id, :first_name, :last_name, :email, :phone,
                            :status, 'demo', :now, :now
                        )
                    """),
                    {
                        "uid": uid,
                        "ws_id": ws_id,
                        "first_name": first,
                        "last_name": last,
                        "email": email,
                        "phone": phone,
                        "status": status,
                        "now": now,
                    },
                )
                n += 1
            seeded["contacts"] = n

        contact_ids: Dict[str, int] = {}
        if "contacts" in data.modules or "deals" in data.modules:
            res_ids = await db.execute(
                text(
                    f"""
                    SELECT id, email FROM contacts
                    WHERE workspace_id = :ws_id
                      AND email IN ({_DEMO_CONTACT_EMAILS_SQL})
                    """
                ),
                {"ws_id": ws_id},
            )
            for row in res_ids.mappings().all():
                contact_ids[str(row["email"])] = int(row["id"])

        if "deals" in data.modules:
            await db.execute(
                text("DELETE FROM deals WHERE workspace_id = :ws_id AND tags = 'demo'"),
                {"ws_id": ws_id},
            )
            demo_deals = [
                ("Proyecto Web Corporativa", 15000.0, "proposal", "maria@ejemplo.com"),
                ("App Móvil E-commerce", 25000.0, "negotiation", "carlos@ejemplo.com"),
                ("Campaña Marketing Digital", 8000.0, "qualified", "ana@ejemplo.com"),
                ("Rediseño de Marca", 12000.0, "closed_won", "pedro@ejemplo.com"),
                ("Consultoría SEO", 5000.0, "proposal", "laura@ejemplo.com"),
            ]
            n = 0
            for title, value, stage, contact_email in demo_deals:
                cid = contact_ids.get(contact_email)
                await db.execute(
                    text("""
                        INSERT INTO deals (
                            user_id, workspace_id, contact_id, title, value, currency, stage,
                            pipeline, tags, created_at, updated_at
                        )
                        VALUES (
                            :uid, :ws_id, :contact_id, :title, :value, 'EUR', :stage,
                            'default', 'demo', :now, :now
                        )
                    """),
                    {
                        "uid": uid,
                        "ws_id": ws_id,
                        "contact_id": cid,
                        "title": title,
                        "value": value,
                        "stage": stage,
                        "now": now,
                    },
                )
                n += 1
            seeded["deals"] = n

        if "campaigns" in data.modules:
            await db.execute(
                text(
                    f"""
                    DELETE FROM campaigns
                    WHERE workspace_id = :ws_id
                      AND name IN ({_DEMO_CAMPAIGN_NAMES_SQL})
                    """
                ),
                {"ws_id": ws_id},
            )
            demo_campaigns = [
                ("Newsletter Abril 2026", "email", "active", 1250),
                ("Promo Primavera", "email", "draft", 0),
                ("Lanzamiento Producto", "social", "active", 3400),
            ]
            n = 0
            for name, ctype, status, recipients in demo_campaigns:
                await db.execute(
                    text("""
                        INSERT INTO campaigns (
                            user_id, workspace_id, name, type, status,
                            recipients_count, created_at
                        )
                        VALUES (
                            :uid, :ws_id, :name, :type, :status, :recipients, :now
                        )
                    """),
                    {
                        "uid": uid,
                        "ws_id": ws_id,
                        "name": name,
                        "type": ctype,
                        "status": status,
                        "recipients": recipients,
                        "now": now,
                    },
                )
                n += 1
            seeded["campaigns"] = n

        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.exception("seed_demo_data failed for workspace_id=%s", ws_id)
        raise HTTPException(
            status_code=500,
            detail=f"No se pudo completar el seed de datos demo: {e!s}",
        ) from e

    return {
        "message": "Demo data seeded successfully",
        "seeded": seeded,
        "workspace_id": ws_id,
    }


# ── Get Steps Definition ──

@router.get("/steps")
async def get_onboarding_steps(
    _ctx: WorkspaceContext = Depends(require_workspace),
):
    """Get the onboarding steps definition (requiere workspace activo)."""
    return {"steps": ONBOARDING_STEPS}