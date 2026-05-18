import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from dependencies.workspace import WorkspaceContext, require_workspace_operator
from schemas.auth import UserResponse
from services.orchestrator import OrchestratorService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/orchestrator", tags=["orchestrator"])


class GenerateRequest(BaseModel):
    project_id: int
    platforms: Optional[str] = None


class GenerateResponse(BaseModel):
    output_id: int
    content: str
    output_type: str
    qa_status: str


async def _run_generate(
    data: GenerateRequest,
    current_user: UserResponse,
    db: AsyncSession,
    ctx: WorkspaceContext,
    fn_name: str,
):
    service = OrchestratorService(db)
    wid = ctx.workspace_id
    uid = str(current_user.id)
    gen = getattr(service, fn_name)
    if fn_name in ("generate_social", "generate_ads"):
        return await gen(
            data.project_id, uid, platforms=data.platforms or "all", workspace_id=wid
        )
    return await gen(data.project_id, uid, workspace_id=wid)


@router.post("/generate-web", response_model=GenerateResponse)
async def generate_web(
    data: GenerateRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate premium web structure with SEO Elite + 3D for a project."""
    try:
        result = await _run_generate(data, current_user, db, ctx, "generate_web")
        return GenerateResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating web: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error en generación: {str(e)}")


@router.post("/generate-ecommerce", response_model=GenerateResponse)
async def generate_ecommerce(
    data: GenerateRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate premium e-commerce with SEO Maximum + 3D/AR for a project."""
    try:
        result = await _run_generate(data, current_user, db, ctx, "generate_ecommerce")
        return GenerateResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating ecommerce: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error en generación: {str(e)}")


@router.post("/generate-social", response_model=GenerateResponse)
async def generate_social(
    data: GenerateRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate social media content for ALL platforms."""
    try:
        result = await _run_generate(data, current_user, db, ctx, "generate_social")
        return GenerateResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating social: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error en generación: {str(e)}")


@router.post("/generate-ads", response_model=GenerateResponse)
async def generate_ads(
    data: GenerateRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate ad campaigns for ALL platforms worldwide."""
    try:
        result = await _run_generate(data, current_user, db, ctx, "generate_ads")
        return GenerateResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating ads: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error en generación: {str(e)}")


@router.post("/generate-email-marketing", response_model=GenerateResponse)
async def generate_email_marketing(
    data: GenerateRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate world-class email marketing campaigns."""
    try:
        result = _run_generate(data, current_user, db, ctx, "generate_email_marketing")
        return GenerateResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating email marketing: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error en generación: {str(e)}")


@router.post("/generate-workflows", response_model=GenerateResponse)
async def generate_workflows(
    data: GenerateRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate intelligent workflow automations."""
    try:
        result = await _run_generate(data, current_user, db, ctx, "generate_workflows")
        return GenerateResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating workflows: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error en generación: {str(e)}")


@router.post("/generate-funnel", response_model=GenerateResponse)
async def generate_funnel(
    data: GenerateRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate premium sales funnel."""
    try:
        result = await _run_generate(data, current_user, db, ctx, "generate_funnel")
        return GenerateResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating funnel: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error en generación: {str(e)}")


@router.post("/generate-branding", response_model=GenerateResponse)
async def generate_branding(
    data: GenerateRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate complete 360° branding identity."""
    try:
        result = await _run_generate(data, current_user, db, ctx, "generate_branding")
        return GenerateResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating branding: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error en generación: {str(e)}")


@router.post("/generate-audit", response_model=GenerateResponse)
async def generate_audit(
    data: GenerateRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate world-class digital audit for a project."""
    try:
        result = await _run_generate(data, current_user, db, ctx, "generate_audit")
        return GenerateResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating audit: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error en generación: {str(e)}")


@router.post("/generate-proposal", response_model=GenerateResponse)
async def generate_proposal(
    data: GenerateRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate world-class commercial proposal for a project."""
    try:
        result = await _run_generate(data, current_user, db, ctx, "generate_proposal")
        return GenerateResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating proposal: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error en generación: {str(e)}")
