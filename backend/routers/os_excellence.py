from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from dependencies.workspace import WorkspaceContext, require_workspace
from schemas.auth import UserResponse

router = APIRouter(prefix="/api/v1/os/excellence", tags=["os_excellence"])

Status = Literal["pass", "warn", "not-run", "fail", "pending", "ready", "partial"]


class QaChecklistItem(BaseModel):
    key: str
    label: str
    status: Status
    evidence: str
    verify_path: str


class QaChecklistResponse(BaseModel):
    generated_at: str
    items: list[QaChecklistItem]


class I18nModuleStatus(BaseModel):
    module: str
    status: Literal["ready", "partial", "pending"]
    priority: Literal["P1", "P2"]
    notes: str


class I18nHotspot(BaseModel):
    route: str
    status: Literal["partial", "pending"]
    priority: Literal["P1", "P2"]
    reason: str


class I18nBaselineResponse(BaseModel):
    default_locale: str
    enabled_locales: list[str]
    modules: list[I18nModuleStatus]
    hotspots: list[I18nHotspot]


class GoldenPathStep(BaseModel):
    key: str
    label: str
    status: Literal["pass", "fail", "pending"]
    verification: str
    verify_ref: str


class GoldenPathResponse(BaseModel):
    criterion: str
    steps: list[GoldenPathStep]


@router.get("/checklist", response_model=QaChecklistResponse)
async def get_qa_core_checklist(
    _ctx: WorkspaceContext = Depends(require_workspace),
    _user: UserResponse = Depends(get_current_user),
    _db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc).isoformat()
    items = [
        QaChecklistItem(
            key="auth_signup",
            label="Auth / signup",
            status="pass",
            evidence="Manual route available; contract check path maintained.",
            verify_path="/auth/signup",
        ),
        QaChecklistItem(
            key="workspace_select",
            label="Workspace selection",
            status="pass",
            evidence="Workspace selector route active and used by client/internal mode.",
            verify_path="/os/workspaces/select",
        ),
        QaChecklistItem(
            key="branding_v1_v2",
            label="Branding v1/v2",
            status="pass",
            evidence="Branding v1 + v2 policy/preview/activation routes are reachable and isolated.",
            verify_path="/app/branding/policy",
        ),
        QaChecklistItem(
            key="voice_v2",
            label="Voice v2 pilot",
            status="warn",
            evidence="Pilot is gated by plan + monthly cap; manual verification recommended before release cut.",
            verify_path="/app/voz",
        ),
        QaChecklistItem(
            key="observability_v1",
            label="Observability v1",
            status="pass",
            evidence="Snapshot/incidents/alerts routes available with 24h read-only signals.",
            verify_path="/os/observability",
        ),
        QaChecklistItem(
            key="os_global_v2",
            label="OS global v2",
            status="pass",
            evidence="Global snapshot/risk queue/change journal routes available for internal triage.",
            verify_path="/os/global",
        ),
    ]
    return QaChecklistResponse(generated_at=now, items=items)


@router.get("/i18n", response_model=I18nBaselineResponse)
async def get_i18n_baseline_status(
    _ctx: WorkspaceContext = Depends(require_workspace),
    _user: UserResponse = Depends(get_current_user),
    _db: AsyncSession = Depends(get_db),
):
    default_locale = (os.environ.get("NELVYON_DEFAULT_LOCALE") or "es").strip() or "es"
    enabled_raw = (os.environ.get("NELVYON_ENABLED_LOCALES") or "es,en").strip()
    enabled_locales = [p.strip() for p in enabled_raw.split(",") if p.strip()] or ["es", "en"]

    modules = [
        I18nModuleStatus(module="auth/signup", status="ready", priority="P1", notes="Core labels/messages aligned for baseline."),
        I18nModuleStatus(module="workspace selection", status="ready", priority="P1", notes="Minimal locale-safe copy already present."),
        I18nModuleStatus(module="branding", status="partial", priority="P1", notes="Core copy in place; advanced policy messages pending full catalog."),
        I18nModuleStatus(module="voice", status="partial", priority="P2", notes="Pilot copy mostly single-language; needs catalog extraction."),
        I18nModuleStatus(module="observability", status="partial", priority="P2", notes="Operational labels stable; no full translation map yet."),
        I18nModuleStatus(module="os global", status="pending", priority="P2", notes="New v2 labels exposed; translation keys pending."),
    ]
    hotspots = [
        I18nHotspot(route="/app/branding/preview-v2", status="partial", priority="P1", reason="Policy and validation strings still inline."),
        I18nHotspot(route="/app/voz/outbound-synth", status="partial", priority="P2", reason="Device-synth guidance copy is hardcoded."),
        I18nHotspot(route="/os/global", status="pending", priority="P2", reason="Global operations copy recently added without locale map."),
        I18nHotspot(route="/os/excellence/golden-path", status="pending", priority="P2", reason="New excellence labels start as baseline-only."),
    ]
    return I18nBaselineResponse(
        default_locale=default_locale,
        enabled_locales=enabled_locales,
        modules=modules,
        hotspots=hotspots,
    )


@router.get("/golden-path", response_model=GoldenPathResponse)
async def get_golden_path_gate(
    _ctx: WorkspaceContext = Depends(require_workspace),
    _user: UserResponse = Depends(get_current_user),
    _db: AsyncSession = Depends(get_db),
):
    steps = [
        GoldenPathStep(
            key="sanity_functional",
            label="Sanity functional checks",
            status="pending",
            verification="Manual walkthrough of core routes in active front.",
            verify_ref="/os/qa/checklist",
        ),
        GoldenPathStep(
            key="typecheck",
            label="Typecheck",
            status="pending",
            verification="pnpm typecheck",
            verify_ref="pnpm typecheck",
        ),
        GoldenPathStep(
            key="lint",
            label="Lint",
            status="pending",
            verification="pnpm lint",
            verify_ref="pnpm lint",
        ),
        GoldenPathStep(
            key="relevant_tests",
            label="Relevant tests",
            status="pending",
            verification="python -m pytest tests<subset> -q && pnpm vitest <relevant suites>",
            verify_ref="backend/frontend relevant test subsets",
        ),
        GoldenPathStep(
            key="gate",
            label="Gate",
            status="pending",
            verification="pnpm gate",
            verify_ref="pnpm gate",
        ),
    ]
    return GoldenPathResponse(
        criterion="Only considered ready when all golden path steps are green.",
        steps=steps,
    )
