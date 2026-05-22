"""SEO API — Semrush + DataForSEO real data endpoints."""

from typing import Any, Dict

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from dependencies.workspace import WorkspaceContext, require_workspace
from services.seo_apis import DataForSEOService, SemrushService

router = APIRouter(prefix="/api/seo", tags=["seo"])


class DomainRequest(BaseModel):
    domain: str = Field(..., min_length=1)


class KeywordRequest(BaseModel):
    keyword: str = Field(..., min_length=1)
    database: str = "es"


class SerpRequest(BaseModel):
    keyword: str = Field(..., min_length=1)
    location_code: int = 2724


class KeywordIdeasRequest(BaseModel):
    keyword: str = Field(..., min_length=1)


@router.post("/domain-overview")
async def domain_overview(
    body: DomainRequest,
    _ctx: WorkspaceContext = Depends(require_workspace),
) -> Dict[str, Any]:
    """Análisis completo de dominio (Semrush domain_ranks)."""
    service = SemrushService()
    overview = await service.domain_overview(body.domain.strip())
    competitors = await service.competitors(body.domain.strip())
    return {
        "domain": body.domain.strip(),
        "domain_overview": overview,
        "competitors": competitors,
    }


@router.post("/keyword-overview")
async def keyword_overview(
    body: KeywordRequest,
    _ctx: WorkspaceContext = Depends(require_workspace),
) -> Dict[str, Any]:
    """Datos de keyword (Semrush phrase_this)."""
    service = SemrushService()
    return await service.keyword_overview(body.keyword.strip(), database=body.database)


@router.post("/competitors")
async def competitors(
    body: DomainRequest,
    _ctx: WorkspaceContext = Depends(require_workspace),
) -> Dict[str, Any]:
    """Competidores orgánicos (Semrush domain_organic_organic)."""
    service = SemrushService()
    return await service.competitors(body.domain.strip())


@router.post("/serp")
async def serp_analysis(
    body: SerpRequest,
    _ctx: WorkspaceContext = Depends(require_workspace),
) -> Dict[str, Any]:
    """Análisis SERP real (DataForSEO live advanced)."""
    service = DataForSEOService()
    return await service.serp_analysis(body.keyword.strip(), location_code=body.location_code)


@router.post("/keyword-ideas")
async def keyword_ideas(
    body: KeywordIdeasRequest,
    _ctx: WorkspaceContext = Depends(require_workspace),
) -> Dict[str, Any]:
    """Ideas de keywords (DataForSEO keywords_for_keywords)."""
    service = DataForSEOService()
    return await service.keyword_ideas(body.keyword.strip())
