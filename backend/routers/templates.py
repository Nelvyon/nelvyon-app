"""Reusable templates API — CRUD, render, clone."""

from __future__ import annotations

import logging
from typing import Any, List, Optional

from core.secrets import sanitize_text
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_admin
from services.template_service import TEMPLATE_TYPES, get_template_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/templates", tags=["templates"])


class CreateTemplateBody(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    type: str
    content: str = Field(..., min_length=1)
    subject: Optional[str] = None
    variables: List[str] = Field(default_factory=list)
    is_public: bool = False


class UpdateTemplateBody(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    subject: Optional[str] = None
    content: Optional[str] = Field(None, min_length=1)
    variables: Optional[List[str]] = None
    is_public: Optional[bool] = None


class RenderTemplateBody(BaseModel):
    variables: dict[str, Any] = Field(default_factory=dict)


class CloneTemplateBody(BaseModel):
    target_workspace_id: Optional[int] = None


def _svc(db: AsyncSession, ws: WorkspaceContext):
    return get_template_service(db, int(ws.workspace_id))


@router.get("/types")
async def list_template_types(
    _ws: WorkspaceContext = Depends(require_workspace),
):
    return {"types": sorted(TEMPLATE_TYPES)}


@router.get("")
async def list_templates(
    type: Optional[str] = Query(None, alias="type"),
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        return {"templates": await _svc(db, ws).list_templates(type=type)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("", status_code=201)
async def create_template(
    body: CreateTemplateBody,
    ws: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws).create_template(
            body.name,
            body.type,
            body.content,
            subject=body.subject,
            variables=body.variables,
            is_public=body.is_public,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{template_id}")
async def get_template(
    template_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    row = await _svc(db, ws).get_template(template_id)
    if not row:
        raise HTTPException(status_code=404, detail="Template not found")
    return row


@router.patch("/{template_id}")
async def update_template(
    template_id: str,
    body: UpdateTemplateBody,
    ws: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws).update_template(
            template_id,
            name=body.name,
            subject=body.subject,
            content=body.content,
            variables=body.variables,
            is_public=body.is_public,
        )
    except ValueError as exc:
        status = 404 if "not found" in str(exc).lower() else 400
        raise HTTPException(status_code=status, detail=str(exc)) from exc


@router.delete("/{template_id}", status_code=204)
async def delete_template(
    template_id: str,
    ws: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
):
    deleted = await _svc(db, ws).delete_template(template_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Template not found")


@router.post("/{template_id}/render")
async def render_template(
    template_id: str,
    body: RenderTemplateBody,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws).render_template(template_id, body.variables)
    except ValueError as exc:
        status = 404 if "not found" in str(exc).lower() else 400
        raise HTTPException(status_code=status, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("template render: %s", sanitize_text(str(exc)), exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to render template") from exc


@router.post("/{template_id}/clone", status_code=201)
async def clone_template(
    template_id: str,
    body: CloneTemplateBody,
    ws: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws).clone_template(
            template_id,
            target_workspace_id=body.target_workspace_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
