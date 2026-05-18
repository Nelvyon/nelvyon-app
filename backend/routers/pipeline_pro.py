"""
Pipeline Pro — stats, actividades por deal y cambio de etapa (workspace estricto).

Misma semántica de deals.stage que dashboard_metrics / core.deal_stages.
Requiere X-Workspace-Id (require_workspace).
"""
import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select, func, cast, Float
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.quota_guards import (
    enforce_contacts_plan_module_for_crm_writes,
    enforce_workflow_engine_trigger_execute_allowed,
)
from core.deal_stages import (
    CANONICAL_DEAL_STAGES,
    SQL_WON_STAGE_VALUES,
    is_valid_canonical_stage_for_write,
)
from models.deals import Deals
from models.activities import Activities
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.workflow_engine import WorkflowEngineService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/pipeline", tags=["pipeline-pro"])

# Etiquetas UI (canónicos + legacy solo para títulos de actividad)
STAGE_LABELS = {
    "lead": "Lead Nuevo",
    "qualified": "Calificado",
    "proposal": "Propuesta",
    "negotiation": "Negociación",
    "closed_won": "Ganado ✓",
    "closed_lost": "Perdido",
    "won": "Ganado (legacy)",
    "closed": "Ganado (legacy)",
    "lost": "Perdido (legacy)",
}


# ---------- Schemas ----------
class StageStats(BaseModel):
    stage: str
    count: int
    total_value: float
    weighted_value: float
    avg_days_in_stage: float


class PipelineStatsResponse(BaseModel):
    stages: List[StageStats]
    total_deals: int
    total_value: float
    weighted_value: float
    win_rate: float


class DealActivityCreate(BaseModel):
    type: str  # call, email, meeting, task, note
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    is_completed: Optional[bool] = False
    contact_id: Optional[int] = None


class DealActivityResponse(BaseModel):
    id: int
    user_id: str
    deal_id: Optional[int] = None
    contact_id: Optional[int] = None
    type: str
    title: str
    description: Optional[str] = None
    is_completed: Optional[bool] = None
    due_date: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class DealActivityListResponse(BaseModel):
    items: List[DealActivityResponse]
    total: int


class StageChangeRequest(BaseModel):
    new_stage: str
    notes: Optional[str] = None


class StageChangeResponse(BaseModel):
    deal_id: int
    old_stage: str
    new_stage: str
    activity_id: int
    message: str


def _deal_scope(ws_ctx: WorkspaceContext):
    """Filtro estricto user + workspace (siempre con workspace resuelto)."""
    return [
        Deals.user_id == ws_ctx.user_id,
        Deals.workspace_id == ws_ctx.workspace_id,
    ]


def _activity_scope(ws_ctx: WorkspaceContext):
    return [
        Activities.user_id == ws_ctx.user_id,
        Activities.workspace_id == ws_ctx.workspace_id,
    ]


# ---------- Pipeline Stats ----------
@router.get("/stats", response_model=PipelineStatsResponse)
async def get_pipeline_stats(
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Estadísticas por etapa; win_rate = ganados / total deals (igual que dashboard metrics)."""
    try:
        base_filter = _deal_scope(ws_ctx)

        stage_query = (
            select(
                Deals.stage,
                func.count(Deals.id).label("count"),
                func.coalesce(func.sum(Deals.value), 0).label("total_value"),
                func.coalesce(
                    func.sum(Deals.value * cast(func.coalesce(Deals.probability, 0), Float) / 100.0), 0
                ).label("weighted_value"),
                func.coalesce(func.avg(func.coalesce(Deals.days_in_stage, 0)), 0).label("avg_days"),
            )
            .where(*base_filter)
            .group_by(Deals.stage)
        )
        result = await db.execute(stage_query)
        rows = result.all()

        stages = []
        total_deals = 0
        total_value = 0.0
        weighted_value = 0.0

        for row in rows:
            stages.append(StageStats(
                stage=row.stage or "unknown",
                count=row.count,
                total_value=float(row.total_value),
                weighted_value=float(row.weighted_value),
                avg_days_in_stage=round(float(row.avg_days), 1),
            ))
            total_deals += row.count
            total_value += float(row.total_value)
            weighted_value += float(row.weighted_value)

        won_query = select(func.count(Deals.id)).where(
            *base_filter,
            Deals.stage.in_(SQL_WON_STAGE_VALUES),
        )
        won_result = await db.execute(won_query)
        deals_won = won_result.scalar() or 0
        win_rate = round((deals_won / max(total_deals, 1)) * 100, 1)

        return PipelineStatsResponse(
            stages=stages,
            total_deals=total_deals,
            total_value=total_value,
            weighted_value=weighted_value,
            win_rate=win_rate,
        )
    except Exception as e:
        logger.error(f"Error fetching pipeline stats: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# ---------- Deal Activities ----------
@router.get("/deals/{deal_id}/activities", response_model=DealActivityListResponse)
async def get_deal_activities(
    deal_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Actividades de un deal (aisladas por workspace)."""
    try:
        base_filter = [
            Activities.deal_id == deal_id,
            *_activity_scope(ws_ctx),
        ]

        count_q = select(func.count(Activities.id)).where(*base_filter)
        count_result = await db.execute(count_q)
        total = count_result.scalar() or 0

        items_q = (
            select(Activities)
            .where(*base_filter)
            .order_by(Activities.id.desc())
            .offset(skip)
            .limit(limit)
        )
        items_result = await db.execute(items_q)
        items = items_result.scalars().all()

        return DealActivityListResponse(items=items, total=total)
    except Exception as e:
        logger.error(f"Error fetching deal {deal_id} activities: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/deals/{deal_id}/activities", response_model=DealActivityResponse, status_code=201)
async def create_deal_activity(
    deal_id: int,
    data: DealActivityCreate,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Crear actividad ligada a un deal."""
    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    try:
        deal_filter = [Deals.id == deal_id, *_deal_scope(ws_ctx)]
        deal_q = select(Deals).where(*deal_filter)
        deal_result = await db.execute(deal_q)
        deal = deal_result.scalar_one_or_none()
        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")

        now = datetime.now(timezone.utc)
        activity = Activities(
            user_id=ws_ctx.user_id,
            workspace_id=ws_ctx.workspace_id,
            deal_id=deal_id,
            contact_id=data.contact_id or deal.contact_id,
            type=data.type,
            title=data.title,
            description=data.description,
            is_completed=data.is_completed or False,
            due_date=data.due_date,
            created_at=now,
        )
        db.add(activity)
        await db.commit()
        await db.refresh(activity)
        return activity
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating deal activity: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# ---------- Stage Change with Auto-Activity ----------
@router.post("/deals/{deal_id}/stage-change", response_model=StageChangeResponse)
async def change_deal_stage(
    deal_id: int,
    data: StageChangeRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Cambiar etapa del deal (solo valores canónicos). Crea actividad stage_change."""
    await enforce_workflow_engine_trigger_execute_allowed(db, ws_ctx.workspace_id)
    try:
        new_stage = (data.new_stage or "").strip()
        if not is_valid_canonical_stage_for_write(new_stage):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"new_stage must be one of: {', '.join(CANONICAL_DEAL_STAGES)}"
                ),
            )

        deal_filter = [Deals.id == deal_id, *_deal_scope(ws_ctx)]
        deal_q = select(Deals).where(*deal_filter)
        deal_result = await db.execute(deal_q)
        deal = deal_result.scalar_one_or_none()
        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")

        old_stage = deal.stage
        if old_stage == new_stage:
            raise HTTPException(status_code=400, detail="New stage is the same as current stage")

        deal.stage = new_stage
        deal.days_in_stage = 0
        deal.updated_at = datetime.now(timezone.utc)

        old_name = STAGE_LABELS.get(old_stage, old_stage)
        new_name = STAGE_LABELS.get(new_stage, new_stage)

        now = datetime.now(timezone.utc)
        activity = Activities(
            user_id=ws_ctx.user_id,
            workspace_id=ws_ctx.workspace_id,
            deal_id=deal_id,
            contact_id=deal.contact_id,
            type="stage_change",
            title=f"Etapa cambiada: {old_name} → {new_name}",
            description=data.notes or f"Deal movido de '{old_name}' a '{new_name}'",
            is_completed=True,
            created_at=now,
        )
        db.add(activity)
        await db.commit()
        await db.refresh(deal)
        await db.refresh(activity)

        # Auto-trigger workflow rules in the same workspace.
        try:
            wf = WorkflowEngineService(db)
            await wf.trigger(
                "deal_stage_changed",
                {
                    "deal_id": deal_id,
                    "workspace_id": ws_ctx.workspace_id,
                    "stage_from": old_stage,
                    "stage_to": new_stage,
                    "old_stage": old_stage,
                    "new_stage": new_stage,
                    "contact_id": deal.contact_id,
                    "title": deal.title,
                },
                ws_ctx.user_id,
                ws_ctx.workspace_id,
            )
        except Exception as wf_err:
            logger.warning(
                "Auto workflow trigger failed for deal_stage_changed: deal_id=%s ws=%s err=%s",
                deal_id,
                ws_ctx.workspace_id,
                str(wf_err),
                exc_info=True,
            )

        return StageChangeResponse(
            deal_id=deal_id,
            old_stage=old_stage,
            new_stage=new_stage,
            activity_id=activity.id,
            message=f"Stage changed from {old_name} to {new_name}",
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error changing deal {deal_id} stage: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# ---------- Toggle Activity Completion ----------
@router.put("/activities/{activity_id}/toggle", response_model=DealActivityResponse)
async def toggle_activity_completion(
    activity_id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Alternar is_completed de una actividad del workspace."""
    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    try:
        act_filter = [Activities.id == activity_id, *_activity_scope(ws_ctx)]
        q = select(Activities).where(*act_filter)
        result = await db.execute(q)
        activity = result.scalar_one_or_none()
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")

        activity.is_completed = not (activity.is_completed or False)
        await db.commit()
        await db.refresh(activity)
        return activity
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error toggling activity {activity_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
