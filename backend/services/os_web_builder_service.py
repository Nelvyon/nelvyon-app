"""NELVYON OS Web Builder — AI-generated multi-page websites."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import uuid
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import db_manager
from services.landing_builder_service import (
    DEFAULT_BLOCK_PROPS,
    LandingBuilderService,
    _make_block,
)
from services.os_design_pipeline import (
    generate_hero_image_dalle,
    inject_hero_image_url,
    run_design_score_and_improve,
)
from services.tenant_service import TenantService
from services.web_cache_service import (
    CACHE_HEADERS_WEBSITE,
    get_website_json,
    invalidate_website,
    set_website_json,
)
from services.web_performance_service import (
    get_latest_metrics,
    maybe_alert_low_score,
    run_pagespeed,
    save_metrics,
)
from services.web_static_export import export_website_static
from services.whitelabel_service import DEFAULT_CNAME_TARGET, _resolve_cname_chain

logger = logging.getLogger(__name__)

_SCHEMA_READY = False
WEB_MODEL = "gpt-4o"
SITE_BASE = os.environ.get("NELVYON_SITE_BASE", "https://nelvyon.com").rstrip("/")

PAGE_TYPE_LABELS = {
    "home": "Inicio",
    "about": "Sobre nosotros",
    "services": "Servicios",
    "pricing": "Precios",
    "contact": "Contacto",
    "blog": "Blog",
    "faq": "Preguntas frecuentes",
    "custom": "Página",
}

SCHEMA_BY_SECTOR = {
    "restaurante": "Restaurant",
    "restaurant": "Restaurant",
    "inmobiliaria": "RealEstateAgent",
    "real_estate": "RealEstateAgent",
    "abogados": "LegalService",
    "legal": "LegalService",
    "clinica": "MedicalBusiness",
    "medical": "MedicalBusiness",
    "estetica": "HealthAndBeautyBusiness",
    "saas": "SoftwareApplication",
    "tienda": "Store",
    "ecommerce": "Store",
    "consultoria": "ProfessionalService",
    "academia": "EducationalOrganization",
    "portfolio": "Person",
}

WEBSITE_TEMPLATES = [
    ("SaaS Product", "saas", ["home", "about", "services", "pricing", "contact", "faq"]),
    ("Restaurante", "restaurante", ["home", "about", "services", "contact", "faq"]),
    ("Inmobiliaria", "inmobiliaria", ["home", "about", "services", "contact", "faq"]),
    ("Consultoría", "consultoria", ["home", "about", "services", "pricing", "contact"]),
    ("Tienda online", "tienda", ["home", "about", "services", "pricing", "contact", "faq"]),
    ("Estética", "estetica", ["home", "about", "services", "pricing", "contact"]),
    ("Abogados", "abogados", ["home", "about", "services", "contact", "faq"]),
    ("Clínica", "clinica", ["home", "about", "services", "contact", "faq"]),
    ("Academia", "academia", ["home", "about", "services", "pricing", "contact", "blog"]),
    ("Portfolio", "portfolio", ["home", "about", "services", "contact"]),
]


def _json_dumps(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, default=str)


def _row(row: Any) -> dict[str, Any]:
    if row is None:
        return {}
    data = dict(row._mapping)
    for k, v in list(data.items()):
        if isinstance(v, datetime):
            data[k] = v.isoformat()
        elif isinstance(v, uuid.UUID):
            data[k] = str(v)
    return data


def _parse_jsonb(val: Any) -> Any:
    if isinstance(val, str):
        return json.loads(val)
    return val if val is not None else {}


def _slugify(text_val: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", text_val.lower()).strip("-")[:40]
    return base or "site"


def _openai_client():
    from openai import AsyncOpenAI

    api_key = (
        os.environ.get("OPENAI_API_KEY", "").strip()
        or os.environ.get("APP_AI_KEY", "").strip()
    )
    if not api_key:
        return None
    base_url = (
        os.environ.get("OPENAI_BASE_URL", "").strip()
        or os.environ.get("APP_AI_BASE_URL", "").strip()
        or "https://api.openai.com/v1"
    )
    return AsyncOpenAI(api_key=api_key, base_url=base_url)


class OsWebBuilderService:
    """AI-powered multi-page website builder."""

    def __init__(self, session: AsyncSession, workspace_id: int | None = None):
        self.session = session
        self.workspace_id = int(workspace_id) if workspace_id is not None else None

    @staticmethod
    async def ensure_schema() -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        await LandingBuilderService.ensure_schema()
        await TenantService.ensure_schema()
        if not db_manager.async_session_maker:
            await db_manager.ensure_initialized()
        sql_path = Path(__file__).resolve().parent.parent / "migrations" / "os_web_builder.sql"
        if sql_path.exists():
            raw = sql_path.read_text(encoding="utf-8")
            async with db_manager.async_session_maker() as session:
                for stmt in [s.strip() for s in raw.split(";") if s.strip()]:
                    try:
                        await session.execute(text(stmt))
                    except Exception as exc:
                        if "already exists" not in str(exc).lower():
                            logger.debug("os_web_builder schema skipped: %s", exc)
                await session.commit()
        await OsWebBuilderService._seed_templates()
        perf_path = Path(__file__).resolve().parent.parent / "migrations" / "web_performance.sql"
        if perf_path.exists():
            raw_perf = perf_path.read_text(encoding="utf-8")
            async with db_manager.async_session_maker() as session:
                for stmt in [s.strip() for s in raw_perf.split(";") if s.strip()]:
                    try:
                        await session.execute(text(stmt))
                    except Exception as exc:
                        if "already exists" not in str(exc).lower():
                            logger.debug("web_performance schema skipped: %s", exc)
                await session.commit()
        _SCHEMA_READY = True

    @staticmethod
    async def _seed_templates() -> None:
        if not db_manager.async_session_maker:
            return
        async with db_manager.async_session_maker() as session:
            r = await session.execute(text("SELECT COUNT(*) FROM os_website_templates"))
            if int(r.scalar() or 0) >= len(WEBSITE_TEMPLATES):
                return
            for name, category, pages in WEBSITE_TEMPLATES:
                structure = [
                    {"page_type": p, "page_slug": p if p != "home" else "", "order_index": i}
                    for i, p in enumerate(pages)
                ]
                for item in structure:
                    if not item["page_slug"]:
                        item["page_slug"] = "home"
                defaults = {
                    "sector": category,
                    "pages": pages,
                    "primary_goal": "leads",
                    "language": "es",
                }
                await session.execute(
                    text(
                        """
                        INSERT INTO os_website_templates (
                            name, category, thumbnail_url, pages_structure, business_info_defaults
                        )
                        SELECT :name, :cat, :thumb, CAST(:structure AS jsonb),
                               CAST(:defaults AS jsonb)
                        WHERE NOT EXISTS (
                            SELECT 1 FROM os_website_templates WHERE category = :cat
                        )
                        """
                    ),
                    {
                        "name": name,
                        "cat": category,
                        "thumb": f"https://cdn.nelvyon.com/web-templates/{category}.png",
                        "structure": _json_dumps(structure),
                        "defaults": _json_dumps(defaults),
                    },
                )
            await session.commit()

    async def _set_workspace(self, workspace_id: int) -> None:
        await TenantService(self.session).set_tenant_context(workspace_id)

    async def create_website_project(
        self, workspace_id: int, business_info: dict[str, Any]
    ) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_workspace(workspace_id)
        name = (business_info.get("business_name") or business_info.get("name") or "Mi web").strip()
        subdomain = await self._unique_subdomain(
            business_info.get("subdomain") or name
        )
        project_id = str(uuid.uuid4())
        info = {**business_info, "business_name": name}
        if "pages" not in info or not info["pages"]:
            info["pages"] = ["home", "about", "services", "contact"]

        r = await self.session.execute(
            text(
                """
                INSERT INTO os_website_projects (
                    id, workspace_id, name, subdomain, business_info, status
                )
                VALUES (:id, :ws, :name, :sub, CAST(:info AS jsonb), 'pending')
                RETURNING *
                """
            ),
            {
                "id": project_id,
                "ws": workspace_id,
                "name": name,
                "sub": subdomain,
                "info": _json_dumps(info),
            },
        )
        await self.session.commit()
        row = _row(r.fetchone())
        row["site_url"] = self._site_url(subdomain)
        return row

    async def create_project_from_template(
        self,
        workspace_id: int,
        template_id: str,
        *,
        business_info: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        r = await self.session.execute(
            text("SELECT * FROM os_website_templates WHERE id = :id::uuid"),
            {"id": template_id},
        )
        tpl = _row(r.fetchone())
        if not tpl:
            raise ValueError("Template not found")
        defaults = _parse_jsonb(tpl.get("business_info_defaults")) or {}
        structure = _parse_jsonb(tpl.get("pages_structure")) or []
        pages = [s.get("page_type") for s in structure if s.get("page_type")]
        merged = {
            **defaults,
            **(business_info or {}),
            "pages": pages or defaults.get("pages", ["home", "about", "contact"]),
            "template_category": tpl.get("category"),
        }
        if not merged.get("business_name"):
            merged["business_name"] = tpl.get("name")
        return await self.create_website_project(workspace_id, merged)

    async def list_projects(self, workspace_id: int) -> list[dict[str, Any]]:
        await self.ensure_schema()
        await self._set_workspace(workspace_id)
        r = await self.session.execute(
            text(
                """
                SELECT id, workspace_id, name, subdomain, status, pages_count,
                       custom_domain, created_at, updated_at
                FROM os_website_projects
                WHERE workspace_id = :ws
                ORDER BY updated_at DESC
                """
            ),
            {"ws": workspace_id},
        )
        items = []
        for row in r.fetchall():
            item = _row(row)
            item["site_url"] = self._site_url(item.get("subdomain"))
            items.append(item)
        return items

    async def get_project(
        self, project_id: str, workspace_id: int | None = None
    ) -> dict[str, Any] | None:
        await self.ensure_schema()
        if workspace_id is not None:
            await self._set_workspace(workspace_id)
        q = "SELECT * FROM os_website_projects WHERE id = :id::uuid"
        params: dict[str, Any] = {"id": project_id}
        if workspace_id is not None:
            q += " AND workspace_id = :ws"
            params["ws"] = workspace_id
        r = await self.session.execute(text(q), params)
        project = _row(r.fetchone())
        if not project:
            return None
        project["pages"] = await self._list_project_pages(project_id)
        project["site_url"] = self._site_url(project.get("subdomain"))
        project["analytics"] = await self.get_site_analytics(project_id, int(project["workspace_id"]))
        return project

    async def get_website_status(self, project_id: str, workspace_id: int) -> dict[str, Any]:
        project = await self.get_project(project_id, workspace_id)
        if not project:
            raise ValueError("Project not found")
        return {
            "project_id": project_id,
            "status": project.get("status"),
            "pages_count": project.get("pages_count"),
            "site_url": project.get("site_url"),
            "custom_domain": project.get("custom_domain"),
            "error_message": project.get("error_message"),
            "pages": project.get("pages", []),
        }

    async def generate_website_with_ai(self, project_id: str) -> dict[str, Any]:
        project = await self._get_project_raw(project_id)
        if not project:
            raise ValueError("Project not found")
        workspace_id = int(project["workspace_id"])
        self.workspace_id = workspace_id
        await self._set_workspace(workspace_id)
        await self._set_project_status(project_id, "generating")

        business = _parse_jsonb(project.get("business_info")) or {}
        pages_to_build = business.get("pages") or ["home", "about", "services", "contact"]
        subdomain = project.get("subdomain") or "site"
        landing_svc = LandingBuilderService(self.session, workspace_id)

        try:
            for idx, page_type in enumerate(pages_to_build):
                page_slug = "home" if page_type == "home" else _slugify(str(page_type))
                page_data = await self._generate_page_content(business, page_type, page_slug)
                blocks = page_data.get("blocks") or self._fallback_blocks(business, page_type)
                meta = page_data.get("meta") or self._fallback_meta(business, page_type, page_slug)

                meta["os_web_project_id"] = project_id
                meta["page_type"] = page_type
                meta["site_slug"] = page_slug
                meta["schema_org"] = self._schema_org(business, page_type)

                lp = await landing_svc.create_page(
                    workspace_id,
                    page_data.get("title") or PAGE_TYPE_LABELS.get(page_type, page_type),
                    blocks=blocks,
                    meta=meta,
                )
                lp_id = lp["id"]
                global_slug = f"{subdomain}-{page_slug}"
                await self.session.execute(
                    text(
                        """
                        UPDATE landing_pages SET slug = :slug WHERE id = :id::uuid
                        """
                    ),
                    {"slug": global_slug, "id": lp_id},
                )

                existing = await self._get_site_page(project_id, page_slug)
                if existing:
                    await self.session.execute(
                        text(
                            """
                            UPDATE os_website_pages
                            SET landing_page_id = :lp::uuid, order_index = :ord, updated_at = NOW()
                            WHERE id = :id::uuid
                            """
                        ),
                        {"lp": lp_id, "ord": idx, "id": existing["id"]},
                    )
                else:
                    await self.session.execute(
                        text(
                            """
                            INSERT INTO os_website_pages (
                                project_id, workspace_id, page_type, page_slug,
                                landing_page_id, order_index
                            )
                            VALUES (:pid, :ws, :ptype, :slug, :lp::uuid, :ord)
                            """
                        ),
                        {
                            "pid": project_id,
                            "ws": workspace_id,
                            "ptype": page_type,
                            "slug": page_slug,
                            "lp": lp_id,
                            "ord": idx,
                        },
                    )

            business = _parse_jsonb(project.get("business_info")) or {}
            sector = (
                business.get("sector")
                or business.get("template_category")
                or "business"
            )
            hero_url = await generate_hero_image_dalle(
                str(sector),
                str(business.get("business_name") or project.get("name") or ""),
            )
            website_json = await self.build_website_json(project_id, workspace_id)
            if hero_url:
                website_json = inject_hero_image_url(website_json, hero_url)
            website_json, design_eval = await run_design_score_and_improve(website_json)
            await self.apply_website_json(project_id, workspace_id, website_json)
            logger.info(
                "OS Web design pipeline project=%s avg=%s passed=%s",
                project_id,
                design_eval.get("average"),
                design_eval.get("passed"),
            )

            seo = self._build_seo_artifacts(project, pages_to_build, subdomain)
            await self.session.execute(
                text(
                    """
                    UPDATE os_website_projects
                    SET seo_artifacts = CAST(:seo AS jsonb),
                        pages_count = :cnt,
                        status = 'ready',
                        error_message = NULL,
                        updated_at = NOW()
                    WHERE id = :id::uuid
                    """
                ),
                {"id": project_id, "seo": _json_dumps(seo), "cnt": len(pages_to_build)},
            )
            await self.session.commit()
            project_row = await self.get_project(project_id, workspace_id) or {}
            try:
                await self.regenerate_static_export(project_id, workspace_id)
            except Exception as exc:
                logger.warning("static export after generate failed: %s", exc)
            return project_row
        except Exception as exc:
            await self._set_project_status(project_id, "error", str(exc)[:2000])
            raise

    async def publish_website(self, project_id: str, workspace_id: int) -> dict[str, Any]:
        project = await self.get_project(project_id, workspace_id)
        if not project:
            raise ValueError("Project not found")
        if project.get("status") not in ("ready", "published"):
            raise ValueError("Project must be in ready status before publishing")

        if project.get("custom_domain"):
            check = await self.validate_custom_domain(project["custom_domain"])
            if not check["verified"]:
                raise ValueError(
                    f"CNAME for {project['custom_domain']} must point to {DEFAULT_CNAME_TARGET}"
                )

        landing_svc = LandingBuilderService(self.session, workspace_id)
        for page in project.get("pages") or []:
            lp_id = page.get("landing_page_id")
            if lp_id:
                await landing_svc.publish_page(lp_id, workspace_id)
                await self.session.execute(
                    text(
                        """
                        UPDATE os_website_pages SET is_published = TRUE, updated_at = NOW()
                        WHERE id = :id::uuid
                        """
                    ),
                    {"id": page["id"]},
                )

        await self.session.execute(
            text(
                """
                UPDATE os_website_projects
                SET status = 'published', domain_verified = :verified, updated_at = NOW()
                WHERE id = :id::uuid AND workspace_id = :ws
                """
            ),
            {
                "id": project_id,
                "ws": workspace_id,
                "verified": bool(project.get("custom_domain")),
            },
        )
        await self.session.commit()
        try:
            await self.regenerate_static_export(project_id, workspace_id)
        except Exception as exc:
            logger.warning("static export after publish failed: %s", exc)
        updated = await self.get_project(project_id, workspace_id) or {}
        updated["public_url"] = self._site_url(project.get("subdomain"))
        return updated

    async def update_page_content(
        self,
        project_id: str,
        workspace_id: int,
        page_id: str,
        *,
        new_content: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        project = await self.get_project(project_id, workspace_id)
        if not project:
            raise ValueError("Project not found")
        page = next((p for p in project.get("pages", []) if p["id"] == page_id), None)
        if not page:
            raise ValueError("Page not found")

        business = _parse_jsonb(project.get("business_info")) or {}
        if new_content:
            business = {**business, **new_content}

        page_type = page.get("page_type", "custom")
        page_slug = page.get("page_slug", "page")
        page_data = await self._generate_page_content(business, page_type, page_slug)
        blocks = page_data.get("blocks") or self._fallback_blocks(business, page_type)
        meta = page_data.get("meta") or self._fallback_meta(business, page_type, page_slug)

        landing_svc = LandingBuilderService(self.session, workspace_id)
        lp_id = page.get("landing_page_id")
        if lp_id:
            await landing_svc.update_page(
                lp_id,
                workspace_id,
                {"blocks": blocks, "meta": meta, "name": page_data.get("title", page_slug)},
            )
        else:
            lp = await landing_svc.create_page(
                workspace_id,
                page_data.get("title") or page_slug,
                blocks=blocks,
                meta=meta,
            )
            lp_id = lp["id"]
            await self.session.execute(
                text(
                    "UPDATE os_website_pages SET landing_page_id = :lp::uuid WHERE id = :id::uuid"
                ),
                {"lp": lp_id, "id": page_id},
            )
            await self.session.commit()
        try:
            await self.regenerate_static_export(project_id, workspace_id)
        except Exception as exc:
            logger.warning("static export after page edit failed: %s", exc)
        return await self.get_project(project_id, workspace_id) or {}

    async def add_page(
        self, project_id: str, workspace_id: int, page_type: str
    ) -> dict[str, Any]:
        project = await self.get_project(project_id, workspace_id)
        if not project:
            raise ValueError("Project not found")
        business = _parse_jsonb(project.get("business_info")) or {}
        page_slug = _slugify(page_type if page_type != "home" else "home")
        if page_type == "home":
            page_slug = "home"

        page_data = await self._generate_page_content(business, page_type, page_slug)
        blocks = page_data.get("blocks") or self._fallback_blocks(business, page_type)
        meta = page_data.get("meta") or self._fallback_meta(business, page_type, page_slug)
        subdomain = project.get("subdomain") or "site"

        landing_svc = LandingBuilderService(self.session, workspace_id)
        lp = await landing_svc.create_page(
            workspace_id,
            page_data.get("title") or PAGE_TYPE_LABELS.get(page_type, page_type),
            blocks=blocks,
            meta=meta,
        )
        global_slug = f"{subdomain}-{page_slug}"
        await self.session.execute(
            text("UPDATE landing_pages SET slug = :slug WHERE id = :id::uuid"),
            {"slug": global_slug, "id": lp["id"]},
        )

        ord_r = await self.session.execute(
            text(
                "SELECT COALESCE(MAX(order_index), -1) + 1 AS n FROM os_website_pages WHERE project_id = :pid::uuid"
            ),
            {"pid": project_id},
        )
        order_index = int(ord_r.scalar() or 0)

        await self.session.execute(
            text(
                """
                INSERT INTO os_website_pages (
                    project_id, workspace_id, page_type, page_slug, landing_page_id, order_index
                )
                VALUES (:pid, :ws, :ptype, :slug, :lp::uuid, :ord)
                """
            ),
            {
                "pid": project_id,
                "ws": workspace_id,
                "ptype": page_type,
                "slug": page_slug,
                "lp": lp["id"],
                "ord": order_index,
            },
        )
        await self.session.execute(
            text(
                """
                UPDATE os_website_projects
                SET pages_count = pages_count + 1, updated_at = NOW()
                WHERE id = :id::uuid
                """
            ),
            {"id": project_id},
        )
        await self.session.commit()
        return await self.get_project(project_id, workspace_id) or {}

    async def delete_project(self, project_id: str, workspace_id: int) -> bool:
        await self.ensure_schema()
        await self._set_workspace(workspace_id)
        r = await self.session.execute(
            text(
                "DELETE FROM os_website_projects WHERE id = :id::uuid AND workspace_id = :ws RETURNING id"
            ),
            {"id": project_id, "ws": workspace_id},
        )
        await self.session.commit()
        return r.fetchone() is not None

    async def list_templates(self) -> list[dict[str, Any]]:
        await self.ensure_schema()
        r = await self.session.execute(
            text(
                """
                SELECT id, name, category, thumbnail_url, pages_structure, is_default
                FROM os_website_templates ORDER BY name
                """
            )
        )
        return [_row(x) for x in r.fetchall()]

    async def get_project_by_subdomain(self, subdomain: str) -> dict[str, Any] | None:
        await self.ensure_schema()
        r = await self.session.execute(
            text(
                """
                SELECT * FROM os_website_projects
                WHERE subdomain = :sub AND status = 'published'
                """
            ),
            {"sub": subdomain.lower()},
        )
        return _row(r.fetchone()) or None

    async def mark_generating(self, project_id: str) -> None:
        await self._set_project_status(project_id, "generating")

    async def get_seo_artifact(self, subdomain: str, artifact: str) -> str | None:
        project = await self.get_project_by_subdomain(subdomain)
        if not project:
            return None
        seo = _parse_jsonb(project.get("seo_artifacts")) or {}
        if artifact == "sitemap":
            return seo.get("sitemap_xml")
        if artifact == "robots":
            return seo.get("robots_txt")
        return None

    async def get_public_site_page(
        self, subdomain: str, page_slug: str | None = None
    ) -> dict[str, Any] | None:
        await self.ensure_schema()
        r = await self.session.execute(
            text(
                """
                SELECT * FROM os_website_projects
                WHERE subdomain = :sub AND status = 'published'
                """
            ),
            {"sub": subdomain.lower()},
        )
        project = _row(r.fetchone())
        if not project:
            return None

        slug = page_slug or "home"
        pr = await self.session.execute(
            text(
                """
                SELECT sp.*, lp.blocks, lp.meta, lp.name, lp.form_fields
                FROM os_website_pages sp
                LEFT JOIN landing_pages lp ON lp.id = sp.landing_page_id
                WHERE sp.project_id = :pid::uuid AND sp.page_slug = :slug AND sp.is_published = TRUE
                """
            ),
            {"pid": project["id"], "slug": slug},
        )
        page = _row(pr.fetchone())
        if not page:
            return None

        seo = _parse_jsonb(project.get("seo_artifacts")) or {}
        meta = _parse_jsonb(page.get("meta")) or {}
        return {
            "subdomain": subdomain,
            "project_name": project.get("name"),
            "page_slug": slug,
            "page_type": page.get("page_type"),
            "name": page.get("name"),
            "blocks": _parse_jsonb(page.get("blocks")) or [],
            "meta": meta,
            "form_fields": _parse_jsonb(page.get("form_fields")) or [],
            "navigation": await self._public_nav(project["id"]),
            "seo": {
                "robots_txt": seo.get("robots_txt"),
                "sitemap_url": f"/site/{subdomain}/sitemap.xml",
                "schema_org": meta.get("schema_org") or seo.get("schema_org"),
            },
        }

    async def get_site_analytics(self, project_id: str, workspace_id: int) -> dict[str, Any]:
        await self._set_workspace(workspace_id)
        pages = await self._list_project_pages(project_id)
        by_page: list[dict[str, Any]] = []
        total_visits = 0
        total_conversions = 0
        traffic: dict[str, int] = {}

        for page in pages:
            lp_id = page.get("landing_page_id")
            if not lp_id:
                continue
            r = await self.session.execute(
                text(
                    """
                    SELECT event_type, COUNT(*) AS cnt,
                           metadata->>'referrer' AS referrer
                    FROM landing_analytics
                    WHERE page_id = :pid::uuid
                    GROUP BY event_type, metadata->>'referrer'
                    """
                ),
                {"pid": lp_id},
            )
            visits = 0
            conversions = 0
            for row in r.fetchall():
                m = row._mapping
                et = m["event_type"]
                cnt = int(m["cnt"])
                if et == "impression":
                    visits += cnt
                    ref = m.get("referrer") or "direct"
                    traffic[ref] = traffic.get(ref, 0) + cnt
                elif et in ("conversion", "form_submit"):
                    conversions += cnt
            total_visits += visits
            total_conversions += conversions
            by_page.append(
                {
                    "page_slug": page.get("page_slug"),
                    "page_type": page.get("page_type"),
                    "visits": visits,
                    "conversions": conversions,
                }
            )

        rate = round(100 * total_conversions / total_visits, 2) if total_visits else 0.0
        return {
            "total_visits": total_visits,
            "total_conversions": total_conversions,
            "conversion_rate": rate,
            "traffic_sources": traffic,
            "by_page": by_page,
        }

    async def validate_custom_domain(self, domain: str) -> dict[str, Any]:
        domain_norm = domain.strip().lower().rstrip(".")
        records = await asyncio.to_thread(_resolve_cname_chain, domain_norm)
        target_lower = DEFAULT_CNAME_TARGET.lower()
        verified = any(
            rec.rstrip(".").lower() == target_lower
            or rec.rstrip(".").lower().endswith("." + target_lower)
            for rec in records
        )
        return {
            "domain": domain_norm,
            "expected_cname": DEFAULT_CNAME_TARGET,
            "records": records,
            "verified": verified,
        }

    async def _set_project_status(
        self, project_id: str, status: str, error: str | None = None
    ) -> None:
        await self.session.execute(
            text(
                """
                UPDATE os_website_projects
                SET status = :status, error_message = :err, updated_at = NOW()
                WHERE id = :id::uuid
                """
            ),
            {"id": project_id, "status": status, "err": error},
        )
        await self.session.commit()

    async def _get_project_raw(self, project_id: str) -> dict[str, Any] | None:
        r = await self.session.execute(
            text("SELECT * FROM os_website_projects WHERE id = :id::uuid"),
            {"id": project_id},
        )
        return _row(r.fetchone()) or None

    async def _list_project_pages(self, project_id: str) -> list[dict[str, Any]]:
        r = await self.session.execute(
            text(
                """
                SELECT sp.*, lp.name AS page_name, lp.status AS landing_status
                FROM os_website_pages sp
                LEFT JOIN landing_pages lp ON lp.id = sp.landing_page_id
                WHERE sp.project_id = :pid::uuid
                ORDER BY sp.order_index ASC
                """
            ),
            {"pid": project_id},
        )
        return [_row(x) for x in r.fetchall()]

    async def _get_site_page(self, project_id: str, page_slug: str) -> dict[str, Any] | None:
        r = await self.session.execute(
            text(
                """
                SELECT * FROM os_website_pages
                WHERE project_id = :pid::uuid AND page_slug = :slug
                """
            ),
            {"pid": project_id, "slug": page_slug},
        )
        return _row(r.fetchone()) or None

    async def _public_nav(self, project_id: str) -> list[dict[str, str]]:
        r = await self.session.execute(
            text(
                """
                SELECT page_slug, page_type FROM os_website_pages
                WHERE project_id = :pid::uuid AND is_published = TRUE
                ORDER BY order_index
                """
            ),
            {"pid": project_id},
        )
        return [
            {"slug": row._mapping["page_slug"], "label": PAGE_TYPE_LABELS.get(row._mapping["page_type"], row._mapping["page_type"])}
            for row in r.fetchall()
        ]

    async def _unique_subdomain(self, name: str) -> str:
        base = _slugify(name)[:30]
        for i in range(25):
            candidate = base if i == 0 else f"{base}-{uuid.uuid4().hex[:4]}"
            r = await self.session.execute(
                text("SELECT 1 FROM os_website_projects WHERE subdomain = :sub LIMIT 1"),
                {"sub": candidate},
            )
            if r.fetchone() is None:
                return candidate
        return f"{base}-{uuid.uuid4().hex[:6]}"

    def _site_url(self, subdomain: str | None) -> str | None:
        if not subdomain:
            return None
        return f"{SITE_BASE}/site/{subdomain}"

    async def _generate_page_content(
        self, business: dict[str, Any], page_type: str, page_slug: str
    ) -> dict[str, Any]:
        client = _openai_client()
        if not client:
            return {
                "title": PAGE_TYPE_LABELS.get(page_type, page_type),
                "blocks": self._fallback_blocks(business, page_type),
                "meta": self._fallback_meta(business, page_type, page_slug),
            }

        lang = business.get("language") or "es"
        prompt = (
            f"Genera contenido web en {lang} para la página '{page_type}' de un negocio.\n"
            f"Datos del negocio: {json.dumps(business, ensure_ascii=False)}\n"
            "Responde SOLO JSON válido con esta estructura:\n"
            '{"title":"...","meta":{"meta_title":"...","meta_description":"...","keywords":[]},'
            '"blocks":[{"type":"hero|text|cta|testimonials|pricing|faq|social_proof|form",'
            '"props":{...}}]}\n'
            "Usa 3-6 bloques relevantes para el tipo de página. Props editables: headline, subheadline, "
            "content, backgroundColor, textColor, padding, ctaText, ctaUrl, items (testimonials/faq)."
        )
        try:
            from services.finetuning_service import get_model_for_workspace

            ws = self.workspace_id
            model = WEB_MODEL
            if ws is not None:
                model = await get_model_for_workspace(self.session, ws)
            resp = await client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "Eres el agente NELVYON OS Diseño Web. Generas copy y bloques JSON para sitios web premium.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.5,
                response_format={"type": "json_object"},
            )
            raw = resp.choices[0].message.content or "{}"
            data = json.loads(raw)
            blocks = self._normalize_blocks(data.get("blocks") or [])
            meta = data.get("meta") or {}
            meta.setdefault("meta_title", data.get("title", page_slug))
            meta.setdefault("meta_description", business.get("description", "")[:160])
            meta["keywords"] = meta.get("keywords") or []
            return {"title": data.get("title"), "blocks": blocks, "meta": meta}
        except Exception as exc:
            logger.warning("AI page generation fallback: %s", exc)
            return {
                "title": PAGE_TYPE_LABELS.get(page_type, page_type),
                "blocks": self._fallback_blocks(business, page_type),
                "meta": self._fallback_meta(business, page_type, page_slug),
            }

    def _normalize_blocks(self, blocks: list) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        for blk in blocks:
            btype = blk.get("type", "text")
            if btype not in DEFAULT_BLOCK_PROPS:
                btype = "text"
            props = {**DEFAULT_BLOCK_PROPS.get(btype, {}), **(blk.get("props") or {})}
            out.append(
                {
                    "id": blk.get("id") or f"blk_{uuid.uuid4().hex[:10]}",
                    "type": btype,
                    "props": props,
                    "responsive": blk.get("responsive") or {"hideOnMobile": False, "orderMobile": 0},
                }
            )
        return out

    def _fallback_blocks(self, business: dict[str, Any], page_type: str) -> list[dict[str, Any]]:
        name = business.get("business_name") or "Negocio"
        desc = business.get("description") or f"Bienvenido a {name}"
        colors = business.get("brand_colors") or {}
        primary = colors.get("primary") or "#6366f1"
        blocks = [
            _make_block(
                "hero",
                headline=name if page_type == "home" else PAGE_TYPE_LABELS.get(page_type, page_type),
                subheadline=desc[:120],
                backgroundColor=primary,
                ctaText="Contactar",
                ctaUrl="#contact",
            ),
            _make_block("text", content=desc),
        ]
        if page_type in ("services", "pricing"):
            blocks.append(_make_block("pricing"))
        if page_type in ("about", "home"):
            blocks.append(_make_block("testimonials"))
        if page_type == "contact":
            blocks.append(_make_block("form"))
        if page_type == "faq":
            blocks.append(_make_block("faq"))
        blocks.append(_make_block("cta", headline="¿Listo para empezar?", buttonText="Contáctanos"))
        return blocks

    def _fallback_meta(
        self, business: dict[str, Any], page_type: str, page_slug: str
    ) -> dict[str, Any]:
        name = business.get("business_name") or "Negocio"
        title = f"{PAGE_TYPE_LABELS.get(page_type, page_type)} | {name}"
        return {
            "meta_title": title,
            "meta_description": (business.get("description") or title)[:160],
            "keywords": [name, business.get("sector", ""), page_type],
            "og_image": business.get("logo_url") or "",
            "canonical_url": "",
        }

    def _schema_org(self, business: dict[str, Any], page_type: str) -> dict[str, Any]:
        sector = (business.get("sector") or "").lower()
        schema_type = SCHEMA_BY_SECTOR.get(sector, "LocalBusiness")
        return {
            "@context": "https://schema.org",
            "@type": schema_type,
            "name": business.get("business_name"),
            "description": business.get("description"),
            "url": business.get("website_url"),
            "logo": business.get("logo_url"),
            "page_type": page_type,
        }

    def _build_seo_artifacts(
        self, project: dict[str, Any], pages: list[str], subdomain: str
    ) -> dict[str, Any]:
        base = f"{SITE_BASE}/site/{subdomain}"
        business = _parse_jsonb(project.get("business_info")) or {}
        schema_type = SCHEMA_BY_SECTOR.get((business.get("sector") or "").lower(), "LocalBusiness")

        urlset = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
        for p in pages:
            slug = "home" if p == "home" else _slugify(str(p))
            loc = base if slug == "home" else f"{base}/{slug}"
            url_el = ET.SubElement(urlset, "url")
            ET.SubElement(url_el, "loc").text = loc
            ET.SubElement(url_el, "changefreq").text = "weekly"
            ET.SubElement(url_el, "priority").text = "1.0" if slug == "home" else "0.8"
        sitemap_xml = ET.tostring(urlset, encoding="unicode", xml_declaration=True)

        robots_txt = (
            f"User-agent: *\nAllow: /\nSitemap: {base}/sitemap.xml\n"
        )

        schema_org = {
            "@context": "https://schema.org",
            "@type": schema_type,
            "name": business.get("business_name") or project.get("name"),
            "description": business.get("description"),
            "url": base,
            "logo": business.get("logo_url"),
        }

        return {
            "sitemap_xml": sitemap_xml,
            "robots_txt": robots_txt,
            "schema_org": schema_org,
        }

    async def build_website_json(
        self, project_id: str, workspace_id: int
    ) -> dict[str, Any]:
        project = await self.get_project(project_id, workspace_id)
        if not project:
            raise ValueError("Project not found")
        business = _parse_jsonb(project.get("business_info")) or {}
        pages_out: list[dict[str, Any]] = []
        for page in project.get("pages") or []:
            lp_id = page.get("landing_page_id")
            blocks: list[Any] = []
            meta: dict[str, Any] = {}
            if lp_id:
                r = await self.session.execute(
                    text("SELECT blocks, meta FROM landing_pages WHERE id = :id::uuid"),
                    {"id": lp_id},
                )
                lp = _row(r.fetchone())
                blocks = _parse_jsonb(lp.get("blocks")) or []
                meta = _parse_jsonb(lp.get("meta")) or {}
            pages_out.append(
                {
                    "id": page.get("id"),
                    "page_type": page.get("page_type"),
                    "page_slug": page.get("page_slug"),
                    "landing_page_id": lp_id,
                    "blocks": blocks,
                    "meta": meta,
                }
            )
        return {
            "project_id": project_id,
            "name": project.get("name"),
            "subdomain": project.get("subdomain"),
            "hero_image_url": business.get("hero_image_url"),
            "business_info": business,
            "pages": pages_out,
        }

    async def apply_website_json(
        self, project_id: str, workspace_id: int, website_json: dict[str, Any]
    ) -> None:
        landing_svc = LandingBuilderService(self.session, workspace_id)
        business = dict(website_json.get("business_info") or {})
        hero_url = website_json.get("hero_image_url") or business.get("hero_image_url")
        if hero_url:
            business["hero_image_url"] = hero_url
            await self.session.execute(
                text(
                    """
                    UPDATE os_website_projects
                    SET business_info = CAST(:info AS jsonb), updated_at = NOW()
                    WHERE id = :id::uuid
                    """
                ),
                {"info": _json_dumps(business), "id": project_id},
            )
        for page in website_json.get("pages") or []:
            lp_id = page.get("landing_page_id")
            if not lp_id:
                continue
            await landing_svc.update_page(
                lp_id,
                workspace_id,
                {
                    "blocks": page.get("blocks") or [],
                    "meta": page.get("meta") or {},
                },
            )
        await self.session.commit()
        try:
            await self.regenerate_static_export(project_id, workspace_id)
        except Exception as exc:
            logger.warning("static export after apply json failed: %s", exc)

    async def regenerate_static_export(
        self, project_id: str, workspace_id: int
    ) -> dict[str, Any]:
        project = await self.get_project(project_id, workspace_id)
        if not project:
            raise ValueError("Project not found")
        old_version = int(project.get("static_version") or 0)
        await invalidate_website(project_id, old_version)
        website_json = await self.build_website_json(project_id, workspace_id)
        subdomain = str(project.get("subdomain") or "site")
        export_result = await export_website_static(
            workspace_id=workspace_id,
            website_id=project_id,
            website_json=website_json,
            subdomain=subdomain,
            site_base=SITE_BASE,
        )
        new_version = old_version + 1
        await self.session.execute(
            text(
                """
                UPDATE os_website_projects
                SET static_version = :ver,
                    static_cdn_base = :cdn,
                    updated_at = NOW()
                WHERE id = :id::uuid AND workspace_id = :ws
                """
            ),
            {
                "ver": new_version,
                "cdn": export_result.get("cdn_base"),
                "id": project_id,
                "ws": workspace_id,
            },
        )
        await self.session.commit()
        payload = {**website_json, "static": export_result}
        await set_website_json(project_id, new_version, payload)
        return {"version": new_version, **export_result}

    async def get_static_urls(
        self, project_id: str, workspace_id: int
    ) -> dict[str, Any]:
        project = await self.get_project(project_id, workspace_id)
        if not project:
            raise ValueError("Project not found")
        version = int(project.get("static_version") or 0)
        cached = await get_website_json(project_id, version)
        if cached and cached.get("static"):
            static = cached["static"]
            return {
                "website_id": project_id,
                "version": version,
                "pages": static.get("pages", {}),
                "cdn_base": static.get("cdn_base") or project.get("static_cdn_base"),
                "index_url": static.get("index_url"),
                "cache_control": CACHE_HEADERS_WEBSITE,
            }
        cdn = project.get("static_cdn_base")
        if cdn:
            return {
                "website_id": project_id,
                "version": version,
                "cdn_base": cdn,
                "index_url": f"{cdn.rstrip('/')}/index.html",
                "pages": {"home": f"{cdn.rstrip('/')}/index.html"},
                "cache_control": CACHE_HEADERS_WEBSITE,
            }
        raise ValueError("Static HTML not exported yet")

    async def get_static_page_url(self, subdomain: str, page_slug: str | None) -> str | None:
        project = await self.get_project_by_subdomain(subdomain)
        if not project or not project.get("static_cdn_base"):
            return None
        slug = page_slug or "home"
        cdn = str(project["static_cdn_base"]).rstrip("/")
        if slug in ("home", "", "/"):
            return f"{cdn}/index.html"
        safe = re.sub(r"[^a-z0-9_-]+", "-", slug.lower())
        return f"{cdn}/{safe}.html"

    async def measure_website_performance(
        self, project_id: str, workspace_id: int
    ) -> dict[str, Any]:
        project = await self.get_project(project_id, workspace_id)
        if not project:
            raise ValueError("Project not found")
        try:
            static = await self.get_static_urls(project_id, workspace_id)
            url = static.get("index_url") or self._site_url(project.get("subdomain"))
        except ValueError:
            url = self._site_url(project.get("subdomain"))
        metrics = await run_pagespeed(url)
        await save_metrics(
            self.session,
            website_id=project_id,
            workspace_id=workspace_id,
            metrics=metrics,
        )
        score = metrics.get("performance_score")
        await maybe_alert_low_score(
            self.session,
            workspace_id=workspace_id,
            website_id=project_id,
            score=score,
            project_name=str(project.get("name") or project_id),
        )
        latest = await get_latest_metrics(self.session, project_id, workspace_id)
        return {
            "website_id": project_id,
            "measured_url": url,
            "metrics": latest or metrics,
            "traffic_light": _performance_traffic_light(score),
        }

    async def get_website_performance(
        self, project_id: str, workspace_id: int
    ) -> dict[str, Any]:
        project = await self.get_project(project_id, workspace_id)
        if not project:
            raise ValueError("Project not found")
        latest = await get_latest_metrics(self.session, project_id, workspace_id)
        score = (latest or {}).get("performance_score")
        return {
            "website_id": project_id,
            "metrics": latest,
            "traffic_light": _performance_traffic_light(score),
        }

    async def score_website_design(
        self, project_id: str, workspace_id: int
    ) -> dict[str, Any]:
        from agents.design_scorer_agent import get_design_scorer_agent

        website_json = await self.build_website_json(project_id, workspace_id)
        result = await get_design_scorer_agent().score_website(website_json)
        result["website_id"] = project_id
        return result

    async def improve_website_design(
        self, project_id: str, workspace_id: int
    ) -> dict[str, Any]:
        website_json = await self.build_website_json(project_id, workspace_id)
        improved, design_eval = await run_design_score_and_improve(website_json)
        await self.apply_website_json(project_id, workspace_id, improved)
        try:
            await self.regenerate_static_export(project_id, workspace_id)
        except Exception as exc:
            logger.warning("static export after improve failed: %s", exc)
        return {
            "website_id": project_id,
            "design_evaluation": design_eval,
            "project": await self.get_project(project_id, workspace_id),
        }


def _performance_traffic_light(score: int | None) -> str:
    if score is None:
        return "unknown"
    if score >= 80:
        return "green"
    if score >= 50:
        return "yellow"
    return "red"


def get_os_web_builder_service(
    session: AsyncSession, workspace_id: int | None = None
) -> OsWebBuilderService:
    return OsWebBuilderService(session, workspace_id)
