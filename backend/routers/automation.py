import logging
from typing import Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from schemas.auth import UserResponse
from services.automation import AutomationService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/automation", tags=["automation"])


class ProcessJobRequest(BaseModel):
    client_id: int
    job_type: str
    input_data: Optional[str] = None
    priority: Optional[str] = "normal"


class ProcessJobResponse(BaseModel):
    job_id: int
    status: str
    output_id: Optional[int] = None
    content: Optional[str] = None
    processing_time_ms: int = 0


class JobListResponse(BaseModel):
    items: list
    total: int
    skip: int
    limit: int


class StatsResponse(BaseModel):
    total_jobs: int
    completed: int
    pending: int
    failed: int
    average_processing_ms: int
    success_rate: float


class WebhookPayload(BaseModel):
    client_id: int = 0
    job_type: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    priority: Optional[str] = "normal"


@router.post("/process-job", response_model=ProcessJobResponse)
async def process_job(
    data: ProcessJobRequest,
    current_user: UserResponse = Depends(get_current_user),
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Process an automation job: receive → AI generate → save → return."""
    try:
        service = AutomationService(db)
        result = await service.process_job(
            user_id=str(current_user.id),
            client_id=data.client_id,
            job_type=data.job_type,
            input_data=data.input_data,
            source="manual",
            priority=data.priority or "normal",
            workspace_id=ctx.workspace_id,
        )
        return ProcessJobResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error processing automation job: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error en automatización: {str(e)}")


@router.get("/jobs")
async def list_jobs(
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    job_type: Optional[str] = None,
    current_user: UserResponse = Depends(get_current_user),
    ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """List automation jobs with pagination and filters."""
    try:
        service = AutomationService(db)
        return await service.get_jobs(
            user_id=str(current_user.id),
            skip=skip,
            limit=limit,
            status=status,
            job_type=job_type,
            workspace_id=ctx.workspace_id,
        )
    except Exception as e:
        logger.error(f"Error listing automation jobs: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", response_model=StatsResponse)
async def get_stats(
    current_user: UserResponse = Depends(get_current_user),
    ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get automation dashboard statistics."""
    try:
        service = AutomationService(db)
        return await service.get_stats(user_id=str(current_user.id), workspace_id=ctx.workspace_id)
    except Exception as e:
        logger.error(f"Error getting automation stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook/trigger/{webhook_key}")
async def trigger_webhook(
    webhook_key: str,
    payload: WebhookPayload,
    db: AsyncSession = Depends(get_db),
):
    """Public webhook endpoint — no JWT; validated via webhook_key + client/workspace binding."""
    try:
        service = AutomationService(db)
        result = await service.trigger_webhook(
            webhook_key=webhook_key,
            payload=payload.model_dump(),
        )
        return {"status": "ok", "job_id": result["job_id"], "processing_time_ms": result["processing_time_ms"]}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Webhook trigger error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error en webhook: {str(e)}")


@router.post("/retry/{job_id}", response_model=ProcessJobResponse)
async def retry_job(
    job_id: int,
    current_user: UserResponse = Depends(get_current_user),
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Retry a failed automation job."""
    try:
        service = AutomationService(db)
        result = await service.retry_job(
            job_id=job_id,
            user_id=str(current_user.id),
            workspace_id=ctx.workspace_id,
        )
        return ProcessJobResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error retrying job: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
