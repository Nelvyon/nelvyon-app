import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from schemas.auth import UserResponse
from services.qa_engine import QAEngineService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/qa", tags=["qa_engine"])


class ValidateRequest(BaseModel):
    output_id: int


class ValidateResponse(BaseModel):
    output_id: int
    qa_score: int
    qa_status: str
    qa_feedback: str
    qa_attempts: int
    blocked: bool
    can_retry: Optional[bool] = None
    message: Optional[str] = None


class QADashboardResponse(BaseModel):
    total_outputs: int
    passed: int
    failed: int
    pending: int
    average_score: float
    pass_rate: float


@router.post("/validate", response_model=ValidateResponse)
async def validate_output(
    data: ValidateRequest,
    current_user: UserResponse = Depends(get_current_user),
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Run QA validation on an output. Blocks if score < 90."""
    try:
        service = QAEngineService(db)
        result = await service.validate_output(data.output_id, str(current_user.id), workspace_id=ctx.workspace_id)
        return ValidateResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error validating output: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error en validación QA: {str(e)}")


@router.get("/dashboard", response_model=QADashboardResponse)
async def get_qa_dashboard(
    current_user: UserResponse = Depends(get_current_user),
    ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get QA dashboard statistics."""
    try:
        service = QAEngineService(db)
        result = await service.get_dashboard_stats(str(current_user.id), workspace_id=ctx.workspace_id)
        return QADashboardResponse(**result)
    except Exception as e:
        logger.error(f"Error getting QA dashboard: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error obteniendo estadísticas QA: {str(e)}")