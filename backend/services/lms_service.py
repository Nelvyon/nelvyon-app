"""NELVYON LMS — courses, modules, lessons, enrollments, Stripe publish."""

from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import stripe
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from services.tenant_service import TenantService

logger = logging.getLogger(__name__)

_SCHEMA_READY = False
CONTENT_TYPES = frozenset({"video", "text", "pdf", "quiz"})


def _json_dumps(obj: Any) -> str:
    import json

    return json.dumps(obj, ensure_ascii=False, default=str)


def _row(row: Any) -> dict[str, Any]:
    if row is None:
        return {}
    data = dict(row._mapping)
    for k, v in list(data.items()):
        if isinstance(v, datetime):
            data[k] = v.isoformat()
        elif hasattr(v, "hex"):
            data[k] = str(v)
    return data


def _ensure_stripe_key() -> bool:
    key = (settings.stripe_secret_key or os.environ.get("STRIPE_SECRET_KEY", "")).strip()
    if not key:
        return False
    stripe.api_key = key
    return True


class LmsService:
    def __init__(self, session: AsyncSession, workspace_id: int | None = None):
        self.session = session
        self.workspace_id = int(workspace_id) if workspace_id is not None else None

    @classmethod
    async def ensure_schema(cls) -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        from core.database import db_manager

        sql_path = Path(__file__).resolve().parent.parent / "migrations" / "lms.sql"
        if sql_path.is_file():
            async with db_manager.get_session() as session:
                await session.execute(text(sql_path.read_text(encoding="utf-8")))
                await session.commit()
        _SCHEMA_READY = True

    async def _set_tenant(self, workspace_id: int) -> None:
        await TenantService(self.session).set_tenant_context(workspace_id)

    async def create_course(
        self,
        workspace_id: int,
        title: str,
        description: str = "",
        price_cents: int = 0,
        currency: str = "eur",
        thumbnail_url: str | None = None,
        category: str | None = None,
        idioma: str = "es",
    ) -> dict[str, Any]:
        await self.ensure_schema()
        ws = int(workspace_id)
        await self._set_tenant(ws)
        title = (title or "").strip()
        if not title:
            raise ValueError("title is required")
        result = await self.session.execute(
            text(
                """
                INSERT INTO lms_courses (
                    workspace_id, title, description, price_cents, currency,
                    thumbnail_url, category, idioma
                )
                VALUES (:ws, :title, :desc, :price, :currency, :thumb, :cat, :idioma)
                RETURNING *
                """
            ),
            {
                "ws": ws,
                "title": title,
                "desc": description or "",
                "price": max(0, int(price_cents)),
                "currency": (currency or "eur").lower(),
                "thumb": thumbnail_url,
                "cat": category,
                "idioma": idioma or "es",
            },
        )
        row = _row(result.mappings().first())
        await self.session.commit()
        return row

    async def update_course(self, course_id: str, **fields: Any) -> dict[str, Any]:
        await self.ensure_schema()
        if self.workspace_id is None:
            raise ValueError("workspace_id required")
        await self._set_tenant(self.workspace_id)
        course = await self.get_course(course_id, include_content=False)
        title = str(fields.get("title", course.get("title", ""))).strip()
        result = await self.session.execute(
            text(
                """
                UPDATE lms_courses SET
                    title = :title,
                    description = :desc,
                    price_cents = :price,
                    currency = :currency,
                    thumbnail_url = :thumb,
                    category = :cat,
                    idioma = :idioma
                WHERE id = CAST(:id AS uuid) AND workspace_id = :ws
                RETURNING *
                """
            ),
            {
                "id": course_id,
                "ws": self.workspace_id,
                "title": title,
                "desc": fields.get("description", course.get("description", "")),
                "price": max(0, int(fields.get("price_cents", course.get("price_cents", 0)))),
                "currency": str(fields.get("currency", course.get("currency", "eur"))).lower(),
                "thumb": fields.get("thumbnail_url", course.get("thumbnail_url")),
                "cat": fields.get("category", course.get("category")),
                "idioma": fields.get("idioma", course.get("idioma", "es")),
            },
        )
        row = result.mappings().first()
        if not row:
            raise ValueError("Course not found")
        await self.session.commit()
        return _row(row)

    async def delete_course(self, course_id: str) -> bool:
        await self.ensure_schema()
        if self.workspace_id is None:
            raise ValueError("workspace_id required")
        await self._set_tenant(self.workspace_id)
        result = await self.session.execute(
            text("DELETE FROM lms_courses WHERE id = CAST(:id AS uuid) AND workspace_id = :ws RETURNING id"),
            {"id": course_id, "ws": self.workspace_id},
        )
        ok = result.mappings().first() is not None
        await self.session.commit()
        return ok

    async def get_course(self, course_id: str, *, include_content: bool = True) -> dict[str, Any]:
        await self.ensure_schema()
        params: dict[str, Any] = {"id": course_id}
        where = "id = CAST(:id AS uuid)"
        if self.workspace_id is not None:
            await self._set_tenant(self.workspace_id)
            where += " AND workspace_id = :ws"
            params["ws"] = self.workspace_id
        result = await self.session.execute(text(f"SELECT * FROM lms_courses WHERE {where}"), params)
        row = result.mappings().first()
        if not row:
            raise ValueError("Course not found")
        course = _row(row)
        if include_content:
            course["modules"] = await self._list_modules_with_lessons(course_id)
            course["total_duration_minutes"] = sum(
                int(l.get("duration_minutes") or 0)
                for m in course["modules"]
                for l in m.get("lessons", [])
            )
        return course

    async def _list_modules_with_lessons(self, course_id: str) -> list[dict[str, Any]]:
        mods = await self.session.execute(
            text(
                """
                SELECT * FROM lms_modules
                WHERE course_id = CAST(:cid AS uuid)
                ORDER BY order_index ASC, title ASC
                """
            ),
            {"cid": course_id},
        )
        modules = [_row(m) for m in mods.mappings().all()]
        for mod in modules:
            lessons = await self.session.execute(
                text(
                    """
                    SELECT * FROM lms_lessons
                    WHERE module_id = CAST(:mid AS uuid)
                    ORDER BY order_index ASC, title ASC
                    """
                ),
                {"mid": mod["id"]},
            )
            mod["lessons"] = [_row(l) for l in lessons.mappings().all()]
        return modules

    async def list_courses(self, workspace_id: int) -> list[dict[str, Any]]:
        await self.ensure_schema()
        ws = int(workspace_id)
        await self._set_tenant(ws)
        result = await self.session.execute(
            text(
                """
                SELECT c.*,
                    COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active') AS active_students,
                    COALESCE(SUM(c.price_cents) FILTER (
                        WHERE e.payment_intent_id IS NOT NULL AND e.status != 'refunded'
                    ), 0) AS revenue_cents
                FROM lms_courses c
                LEFT JOIN lms_enrollments e ON e.course_id = c.id
                WHERE c.workspace_id = :ws
                GROUP BY c.id
                ORDER BY c.created_at DESC
                """
            ),
            {"ws": ws},
        )
        return [_row(r) for r in result.mappings().all()]

    async def get_workspace_stats(self, workspace_id: int) -> dict[str, Any]:
        await self.ensure_schema()
        ws = int(workspace_id)
        await self._set_tenant(ws)
        result = await self.session.execute(
            text(
                """
                SELECT
                    COUNT(*) FILTER (WHERE status = 'published') AS published_courses,
                    COALESCE(SUM(students_count), 0) AS total_students,
                    COALESCE(SUM(
                        (SELECT COUNT(*) FROM lms_enrollments e
                         WHERE e.course_id = c.id AND e.status = 'active')
                    ), 0) AS active_students,
                    COALESCE(SUM(
                        (SELECT SUM(c2.price_cents) FROM lms_enrollments e2
                         JOIN lms_courses c2 ON c2.id = e2.course_id
                         WHERE e2.course_id = c.id AND e2.payment_intent_id IS NOT NULL
                           AND e2.status != 'refunded')
                    ), 0) AS revenue_cents
                FROM lms_courses c
                WHERE c.workspace_id = :ws
                """
            ),
            {"ws": ws},
        )
        r = result.mappings().first()
        return {
            "published_courses": int(r["published_courses"] or 0),
            "active_students": int(r["active_students"] or 0),
            "total_students": int(r["total_students"] or 0),
            "revenue_cents": int(r["revenue_cents"] or 0),
        }

    async def add_module(self, course_id: str, title: str, order_index: int = 0) -> dict[str, Any]:
        await self.ensure_schema()
        if self.workspace_id is None:
            raise ValueError("workspace_id required")
        await self._set_tenant(self.workspace_id)
        course = await self.get_course(course_id, include_content=False)
        ws = int(course["workspace_id"])
        result = await self.session.execute(
            text(
                """
                INSERT INTO lms_modules (course_id, workspace_id, title, order_index)
                VALUES (CAST(:cid AS uuid), :ws, :title, :ord)
                RETURNING *
                """
            ),
            {"cid": course_id, "ws": ws, "title": title.strip(), "ord": int(order_index)},
        )
        row = _row(result.mappings().first())
        await self.session.commit()
        return row

    async def add_lesson(
        self,
        module_id: str,
        title: str,
        content_type: str,
        content_url: str | None = None,
        duration_minutes: int = 0,
        order_index: int = 0,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        if self.workspace_id is None:
            raise ValueError("workspace_id required")
        await self._set_tenant(self.workspace_id)
        ct = (content_type or "text").lower()
        if ct not in CONTENT_TYPES:
            raise ValueError(f"content_type must be one of: {', '.join(sorted(CONTENT_TYPES))}")
        mod = await self.session.execute(
            text("SELECT * FROM lms_modules WHERE id = CAST(:id AS uuid)"),
            {"id": module_id},
        )
        mod_row = mod.mappings().first()
        if not mod_row:
            raise ValueError("Module not found")
        mod_d = _row(mod_row)
        result = await self.session.execute(
            text(
                """
                INSERT INTO lms_lessons (
                    module_id, course_id, workspace_id, title, content_type,
                    content_url, duration_minutes, order_index
                )
                VALUES (
                    CAST(:mid AS uuid), CAST(:cid AS uuid), :ws, :title, :ctype,
                    :url, :dur, :ord
                )
                RETURNING *
                """
            ),
            {
                "mid": module_id,
                "cid": mod_d["course_id"],
                "ws": mod_d["workspace_id"],
                "title": title.strip(),
                "ctype": ct,
                "url": content_url,
                "dur": max(0, int(duration_minutes)),
                "ord": int(order_index),
            },
        )
        row = _row(result.mappings().first())
        await self.session.commit()
        return row

    async def publish_course(self, course_id: str) -> dict[str, Any]:
        await self.ensure_schema()
        if self.workspace_id is None:
            raise ValueError("workspace_id required")
        await self._set_tenant(self.workspace_id)
        course = await self.get_course(course_id, include_content=False)
        price_cents = int(course.get("price_cents") or 0)
        stripe_product_id = course.get("stripe_product_id")
        stripe_price_id = course.get("stripe_price_id")
        status = "published"

        if price_cents > 0:
            if _ensure_stripe_key():
                try:
                    if not stripe_product_id:
                        sp = await stripe.Product.create_async(
                            name=course["title"],
                            description=(course.get("description") or "")[:500] or None,
                            metadata={"lms_course_id": course_id, "workspace_id": str(course["workspace_id"])},
                        )
                        stripe_product_id = sp.id
                    pr = await stripe.Price.create_async(
                        product=stripe_product_id,
                        unit_amount=price_cents,
                        currency=str(course.get("currency", "eur")).lower(),
                    )
                    stripe_price_id = pr.id
                except stripe.StripeError as exc:
                    logger.warning("LMS Stripe publish failed: %s", exc)
                    status = "pending_stripe"
            else:
                status = "pending_stripe"

        result = await self.session.execute(
            text(
                """
                UPDATE lms_courses SET
                    status = :status,
                    stripe_product_id = :sp,
                    stripe_price_id = :pr
                WHERE id = CAST(:id AS uuid) AND workspace_id = :ws
                RETURNING *
                """
            ),
            {
                "id": course_id,
                "ws": self.workspace_id,
                "status": status,
                "sp": stripe_product_id,
                "pr": stripe_price_id,
            },
        )
        row = _row(result.mappings().first())
        await self.session.commit()
        return row

    async def _get_course_public(self, course_id: str) -> dict[str, Any]:
        result = await self.session.execute(
            text("SELECT * FROM lms_courses WHERE id = CAST(:id AS uuid) AND status = 'published'"),
            {"id": course_id},
        )
        row = result.mappings().first()
        if not row:
            raise ValueError("Course not found")
        return _row(row)

    async def list_public_courses(self) -> list[dict[str, Any]]:
        await self.ensure_schema()
        result = await self.session.execute(
            text(
                """
                SELECT id, title, description, price_cents, currency, thumbnail_url,
                       category, idioma, students_count, created_at
                FROM lms_courses
                WHERE status = 'published'
                ORDER BY created_at DESC
                LIMIT 200
                """
            ),
        )
        return [_row(r) for r in result.mappings().all()]

    async def get_public_course(self, course_id: str) -> dict[str, Any]:
        await self.ensure_schema()
        course = await self._get_course_public(course_id)
        await self._set_tenant(int(course["workspace_id"]))
        course["modules"] = await self._list_modules_with_lessons(course_id)
        course["total_duration_minutes"] = sum(
            int(l.get("duration_minutes") or 0)
            for m in course["modules"]
            for l in m.get("lessons", [])
        )
        return course

    async def create_checkout_session(
        self,
        course_id: str,
        student_email: str,
        student_name: str | None,
        success_url: str,
        cancel_url: str,
    ) -> dict[str, Any]:
        course = await self._get_course_public(course_id)
        price_cents = int(course.get("price_cents") or 0)
        if price_cents <= 0:
            raise ValueError("Course is free")
        if not course.get("stripe_price_id"):
            raise ValueError("Course payment not configured")
        if not _ensure_stripe_key():
            return {"status": "pending_stripe", "checkout_url": None, "message": "Stripe not configured"}
        session = await stripe.checkout.Session.create_async(
            mode="payment",
            line_items=[{"price": course["stripe_price_id"], "quantity": 1}],
            success_url=success_url,
            cancel_url=cancel_url,
            customer_email=student_email.strip(),
            metadata={
                "lms_course_id": course_id,
                "student_email": student_email.strip().lower(),
                "student_name": (student_name or "").strip(),
            },
        )
        return {"checkout_url": session.url, "session_id": session.id}

    async def enroll_student(
        self,
        course_id: str,
        student_email: str,
        payment_intent_id: str | None = None,
        *,
        student_name: str | None = None,
        checkout_session_id: str | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        course = await self._get_course_public(course_id)
        ws = int(course["workspace_id"])
        await self._set_tenant(ws)
        email = (student_email or "").strip().lower()
        if not email:
            raise ValueError("student_email is required")
        price_cents = int(course.get("price_cents") or 0)
        payment_ref = payment_intent_id

        if price_cents > 0 and not payment_ref:
            if checkout_session_id and _ensure_stripe_key():
                sess = await stripe.checkout.Session.retrieve_async(checkout_session_id)
                if sess.payment_status != "paid":
                    raise ValueError("Payment not completed")
                payment_ref = sess.payment_intent or checkout_session_id
            else:
                return {
                    "requires_payment": True,
                    "price_cents": price_cents,
                    "currency": course.get("currency", "eur"),
                    "stripe_price_id": course.get("stripe_price_id"),
                }

        existing = await self.session.execute(
            text(
                """
                SELECT * FROM lms_enrollments
                WHERE course_id = CAST(:cid AS uuid) AND lower(student_email) = :email
                """
            ),
            {"cid": course_id, "email": email},
        )
        ex = existing.mappings().first()
        if ex:
            return _row(ex)

        result = await self.session.execute(
            text(
                """
                INSERT INTO lms_enrollments (
                    course_id, workspace_id, student_email, student_name, payment_intent_id
                )
                VALUES (CAST(:cid AS uuid), :ws, :email, :name, :pay)
                RETURNING *
                """
            ),
            {
                "cid": course_id,
                "ws": ws,
                "email": email,
                "name": student_name,
                "pay": payment_ref,
            },
        )
        enrollment = _row(result.mappings().first())
        await self.session.execute(
            text(
                """
                UPDATE lms_courses SET students_count = students_count + 1
                WHERE id = CAST(:cid AS uuid)
                """
            ),
            {"cid": course_id},
        )
        await self.session.commit()
        return enrollment

    async def get_progress(self, course_id: str, student_email: str) -> dict[str, Any]:
        await self.ensure_schema()
        course = await self._get_course_public(course_id)
        await self._set_tenant(int(course["workspace_id"]))
        email = student_email.strip().lower()
        enr = await self.session.execute(
            text(
                """
                SELECT * FROM lms_enrollments
                WHERE course_id = CAST(:cid AS uuid) AND lower(student_email) = :email
                """
            ),
            {"cid": course_id, "email": email},
        )
        enrollment = enr.mappings().first()
        if not enrollment:
            raise ValueError("Enrollment not found")
        en = _row(enrollment)
        return await self._progress_for_enrollment(en["id"], course_id)

    async def _progress_for_enrollment(self, enrollment_id: str, course_id: str) -> dict[str, Any]:
        lessons = await self.session.execute(
            text("SELECT id FROM lms_lessons WHERE course_id = CAST(:cid AS uuid)"),
            {"cid": course_id},
        )
        lesson_ids = [str(r["id"]) for r in lessons.mappings().all()]
        total = len(lesson_ids)
        done = await self.session.execute(
            text(
                """
                SELECT lesson_id, completed_at FROM lms_progress
                WHERE enrollment_id = CAST(:eid AS uuid)
                """
            ),
            {"eid": enrollment_id},
        )
        completed = [_row(r) for r in done.mappings().all()]
        completed_ids = {str(c["lesson_id"]) for c in completed}
        pct = round((len(completed_ids) / total) * 100, 1) if total else 0.0
        return {
            "enrollment_id": enrollment_id,
            "course_id": course_id,
            "completed_lessons": list(completed_ids),
            "completed_details": completed,
            "total_lessons": total,
            "progress_percent": pct,
        }

    async def complete_lesson(self, enrollment_id: str, lesson_id: str) -> dict[str, Any]:
        await self.ensure_schema()
        enr = await self.session.execute(
            text("SELECT * FROM lms_enrollments WHERE id = CAST(:id AS uuid)"),
            {"id": enrollment_id},
        )
        enrollment = enr.mappings().first()
        if not enrollment:
            raise ValueError("Enrollment not found")
        en = _row(enrollment)
        await self._set_tenant(int(en["workspace_id"]))
        lesson = await self.session.execute(
            text("SELECT * FROM lms_lessons WHERE id = CAST(:id AS uuid)"),
            {"id": lesson_id},
        )
        if not lesson.mappings().first():
            raise ValueError("Lesson not found")

        await self.session.execute(
            text(
                """
                INSERT INTO lms_progress (enrollment_id, lesson_id, workspace_id)
                VALUES (CAST(:eid AS uuid), CAST(:lid AS uuid), :ws)
                ON CONFLICT (enrollment_id, lesson_id) DO NOTHING
                """
            ),
            {"eid": enrollment_id, "lid": lesson_id, "ws": en["workspace_id"]},
        )
        progress = await self._progress_for_enrollment(enrollment_id, str(en["course_id"]))
        if progress["progress_percent"] >= 100:
            await self.session.execute(
                text(
                    """
                    UPDATE lms_enrollments SET status = 'completed'
                    WHERE id = CAST(:id AS uuid)
                    """
                ),
                {"id": enrollment_id},
            )
        await self.session.commit()
        return progress

    async def generate_certificate(self, enrollment_id: str) -> dict[str, Any]:
        await self.ensure_schema()
        enr = await self.session.execute(
            text(
                """
                SELECT e.*, c.title AS course_title
                FROM lms_enrollments e
                JOIN lms_courses c ON c.id = e.course_id
                WHERE e.id = CAST(:id AS uuid)
                """
            ),
            {"id": enrollment_id},
        )
        row = enr.mappings().first()
        if not row:
            raise ValueError("Enrollment not found")
        en = _row(row)
        progress = await self._progress_for_enrollment(enrollment_id, str(en["course_id"]))
        if progress["progress_percent"] < 100:
            raise ValueError("Course not completed")
        return {
            "certificate_id": str(uuid.uuid4()),
            "student_name": en.get("student_name") or en.get("student_email"),
            "student_email": en.get("student_email"),
            "course_title": en.get("course_title"),
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "enrollment_id": enrollment_id,
        }

    async def get_course_stats(self, course_id: str) -> dict[str, Any]:
        await self.ensure_schema()
        if self.workspace_id is None:
            raise ValueError("workspace_id required")
        await self._set_tenant(self.workspace_id)
        course = await self.get_course(course_id, include_content=False)
        stats = await self.session.execute(
            text(
                """
                SELECT
                    COUNT(*) AS total_students,
                    COUNT(*) FILTER (WHERE status = 'completed') AS completed,
                    COUNT(*) FILTER (WHERE status = 'active') AS active
                FROM lms_enrollments
                WHERE course_id = CAST(:cid AS uuid)
                """
            ),
            {"cid": course_id},
        )
        s = stats.mappings().first()
        paid_count = await self.session.execute(
            text(
                """
                SELECT COUNT(*) FROM lms_enrollments
                WHERE course_id = CAST(:cid AS uuid)
                  AND payment_intent_id IS NOT NULL AND status != 'refunded'
                """
            ),
            {"cid": course_id},
        )
        paid = int(paid_count.scalar_one() or 0)
        revenue = int(course.get("price_cents") or 0) * paid
        enrollments = await self.session.execute(
            text("SELECT id FROM lms_enrollments WHERE course_id = CAST(:cid AS uuid)"),
            {"cid": course_id},
        )
        eids = [str(r["id"]) for r in enrollments.mappings().all()]
        progress_vals: list[float] = []
        for eid in eids:
            p = await self._progress_for_enrollment(eid, course_id)
            progress_vals.append(float(p["progress_percent"]))
        avg_progress = round(sum(progress_vals) / len(progress_vals), 1) if progress_vals else 0.0
        total = int(s["total_students"] or 0)
        completed = int(s["completed"] or 0)
        completion_rate = round((completed / total) * 100, 1) if total else 0.0
        return {
            "students": total,
            "active_students": int(s["active"] or 0),
            "completed": completed,
            "revenue_cents": revenue,
            "avg_progress_percent": avg_progress,
            "completion_rate_percent": completion_rate,
        }

    async def list_enrollments(self, course_id: str) -> list[dict[str, Any]]:
        await self.ensure_schema()
        if self.workspace_id is None:
            raise ValueError("workspace_id required")
        await self._set_tenant(self.workspace_id)
        result = await self.session.execute(
            text(
                """
                SELECT * FROM lms_enrollments
                WHERE course_id = CAST(:cid AS uuid)
                ORDER BY enrolled_at DESC
                """
            ),
            {"cid": course_id},
        )
        items = []
        for r in result.mappings().all():
            en = _row(r)
            prog = await self._progress_for_enrollment(en["id"], course_id)
            en["progress_percent"] = prog["progress_percent"]
            items.append(en)
        return items


def get_lms_service(session: AsyncSession, workspace_id: int | None = None) -> LmsService:
    return LmsService(session, workspace_id)
