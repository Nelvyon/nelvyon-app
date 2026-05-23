"""NELVYON Forms & Surveys API."""

from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.forms_service import FormsService, get_forms_service

logger = logging.getLogger(__name__)

forms_router = APIRouter(prefix="/api/forms", tags=["forms"])
router = forms_router


class CreateFormBody(BaseModel):
    title: str = Field(..., min_length=1)
    description: str = ""
    fields: list[dict[str, Any]] = Field(default_factory=list)
    settings: dict[str, Any] = Field(default_factory=dict)


class UpdateFormBody(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    fields: Optional[list[dict[str, Any]]] = None
    settings: Optional[dict[str, Any]] = None


class CreateSurveyBody(BaseModel):
    title: str = Field(..., min_length=1)
    questions: list[dict[str, Any]] = Field(default_factory=list)


class SubmitFormBody(BaseModel):
    responses: dict[str, Any] = Field(default_factory=dict)
    visitor_info: dict[str, Any] = Field(default_factory=dict)
    completion_seconds: Optional[int] = None


def _svc(db: AsyncSession, ws: WorkspaceContext | None = None) -> FormsService:
    return get_forms_service(db, ws.workspace_id if ws else None)


@forms_router.get("/public/{slug}")
async def public_form(slug: str, db: AsyncSession = Depends(get_db)):
    await FormsService.ensure_schema()
    try:
        return await get_forms_service(db).get_public_form(slug)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@forms_router.post("/{form_id}/submit")
async def submit_form(form_id: str, body: SubmitFormBody, db: AsyncSession = Depends(get_db)):
    await FormsService.ensure_schema()
    try:
        return await get_forms_service(db).submit_form(
            form_id, body.responses, body.visitor_info, body.completion_seconds
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@forms_router.post("", status_code=201)
async def create_form(
    body: CreateFormBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await FormsService.ensure_schema()
    return await _svc(db, ws).create_form(
        ws.workspace_id, body.title, body.description, body.fields, body.settings
    )


@forms_router.post("/surveys", status_code=201)
async def create_survey(
    body: CreateSurveyBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await FormsService.ensure_schema()
    return await _svc(db, ws).create_survey(ws.workspace_id, body.title, body.questions)


@forms_router.get("")
async def list_forms(ws: WorkspaceContext = Depends(require_workspace), db: AsyncSession = Depends(get_db)):
    await FormsService.ensure_schema()
    items = await _svc(db, ws).list_forms(ws.workspace_id)
    return {"items": items}


@forms_router.get("/{form_id}")
async def get_form(
    form_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    await FormsService.ensure_schema()
    try:
        return await _svc(db, ws).get_form(form_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@forms_router.put("/{form_id}")
async def update_form(
    form_id: str,
    body: UpdateFormBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await FormsService.ensure_schema()
    return await _svc(db, ws).update_form(form_id, **body.model_dump(exclude_unset=True))


@forms_router.delete("/{form_id}")
async def delete_form(
    form_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await FormsService.ensure_schema()
    ok = await _svc(db, ws).delete_form(form_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Form not found")
    return {"ok": True}


@forms_router.post("/{form_id}/publish")
async def publish_form(
    form_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await FormsService.ensure_schema()
    try:
        return await _svc(db, ws).publish_form(form_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@forms_router.get("/{form_id}/responses")
async def form_responses(
    form_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    await FormsService.ensure_schema()
    items = await _svc(db, ws).get_responses(form_id)
    return {"items": items}


@forms_router.get("/{form_id}/stats")
async def form_stats(
    form_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    await FormsService.ensure_schema()
    return await _svc(db, ws).get_form_stats(form_id)


@forms_router.get("/{form_id}/survey-results")
async def survey_results(
    form_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    await FormsService.ensure_schema()
    try:
        return await _svc(db, ws).get_survey_results(form_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
