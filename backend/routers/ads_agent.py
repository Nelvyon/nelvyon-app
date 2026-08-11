"""Unified paid media agent — briefing, launch, optimize (F60)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from dependencies.auth import get_super_admin_user
from schemas.auth import UserResponse
from services.ads_agent_service import get_ads_agent_service

# AUTORIDAD DE PLATAFORMA, NO DE WORKSPACE
# ----------------------------------------
# `GoogleAdsService` y `MetaAdsService` no aceptan workspace ni tenant: resuelven
# UNA sola cuenta publicitaria, la corporativa de NELVYON
# (`GOOGLE_ADS_CUSTOMER_ID`). Por tanto todo este router lee y escribe sobre el
# dinero de NELVYON, no sobre datos de un cliente.
#
# Antes dependia de `require_workspace*`, que autoriza correctamente el recurso
# EQUIVOCADO: cualquier operador de cualquier workspace alcanzaba la cuenta
# corporativa. La autoridad correcta es de plataforma, y sale del rol del JWT
# verificado, nunca de `X-Workspace-Id` ni de `workspace_members`.
#
# Si algun dia NELVYON ofrece Ads por cliente, NO se reutiliza esta cuenta:
# hara falta integracion por workspace con sus propias credenciales.

router = APIRouter(prefix="/api/ads-agent", tags=["ads-agent"])


class BriefingBody(BaseModel):
    product: str = Field("NELVYON", min_length=1, max_length=120)
    audience: str = Field("", max_length=500)
    goal: str = Field("conversions", max_length=64)
    daily_budget_eur: float = Field(80, ge=10, le=100_000)
    creative_image_url: str | None = None
    notes: str = ""
    launch: bool = False


@router.post("/briefing")
async def ads_agent_briefing(
    body: BriefingBody,
    # `launch=true` crea campanas de pago reales en la cuenta corporativa.
    _admin: UserResponse = Depends(get_super_admin_user),
):
    briefing: dict[str, Any] = body.model_dump()
    return await get_ads_agent_service().run_briefing(
        workspace_id=0,
        briefing=briefing,
        launch=body.launch,
    )


@router.get("/reporting/unified")
async def ads_unified_reporting(_admin: UserResponse = Depends(get_super_admin_user)):
    return await get_ads_agent_service().unified_reporting()


@router.post("/optimize")
async def ads_optimize(
    roas_threshold: float = Query(1.5, ge=0.5, le=20),
    # Analisis: no ejecuta cambios externos, pero expone ROAS, gasto e ids de
    # campana de la cuenta corporativa.
    _admin: UserResponse = Depends(get_super_admin_user),
):
    return await get_ads_agent_service().optimize_all(roas_threshold=roas_threshold)


@router.get("/alerts/roas")
async def ads_roas_alerts(
    threshold: float = Query(1.5, ge=0.5, le=20),
    _admin: UserResponse = Depends(get_super_admin_user),
):
    return await get_ads_agent_service().roas_alerts(threshold=threshold)
