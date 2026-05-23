"""NELVYON LMS API — courses, enrollments, public catalog."""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.lms_service import LmsService, get_lms_service

logger = logging.getLogger(__name__)

lms_router = APIRouter(prefix="/api/lms", tags=["lms"])
router = lms_router


class CreateCourseBody(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str = ""
    price_cents: int = Field(default=0, ge=0)
    currency: str = Field(default="eur", max_length=8)
    thumbnail_url: Optional[str] = None
    category: Optional[str] = None
    idioma: str = Field(default="es", max_length=16)


class UpdateCourseBody(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price_cents: Optional[int] = Field(None, ge=0)
    currency: Optional[str] = None
    thumbnail_url: Optional[str] = None
    category: Optional[str] = None
    idioma: Optional[str] = None


class AddModuleBody(BaseModel):
    title: str = Field(..., min_length=1)
    order_index: int = 0


class AddLessonBody(BaseModel):
    title: str = Field(..., min_length=1)
    content_type: str = Field(default="text", pattern="^(video|text|pdf|quiz)$")
    content_url: Optional[str] = None
    duration_minutes: int = Field(default=0, ge=0)
    order_index: int = 0


class EnrollBody(BaseModel):
    student_email: str = Field(..., min_length=3)
    student_name: Optional[str] = None
    payment_intent_id: Optional[str] = None
    checkout_session_id: Optional[str] = None
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


def _svc(db: AsyncSession, ws: WorkspaceContext | None = None) -> LmsService:
    return get_lms_service(db, ws.workspace_id if ws else None)


@lms_router.get("/public/courses")
async def public_course_catalog(db: AsyncSession = Depends(get_db)):
    await LmsService.ensure_schema()
    items = await get_lms_service(db).list_public_courses()
    return {"items": items}


@lms_router.get("/public/courses/{course_id}")
async def public_course_detail(course_id: str, db: AsyncSession = Depends(get_db)):
    await LmsService.ensure_schema()
    try:
        return await get_lms_service(db).get_public_course(course_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@lms_router.post("/courses/{course_id}/enroll")
async def enroll_in_course(course_id: str, body: EnrollBody, db: AsyncSession = Depends(get_db)):
    await LmsService.ensure_schema()
    svc = get_lms_service(db)
    try:
        if body.success_url and body.cancel_url and not body.checkout_session_id and not body.payment_intent_id:
            course = await svc.get_public_course(course_id)
            if int(course.get("price_cents") or 0) > 0:
                checkout = await svc.create_checkout_session(
                    course_id,
                    body.student_email,
                    body.student_name,
                    body.success_url,
                    body.cancel_url,
                )
                if checkout.get("checkout_url"):
                    return checkout
        result = await svc.enroll_student(
            course_id,
            body.student_email,
            body.payment_intent_id,
            student_name=body.student_name,
            checkout_session_id=body.checkout_session_id,
        )
        if result.get("requires_payment"):
            if body.success_url and body.cancel_url:
                checkout = await svc.create_checkout_session(
                    course_id,
                    body.student_email,
                    body.student_name,
                    body.success_url,
                    body.cancel_url,
                )
                return {**result, **checkout}
            raise HTTPException(status_code=402, detail="Payment required")
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@lms_router.get("/courses/{course_id}/progress/{email}")
async def student_progress(course_id: str, email: str, db: AsyncSession = Depends(get_db)):
    await LmsService.ensure_schema()
    try:
        return await get_lms_service(db).get_progress(course_id, email)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@lms_router.post("/progress/{enrollment_id}/lesson/{lesson_id}")
async def complete_lesson(enrollment_id: str, lesson_id: str, db: AsyncSession = Depends(get_db)):
    await LmsService.ensure_schema()
    try:
        return await get_lms_service(db).complete_lesson(enrollment_id, lesson_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@lms_router.get("/enrollments/{enrollment_id}/certificate")
async def get_certificate(enrollment_id: str, db: AsyncSession = Depends(get_db)):
    await LmsService.ensure_schema()
    try:
        return await get_lms_service(db).generate_certificate(enrollment_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@lms_router.post("/courses", status_code=201)
async def create_course(
    body: CreateCourseBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await LmsService.ensure_schema()
    return await _svc(db, ws).create_course(ws.workspace_id, **body.model_dump())


@lms_router.get("/courses")
async def list_courses(ws: WorkspaceContext = Depends(require_workspace), db: AsyncSession = Depends(get_db)):
    await LmsService.ensure_schema()
    items = await _svc(db, ws).list_courses(ws.workspace_id)
    stats = await _svc(db, ws).get_workspace_stats(ws.workspace_id)
    return {"items": items, "workspace_stats": stats}


@lms_router.get("/courses/{course_id}")
async def get_course(course_id: str, ws: WorkspaceContext = Depends(require_workspace), db: AsyncSession = Depends(get_db)):
    await LmsService.ensure_schema()
    try:
        return await _svc(db, ws).get_course(course_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@lms_router.put("/courses/{course_id}")
async def update_course(
    course_id: str,
    body: UpdateCourseBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await LmsService.ensure_schema()
    try:
        return await _svc(db, ws).update_course(course_id, **body.model_dump(exclude_unset=True))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@lms_router.delete("/courses/{course_id}")
async def delete_course(
    course_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await LmsService.ensure_schema()
    ok = await _svc(db, ws).delete_course(course_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Course not found")
    return {"ok": True}


@lms_router.post("/courses/{course_id}/publish")
async def publish_course(
    course_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await LmsService.ensure_schema()
    try:
        return await _svc(db, ws).publish_course(course_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@lms_router.get("/courses/{course_id}/stats")
async def course_stats(course_id: str, ws: WorkspaceContext = Depends(require_workspace), db: AsyncSession = Depends(get_db)):
    await LmsService.ensure_schema()
    return await _svc(db, ws).get_course_stats(course_id)


@lms_router.get("/courses/{course_id}/enrollments")
async def course_enrollments(
    course_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    await LmsService.ensure_schema()
    items = await _svc(db, ws).list_enrollments(course_id)
    return {"items": items}


@lms_router.post("/courses/{course_id}/modules", status_code=201)
async def add_module(
    course_id: str,
    body: AddModuleBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await LmsService.ensure_schema()
    return await _svc(db, ws).add_module(course_id, body.title, body.order_index)


@lms_router.post("/modules/{module_id}/lessons", status_code=201)
async def add_lesson(
    module_id: str,
    body: AddLessonBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await LmsService.ensure_schema()
    return await _svc(db, ws).add_lesson(
        module_id,
        body.title,
        body.content_type,
        body.content_url,
        body.duration_minutes,
        body.order_index,
    )
