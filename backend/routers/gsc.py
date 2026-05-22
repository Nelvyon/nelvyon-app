"""Google Search Console API — analytics, sites, sitemaps, OAuth."""

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from dependencies.workspace import WorkspaceContext, require_workspace
from services.cache_service import cached
from services.gsc_service import get_gsc_service

router = APIRouter(prefix="/api/gsc", tags=["gsc"])


class SubmitSitemapRequest(BaseModel):
    site_url: str = Field(..., min_length=1, max_length=2048)
    sitemap_url: str = Field(..., min_length=1, max_length=2048)


@router.get("/analytics")
@cached(ttl=600, prefix="gsc:analytics")
async def search_analytics(
    site_url: str = Query(..., description="Property URL, e.g. https://example.com/ or sc-domain:example.com"),
    start_date: str = Query(..., description="YYYY-MM-DD"),
    end_date: str = Query(..., description="YYYY-MM-DD"),
    dimensions: str = Query(
        "query",
        description="Comma-separated dimensions: query, page, country, device, date, etc.",
    ),
    _ctx: WorkspaceContext = Depends(require_workspace),
) -> Dict[str, Any]:
    """Search analytics: clicks, impressions, ctr, position."""
    service = get_gsc_service()
    dim_list = [d.strip() for d in dimensions.split(",") if d.strip()]
    try:
        return await service.get_search_analytics(
            site_url=site_url,
            start_date=start_date.strip(),
            end_date=end_date.strip(),
            dimensions=dim_list or ["query"],
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"GSC analytics failed: {e}",
        ) from e


@router.get("/sites")
async def list_sites(
    _ctx: WorkspaceContext = Depends(require_workspace),
) -> Dict[str, Any]:
    """List verified Search Console properties."""
    service = get_gsc_service()
    try:
        return await service.get_sites()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"GSC sites failed: {e}",
        ) from e


@router.get("/sitemaps/{site_url:path}")
async def list_sitemaps(
    site_url: str,
    _ctx: WorkspaceContext = Depends(require_workspace),
) -> Dict[str, Any]:
    """List sitemaps for a property (URL-encode site_url path segments)."""
    service = get_gsc_service()
    try:
        return await service.get_sitemaps(site_url)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"GSC sitemaps list failed: {e}",
        ) from e


@router.post("/sitemaps")
async def submit_sitemap(
    body: SubmitSitemapRequest,
    _ctx: WorkspaceContext = Depends(require_workspace),
) -> Dict[str, Any]:
    """Submit a sitemap URL to Search Console."""
    service = get_gsc_service()
    try:
        return await service.submit_sitemap(body.site_url.strip(), body.sitemap_url.strip())
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"GSC sitemap submit failed: {e}",
        ) from e


@router.get("/auth")
async def start_oauth(
    redirect_uri: Optional[str] = Query(
        None,
        description="OAuth redirect URI (defaults to PYTHON_BACKEND_URL/api/gsc/callback)",
    ),
    _ctx: WorkspaceContext = Depends(require_workspace),
):
    """Start Google OAuth flow for Search Console (returns authorize URL or redirects)."""
    service = get_gsc_service()
    result = await service.get_authorization_url(redirect_uri)
    if result.get("mock") and result.get("error"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=result["error"],
        )
    authorize_url = result.get("authorize_url")
    if not authorize_url:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="OAuth URL not available")
    return result


@router.get("/callback")
async def oauth_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
):
    """Google OAuth callback — exchanges code for tokens (set GOOGLE_REFRESH_TOKEN in Railway)."""
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google OAuth error: {error}",
        )
    if not code or not state:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing code or state query parameters",
        )

    service = get_gsc_service()
    try:
        result = await service.exchange_authorization_code(code, state)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"GSC OAuth callback failed: {e}",
        ) from e

    if not result.get("ok"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=result.get("error", "Token exchange failed"),
        )

    return result
