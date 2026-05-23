"""NELVYON landing page builder — pages, blocks, A/B, analytics, forms."""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import db_manager
from core.redis_adapter import redis_client
from services.crm_service import CRMService
from services.tenant_service import TenantService
from services.whitelabel_service import DEFAULT_CNAME_TARGET, _resolve_cname_chain

logger = logging.getLogger(__name__)

_SCHEMA_READY = False
_SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

BLOCK_TYPES = frozenset(
    {
        "hero",
        "text",
        "image",
        "video",
        "cta",
        "form",
        "testimonials",
        "pricing",
        "faq",
        "countdown",
        "social_proof",
    }
)

DEFAULT_BLOCK_PROPS: dict[str, dict[str, Any]] = {
    "hero": {
        "headline": "Your headline here",
        "subheadline": "Supporting text",
        "backgroundColor": "#0f172a",
        "textColor": "#ffffff",
        "fontFamily": "Inter, sans-serif",
        "padding": "80px 24px",
        "imageUrl": "",
        "ctaText": "Get started",
        "ctaUrl": "#",
    },
    "text": {
        "content": "Rich text content",
        "textColor": "#1e293b",
        "fontFamily": "Inter, sans-serif",
        "padding": "48px 24px",
        "backgroundColor": "#ffffff",
    },
    "image": {
        "imageUrl": "",
        "alt": "",
        "padding": "24px",
        "borderRadius": "8px",
    },
    "video": {
        "videoUrl": "",
        "posterUrl": "",
        "autoplay": False,
        "padding": "24px",
    },
    "cta": {
        "headline": "Ready to start?",
        "buttonText": "Sign up",
        "buttonUrl": "#",
        "backgroundColor": "#6366f1",
        "textColor": "#ffffff",
        "padding": "64px 24px",
    },
    "form": {
        "headline": "Contact us",
        "submitText": "Submit",
        "backgroundColor": "#f8fafc",
        "padding": "48px 24px",
    },
    "testimonials": {
        "items": [{"quote": "Great product!", "author": "Jane Doe", "role": "CEO"}],
        "backgroundColor": "#ffffff",
        "padding": "48px 24px",
    },
    "pricing": {
        "plans": [
            {"name": "Starter", "price": "€29", "features": ["Feature A", "Feature B"]},
            {"name": "Pro", "price": "€99", "features": ["Everything in Starter", "Feature C"]},
        ],
        "padding": "48px 24px",
    },
    "faq": {
        "items": [{"question": "How does it work?", "answer": "It just works."}],
        "padding": "48px 24px",
    },
    "countdown": {
        "targetDate": "",
        "headline": "Offer ends soon",
        "backgroundColor": "#fef3c7",
        "padding": "32px 24px",
    },
    "social_proof": {
        "stats": [{"label": "Customers", "value": "10k+"}],
        "logos": [],
        "padding": "32px 24px",
    },
}


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


def _slugify(name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:48]
    return base or "page"


def _default_responsive() -> dict[str, Any]:
    return {"hideOnMobile": False, "orderMobile": 0}


def _make_block(block_type: str, **overrides: Any) -> dict[str, Any]:
    props = {**DEFAULT_BLOCK_PROPS.get(block_type, {}), **overrides}
    return {
        "id": f"blk_{uuid.uuid4().hex[:10]}",
        "type": block_type,
        "props": props,
        "responsive": _default_responsive(),
    }


def _template_blocks(category: str) -> list[dict[str, Any]]:
    """Build starter blocks per template category."""
    hero_overrides: dict[str, dict[str, Any]] = {
        "saas": {"headline": "Scale your SaaS faster", "subheadline": "All-in-one growth platform"},
        "ecommerce": {"headline": "Shop the collection", "subheadline": "Free shipping over €50"},
        "lead_gen": {"headline": "Get your free guide", "subheadline": "Join 5,000+ subscribers"},
        "evento": {"headline": "Join us live", "subheadline": "Register for the upcoming event"},
        "portfolio": {"headline": "Creative portfolio", "subheadline": "Selected works & case studies"},
        "restaurante": {"headline": "Reserva tu mesa", "subheadline": "Cocina de autor en el centro"},
        "inmobiliaria": {"headline": "Tu próximo hogar", "subheadline": "Propiedades exclusivas"},
        "consultoria": {"headline": "Consultoría estratégica", "subheadline": "Resultados medibles"},
        "curso_online": {"headline": "Aprende a tu ritmo", "subheadline": "Curso online certificado"},
        "app_movil": {"headline": "Download the app", "subheadline": "Available on iOS & Android"},
    }
    cat = category.lower().replace(" ", "_")
    blocks = [
        _make_block("hero", **hero_overrides.get(cat, {})),
        _make_block("text", content=f"Welcome to our {category} landing page."),
        _make_block("cta"),
    ]
    if cat in ("lead_gen", "consultoria", "curso_online"):
        blocks.insert(2, _make_block("form"))
    if cat in ("ecommerce", "saas", "app_movil"):
        blocks.insert(2, _make_block("pricing"))
    if cat in ("restaurante", "inmobiliaria", "evento"):
        blocks.insert(2, _make_block("testimonials"))
    blocks.append(_make_block("faq"))
    return blocks


TEMPLATE_CATALOG = [
    ("SaaS Launch", "saas"),
    ("E-commerce Store", "ecommerce"),
    ("Lead Generation", "lead_gen"),
    ("Event Registration", "evento"),
    ("Creative Portfolio", "portfolio"),
    ("Restaurant Booking", "restaurante"),
    ("Real Estate Listing", "inmobiliaria"),
    ("Consulting Services", "consultoria"),
    ("Online Course", "curso_online"),
    ("Mobile App", "app_movil"),
]


class LandingBuilderService:
    """Visual landing page builder with A/B testing and analytics."""

    def __init__(self, session: AsyncSession, workspace_id: int | None = None):
        self.session = session
        self.workspace_id = int(workspace_id) if workspace_id is not None else None

    @staticmethod
    async def ensure_schema() -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        await TenantService.ensure_schema()
        if not db_manager.async_session_maker:
            await db_manager.ensure_initialized()
        sql_path = Path(__file__).resolve().parent.parent / "migrations" / "landing_builder.sql"
        if sql_path.exists():
            raw = sql_path.read_text(encoding="utf-8")
            async with db_manager.async_session_maker() as session:
                for stmt in [s.strip() for s in raw.split(";") if s.strip()]:
                    try:
                        await session.execute(text(stmt))
                    except Exception as exc:
                        if "already exists" not in str(exc).lower():
                            logger.debug("landing_builder schema skipped: %s", exc)
                await session.commit()
        await LandingBuilderService._seed_templates()
        _SCHEMA_READY = True

    @staticmethod
    async def _seed_templates() -> None:
        if not db_manager.async_session_maker:
            return
        async with db_manager.async_session_maker() as session:
            r = await session.execute(text("SELECT COUNT(*) AS c FROM landing_templates"))
            if int(r.scalar() or 0) >= len(TEMPLATE_CATALOG):
                return
            for name, category in TEMPLATE_CATALOG:
                blocks = _template_blocks(category)
                await session.execute(
                    text(
                        """
                        INSERT INTO landing_templates (name, category, thumbnail_url, blocks, is_default)
                        SELECT :name, :cat, :thumb, CAST(:blocks AS jsonb), TRUE
                        WHERE NOT EXISTS (
                            SELECT 1 FROM landing_templates WHERE category = :cat AND is_default = TRUE
                        )
                        """
                    ),
                    {
                        "name": name,
                        "cat": category,
                        "thumb": f"https://cdn.nelvyon.com/templates/{category}.png",
                        "blocks": _json_dumps(blocks),
                    },
                )
            await session.commit()

    async def _set_workspace(self, workspace_id: int) -> None:
        await TenantService(self.session).set_tenant_context(workspace_id)

    async def create_page(
        self,
        workspace_id: int,
        name: str,
        *,
        blocks: list | None = None,
        meta: dict | None = None,
        form_fields: list | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_workspace(workspace_id)
        page_id = str(uuid.uuid4())
        default_meta = {
            "meta_title": name,
            "meta_description": "",
            "og_image": "",
            "canonical_url": "",
        }
        merged_meta = {**default_meta, **(meta or {})}
        r = await self.session.execute(
            text(
                """
                INSERT INTO landing_pages (
                    id, workspace_id, name, blocks, meta, form_fields
                )
                VALUES (
                    :id, :ws, :name, CAST(:blocks AS jsonb),
                    CAST(:meta AS jsonb), CAST(:form_fields AS jsonb)
                )
                RETURNING *
                """
            ),
            {
                "id": page_id,
                "ws": workspace_id,
                "name": name.strip(),
                "blocks": _json_dumps(blocks or []),
                "meta": _json_dumps(merged_meta),
                "form_fields": _json_dumps(form_fields or []),
            },
        )
        await self.session.commit()
        return _row(r.fetchone())

    async def get_page(self, page_id: str, workspace_id: int | None = None) -> dict[str, Any] | None:
        await self.ensure_schema()
        if workspace_id is not None:
            await self._set_workspace(workspace_id)
        r = await self.session.execute(
            text("SELECT * FROM landing_pages WHERE id = :id::uuid"),
            {"id": page_id},
        )
        row = _row(r.fetchone())
        if not row:
            return None
        if workspace_id is not None and int(row["workspace_id"]) != int(workspace_id):
            return None
        return row

    async def update_page(
        self, page_id: str, workspace_id: int, updates: dict[str, Any]
    ) -> dict[str, Any]:
        await self.ensure_schema()
        existing = await self.get_page(page_id, workspace_id)
        if not existing:
            raise ValueError("Page not found")
        await self._set_workspace(workspace_id)

        sets = ["updated_at = NOW()"]
        params: dict[str, Any] = {"id": page_id}

        if "name" in updates:
            sets.append("name = :name")
            params["name"] = updates["name"]
        if "blocks" in updates:
            self._validate_blocks(updates["blocks"])
            sets.append("blocks = CAST(:blocks AS jsonb)")
            params["blocks"] = _json_dumps(updates["blocks"])
        if "meta" in updates:
            sets.append("meta = CAST(:meta AS jsonb)")
            params["meta"] = _json_dumps(updates["meta"])
        if "ab_config" in updates:
            sets.append("ab_config = CAST(:ab_config AS jsonb)")
            params["ab_config"] = _json_dumps(updates["ab_config"])
        if "custom_domain" in updates:
            sets.append("custom_domain = :custom_domain")
            params["custom_domain"] = updates["custom_domain"]
            sets.append("domain_verified = FALSE")
        if "form_fields" in updates:
            sets.append("form_fields = CAST(:form_fields AS jsonb)")
            params["form_fields"] = _json_dumps(updates["form_fields"])
        if "status" in updates:
            sets.append("status = :status")
            params["status"] = updates["status"]

        await self.session.execute(
            text(f"UPDATE landing_pages SET {', '.join(sets)} WHERE id = :id::uuid"),
            params,
        )
        await self.session.commit()
        return await self.get_page(page_id, workspace_id) or {}

    async def delete_page(self, page_id: str, workspace_id: int) -> bool:
        await self.ensure_schema()
        await self._set_workspace(workspace_id)
        r = await self.session.execute(
            text(
                "DELETE FROM landing_pages WHERE id = :id::uuid AND workspace_id = :ws RETURNING id"
            ),
            {"id": page_id, "ws": workspace_id},
        )
        await self.session.commit()
        return r.fetchone() is not None

    async def list_pages(
        self, workspace_id: int, *, status: str | None = None
    ) -> list[dict[str, Any]]:
        await self.ensure_schema()
        await self._set_workspace(workspace_id)
        q = """
            SELECT id, workspace_id, name, slug, status, custom_domain,
                   domain_verified, published_at, created_at, updated_at,
                   meta->>'meta_title' AS meta_title
            FROM landing_pages
            WHERE workspace_id = :ws
        """
        params: dict[str, Any] = {"ws": workspace_id}
        if status:
            q += " AND status = :status"
            params["status"] = status
        q += " ORDER BY updated_at DESC"
        r = await self.session.execute(text(q), params)
        return [_row(x) for x in r.fetchall()]

    async def publish_page(self, page_id: str, workspace_id: int) -> dict[str, Any]:
        await self.ensure_schema()
        page = await self.get_page(page_id, workspace_id)
        if not page:
            raise ValueError("Page not found")

        slug = page.get("slug")
        if not slug:
            slug = await self._unique_slug(page["name"])

        if page.get("custom_domain"):
            check = await self.validate_custom_domain(page["custom_domain"])
            if not check["verified"]:
                raise ValueError(
                    f"CNAME for {page['custom_domain']} must point to {DEFAULT_CNAME_TARGET}"
                )

        await self.session.execute(
            text(
                """
                UPDATE landing_pages
                SET status = 'published', slug = :slug, published_at = NOW(), updated_at = NOW(),
                    domain_verified = :verified
                WHERE id = :id::uuid AND workspace_id = :ws
                """
            ),
            {
                "id": page_id,
                "ws": workspace_id,
                "slug": slug,
                "verified": bool(page.get("custom_domain")),
            },
        )
        await self.session.commit()
        updated = await self.get_page(page_id, workspace_id) or {}
        updated["public_url"] = f"/p/{slug}"
        return updated

    async def unpublish_page(self, page_id: str, workspace_id: int) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_workspace(workspace_id)
        await self.session.execute(
            text(
                """
                UPDATE landing_pages
                SET status = 'draft', updated_at = NOW()
                WHERE id = :id::uuid AND workspace_id = :ws
                """
            ),
            {"id": page_id, "ws": workspace_id},
        )
        await self.session.commit()
        return await self.get_page(page_id, workspace_id) or {}

    async def get_public_page(self, slug: str) -> dict[str, Any] | None:
        await self.ensure_schema()
        r = await self.session.execute(
            text(
                """
                SELECT id, name, slug, blocks, meta, ab_config, form_fields, custom_domain
                FROM landing_pages
                WHERE slug = :slug AND status = 'published'
                """
            ),
            {"slug": slug},
        )
        return _row(r.fetchone()) or None

    async def validate_custom_domain(self, domain: str) -> dict[str, Any]:
        domain_norm = domain.strip().lower().rstrip(".")
        if not domain_norm:
            raise ValueError("Domain is required")
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

    async def create_variant(
        self, page_id: str, workspace_id: int, variant_name: str
    ) -> dict[str, Any]:
        page = await self.get_page(page_id, workspace_id)
        if not page:
            raise ValueError("Page not found")
        ab = _parse_jsonb(page.get("ab_config")) or {}
        variants = ab.get("variants") or []
        if not variants:
            variants = [
                {
                    "id": "control",
                    "name": "Control",
                    "weight": 50,
                    "blocks": _parse_jsonb(page.get("blocks")) or [],
                }
            ]
        variant_id = f"var_{uuid.uuid4().hex[:8]}"
        new_variant = {
            "id": variant_id,
            "name": variant_name,
            "weight": 50,
            "blocks": _parse_jsonb(page.get("blocks")) or [],
        }
        variants.append(new_variant)
        total = sum(int(v.get("weight", 50)) for v in variants)
        if total > 0:
            for v in variants:
                v["weight"] = round(100 * int(v.get("weight", 50)) / total)
        ab["enabled"] = True
        ab["variants"] = variants
        return await self.update_page(page_id, workspace_id, {"ab_config": ab})

    async def pick_variant(self, page: dict[str, Any], visitor_id: str) -> str:
        ab = _parse_jsonb(page.get("ab_config")) or {}
        variants = ab.get("variants") or []
        if not ab.get("enabled") or len(variants) < 2:
            return "control"
        key = f"landing:ab:{page['id']}:{visitor_id}"
        await redis_client.initialize()
        cached = await redis_client.get(key)
        if cached:
            return cached
        h = int(hashlib.sha256(f"{page['id']}:{visitor_id}".encode()).hexdigest(), 16)
        bucket = h % 100
        cumulative = 0
        chosen = variants[0].get("id", "control")
        for v in variants:
            cumulative += int(v.get("weight", 50))
            if bucket < cumulative:
                chosen = v.get("id", "control")
                break
        await redis_client.set(key, chosen, ttl=86400 * 30)
        return chosen

    async def track_impression(
        self,
        page_id: str,
        *,
        variant: str | None = None,
        visitor_id: str | None = None,
        metadata: dict | None = None,
    ) -> dict[str, Any]:
        page = await self._get_published_page(page_id)
        if not page:
            raise ValueError("Published page not found")
        vid = visitor_id or uuid.uuid4().hex
        var = variant or await self.pick_variant(page, vid)
        await self._insert_analytics(
            page_id, var, "impression", {**(metadata or {}), "visitor_id": vid}
        )
        blocks = self._blocks_for_variant(page, var)
        return {"variant": var, "visitor_id": vid, "blocks": blocks}

    async def track_conversion(
        self,
        page_id: str,
        *,
        variant: str = "control",
        goal: str | None = None,
        metadata: dict | None = None,
    ) -> dict[str, Any]:
        page = await self._get_published_page(page_id)
        if not page:
            raise ValueError("Published page not found")
        meta = {**(metadata or {}), "goal": goal or "default"}
        await self._insert_analytics(page_id, variant, "conversion", meta)
        return {"tracked": True, "variant": variant, "goal": goal}

    async def submit_form(
        self, page_id: str, data: dict[str, Any], *, visitor_id: str | None = None
    ) -> dict[str, Any]:
        page = await self._get_published_page(page_id)
        if not page:
            raise ValueError("Published page not found")
        workspace_id = int(page["workspace_id"])
        slug = page.get("slug") or "unknown"
        tag = f"landing_{slug}"

        name = (
            data.get("name")
            or data.get("full_name")
            or data.get("email")
            or "Landing lead"
        )
        email = data.get("email")
        phone = data.get("phone")
        company = data.get("company")

        await self._set_workspace(workspace_id)
        crm = CRMService(self.session, workspace_id)
        contact = await crm.create_contact(
            name=str(name),
            email=str(email) if email else None,
            phone=str(phone) if phone else None,
            company=str(company) if company else None,
            tags=[tag, "landing_page"],
            metadata={"source": "landing_form", "page_id": page_id, "form_data": data},
        )
        var = data.get("variant") or "control"
        await self._insert_analytics(
            page_id,
            var,
            "form_submit",
            {"visitor_id": visitor_id, "contact_id": contact.get("id")},
        )
        return {"success": True, "contact_id": contact.get("id")}

    async def get_analytics(self, page_id: str, workspace_id: int) -> dict[str, Any]:
        page = await self.get_page(page_id, workspace_id)
        if not page:
            raise ValueError("Page not found")
        await self._set_workspace(workspace_id)

        r = await self.session.execute(
            text(
                """
                SELECT variant, event_type, COUNT(*) AS cnt,
                       metadata->>'referrer' AS referrer
                FROM landing_analytics
                WHERE page_id = :pid::uuid
                GROUP BY variant, event_type, metadata->>'referrer'
                """
            ),
            {"pid": page_id},
        )
        rows = [_row(x) for x in r.fetchall()]

        impressions = sum(int(x["cnt"]) for x in rows if x["event_type"] == "impression")
        conversions = sum(int(x["cnt"]) for x in rows if x["event_type"] == "conversion")
        form_submits = sum(int(x["cnt"]) for x in rows if x["event_type"] == "form_submit")

        by_variant: dict[str, dict[str, int]] = {}
        traffic_sources: dict[str, int] = {}
        for row in rows:
            v = row.get("variant") or "control"
            by_variant.setdefault(v, {"impressions": 0, "conversions": 0, "form_submits": 0})
            et = row["event_type"]
            cnt = int(row["cnt"])
            if et == "impression":
                by_variant[v]["impressions"] += cnt
            elif et == "conversion":
                by_variant[v]["conversions"] += cnt
            elif et == "form_submit":
                by_variant[v]["form_submits"] += cnt
            if row.get("referrer") and et == "impression":
                ref = row["referrer"] or "direct"
                traffic_sources[ref] = traffic_sources.get(ref, 0) + cnt

        time_r = await self.session.execute(
            text(
                """
                SELECT AVG((metadata->>'seconds')::float) AS avg_seconds
                FROM landing_analytics
                WHERE page_id = :pid::uuid AND event_type = 'time_on_page'
                """
            ),
            {"pid": page_id},
        )
        avg_time = time_r.scalar()

        conv_rate = round(100 * conversions / impressions, 2) if impressions else 0.0
        return {
            "page_id": page_id,
            "visits": impressions,
            "conversions": conversions,
            "form_submits": form_submits,
            "conversion_rate": conv_rate,
            "avg_time_on_page_seconds": float(avg_time) if avg_time else 0,
            "traffic_sources": traffic_sources,
            "by_variant": by_variant,
        }

    async def list_templates(self) -> list[dict[str, Any]]:
        await self.ensure_schema()
        r = await self.session.execute(
            text(
                """
                SELECT id, name, category, thumbnail_url, is_default, created_at
                FROM landing_templates
                ORDER BY category
                """
            )
        )
        return [_row(x) for x in r.fetchall()]

    async def get_template(self, template_id: str) -> dict[str, Any] | None:
        await self.ensure_schema()
        r = await self.session.execute(
            text("SELECT * FROM landing_templates WHERE id = :id::uuid"),
            {"id": template_id},
        )
        return _row(r.fetchone()) or None

    async def create_page_from_template(
        self, workspace_id: int, template_id: str, *, name: str | None = None
    ) -> dict[str, Any]:
        tpl = await self.get_template(template_id)
        if not tpl:
            raise ValueError("Template not found")
        blocks = _parse_jsonb(tpl.get("blocks")) or []
        page_name = name or tpl["name"]
        return await self.create_page(workspace_id, page_name, blocks=blocks)

    async def _unique_slug(self, name: str) -> str:
        base = _slugify(name)
        for i in range(20):
            candidate = base if i == 0 else f"{base}-{uuid.uuid4().hex[:6]}"
            r = await self.session.execute(
                text("SELECT 1 FROM landing_pages WHERE slug = :slug LIMIT 1"),
                {"slug": candidate},
            )
            if r.fetchone() is None:
                return candidate
        return f"{base}-{uuid.uuid4().hex[:8]}"

    async def _get_published_page(self, page_id: str) -> dict[str, Any] | None:
        r = await self.session.execute(
            text(
                """
                SELECT * FROM landing_pages
                WHERE id = :id::uuid AND status = 'published'
                """
            ),
            {"id": page_id},
        )
        return _row(r.fetchone()) or None

    async def _insert_analytics(
        self, page_id: str, variant: str, event_type: str, metadata: dict
    ) -> None:
        await self.session.execute(
            text(
                """
                INSERT INTO landing_analytics (page_id, variant, event_type, metadata)
                VALUES (:pid, :variant, :etype, CAST(:meta AS jsonb))
                """
            ),
            {
                "pid": page_id,
                "variant": variant,
                "etype": event_type,
                "meta": _json_dumps(metadata),
            },
        )
        await self.session.commit()

    def _blocks_for_variant(self, page: dict[str, Any], variant_id: str) -> list:
        ab = _parse_jsonb(page.get("ab_config")) or {}
        for v in ab.get("variants") or []:
            if v.get("id") == variant_id:
                return v.get("blocks") or []
        return _parse_jsonb(page.get("blocks")) or []

    def _validate_blocks(self, blocks: list) -> None:
        if not isinstance(blocks, list):
            raise ValueError("blocks must be a list")
        for blk in blocks:
            if blk.get("type") not in BLOCK_TYPES:
                raise ValueError(f"Invalid block type: {blk.get('type')}")


def get_landing_builder_service(
    session: AsyncSession, workspace_id: int | None = None
) -> LandingBuilderService:
    return LandingBuilderService(session, workspace_id)
