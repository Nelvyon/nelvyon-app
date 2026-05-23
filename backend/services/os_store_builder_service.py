"""NELVYON OS Store Builder — AI-generated online stores with Stripe."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import uuid
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any

import stripe
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import db_manager
from services.landing_builder_service import LandingBuilderService, _make_block
from services.tenant_service import TenantService
from services.whitelabel_service import DEFAULT_CNAME_TARGET, _resolve_cname_chain

logger = logging.getLogger(__name__)

_SCHEMA_READY = False
STORE_MODEL = "gpt-4o"
STORE_BASE = os.environ.get("NELVYON_STORE_BASE", "https://nelvyon.com").rstrip("/")

STORE_PAGE_TYPES = [
    ("home", "home", 0),
    ("catalogo", "productos", 1),
    ("producto", "producto", 2),
    ("carrito", "carrito", 3),
    ("checkout", "checkout", 4),
    ("about", "about", 5),
    ("contacto", "contacto", 6),
    ("politica-envios", "politica-envios", 7),
    ("politica-devoluciones", "politica-devoluciones", 8),
]

STORE_TEMPLATES = [
    ("Moda & Ropa", "moda", [{"name": "Camiseta Premium", "price": 29.99, "category": "moda"}]),
    ("Electrónica", "electronica", [{"name": "Auriculares Pro", "price": 89.99, "category": "electronica"}]),
    ("Alimentación", "alimentacion", [{"name": "Cesta Gourmet", "price": 49.99, "category": "alimentacion"}]),
    ("Belleza", "belleza", [{"name": "Kit Skincare", "price": 39.99, "category": "belleza"}]),
    ("Deporte", "deporte", [{"name": "Zapatillas Running", "price": 79.99, "category": "deporte"}]),
    ("Hogar", "hogar", [{"name": "Lámpara Nordic", "price": 59.99, "category": "hogar"}]),
    ("Joyería", "joyeria", [{"name": "Collar Plata", "price": 99.99, "category": "joyeria"}]),
    ("Arte digital", "arte_digital", [{"name": "Print Digital", "price": 19.99, "category": "arte_digital"}]),
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
        elif isinstance(v, Decimal):
            data[k] = float(v)
    return data


def _parse_jsonb(val: Any) -> Any:
    if isinstance(val, str):
        return json.loads(val)
    return val if val is not None else {}


def _slugify(text_val: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", text_val.lower()).strip("-")[:40]
    return base or "producto"


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


def _stripe_configured() -> bool:
    key = (settings.stripe_secret_key or os.environ.get("STRIPE_SECRET_KEY", "")).strip()
    return bool(key)


def _ensure_stripe_key() -> bool:
    key = (settings.stripe_secret_key or os.environ.get("STRIPE_SECRET_KEY", "")).strip()
    if not key:
        return False
    stripe.api_key = key
    return True


class OsStoreBuilderService:
    """AI-powered online store builder with Stripe checkout."""

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
        sql_path = Path(__file__).resolve().parent.parent / "migrations" / "os_store_builder.sql"
        if sql_path.exists():
            raw = sql_path.read_text(encoding="utf-8")
            async with db_manager.async_session_maker() as session:
                for stmt in [s.strip() for s in raw.split(";") if s.strip()]:
                    try:
                        await session.execute(text(stmt))
                    except Exception as exc:
                        if "already exists" not in str(exc).lower():
                            logger.debug("os_store_builder schema skipped: %s", exc)
                await session.commit()
        await OsStoreBuilderService._seed_templates()
        _SCHEMA_READY = True

    @staticmethod
    async def _seed_templates() -> None:
        if not db_manager.async_session_maker:
            return
        async with db_manager.async_session_maker() as session:
            r = await session.execute(text("SELECT COUNT(*) FROM os_store_templates"))
            if int(r.scalar() or 0) >= len(STORE_TEMPLATES):
                return
            for name, category, samples in STORE_TEMPLATES:
                defaults = {
                    "sector": category,
                    "language": "es",
                    "currency": "EUR",
                    "country_code": "ES",
                    "payment_methods": ["stripe"],
                }
                await session.execute(
                    text(
                        """
                        INSERT INTO os_store_templates (
                            name, category, thumbnail_url, store_info_defaults, sample_products
                        )
                        SELECT :name, :cat, :thumb, CAST(:defaults AS jsonb), CAST(:samples AS jsonb)
                        WHERE NOT EXISTS (
                            SELECT 1 FROM os_store_templates WHERE category = :cat
                        )
                        """
                    ),
                    {
                        "name": name,
                        "cat": category,
                        "thumb": f"https://cdn.nelvyon.com/store-templates/{category}.png",
                        "defaults": _json_dumps(defaults),
                        "samples": _json_dumps(samples),
                    },
                )
            await session.commit()

    async def _set_workspace(self, workspace_id: int) -> None:
        await TenantService(self.session).set_tenant_context(workspace_id)

    async def create_store_project(
        self, workspace_id: int, store_info: dict[str, Any]
    ) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_workspace(workspace_id)
        name = (store_info.get("store_name") or store_info.get("name") or "Mi tienda").strip()
        subdomain = await self._unique_subdomain(store_info.get("subdomain") or name)
        currency = (store_info.get("currency") or "EUR").upper()
        country = (store_info.get("country_code") or "ES").upper()
        project_id = str(uuid.uuid4())

        r = await self.session.execute(
            text(
                """
                INSERT INTO os_store_projects (
                    id, workspace_id, name, subdomain, store_info, currency, country_code
                )
                VALUES (:id, :ws, :name, :sub, CAST(:info AS jsonb), :cur, :country)
                RETURNING *
                """
            ),
            {
                "id": project_id,
                "ws": workspace_id,
                "name": name,
                "sub": subdomain,
                "info": _json_dumps(store_info),
                "cur": currency,
                "country": country,
            },
        )
        await self.session.commit()
        row = _row(r.fetchone())
        row["store_url"] = self._store_url(subdomain)
        return row

    async def list_projects(self, workspace_id: int) -> list[dict[str, Any]]:
        await self.ensure_schema()
        await self._set_workspace(workspace_id)
        r = await self.session.execute(
            text(
                """
                SELECT id, workspace_id, name, subdomain, status, currency,
                       pages_count, custom_domain, created_at, updated_at
                FROM os_store_projects
                WHERE workspace_id = :ws
                ORDER BY updated_at DESC
                """
            ),
            {"ws": workspace_id},
        )
        return [{**_row(x), "store_url": self._store_url(_row(x).get("subdomain"))} for x in r.fetchall()]

    async def get_project(
        self, project_id: str, workspace_id: int | None = None
    ) -> dict[str, Any] | None:
        await self.ensure_schema()
        if workspace_id is not None:
            await self._set_workspace(workspace_id)
        q = "SELECT * FROM os_store_projects WHERE id = :id::uuid"
        params: dict[str, Any] = {"id": project_id}
        if workspace_id is not None:
            q += " AND workspace_id = :ws"
            params["ws"] = workspace_id
        r = await self.session.execute(text(q), params)
        project = _row(r.fetchone())
        if not project:
            return None
        project["pages"] = await self._list_pages(project_id)
        project["products"] = await self._list_products(project_id, active_only=False)
        project["store_url"] = self._store_url(project.get("subdomain"))
        return project

    async def mark_generating(self, project_id: str) -> None:
        await self._set_status(project_id, "generating")

    async def mark_error(self, project_id: str, message: str) -> None:
        await self._set_status(project_id, "error", message)

    async def generate_store_with_ai(self, project_id: str) -> dict[str, Any]:
        project = await self._get_project_raw(project_id)
        if not project:
            raise ValueError("Project not found")
        workspace_id = int(project["workspace_id"])
        await self._set_workspace(workspace_id)
        await self._set_status(project_id, "generating")

        store_info = _parse_jsonb(project.get("store_info")) or {}
        currency = project.get("currency") or "EUR"
        subdomain = project.get("subdomain") or "store"
        landing_svc = LandingBuilderService(self.session, workspace_id)

        try:
            copy = await self._generate_store_copy(store_info)
            for page_type, page_slug, order_idx in STORE_PAGE_TYPES:
                blocks = self._page_blocks(page_type, store_info, copy)
                meta = self._page_meta(page_type, store_info, copy)
                meta["os_store_project_id"] = project_id
                meta["page_type"] = page_type

                lp = await landing_svc.create_page(
                    workspace_id,
                    meta.get("meta_title") or page_slug,
                    blocks=blocks,
                    meta=meta,
                )
                global_slug = f"store-{subdomain}-{page_slug}"
                await self.session.execute(
                    text("UPDATE landing_pages SET slug = :slug WHERE id = :id::uuid"),
                    {"slug": global_slug, "id": lp["id"]},
                )
                await self._upsert_store_page(
                    project_id, workspace_id, page_type, page_slug, lp["id"], order_idx
                )

            initial_products = store_info.get("productos_iniciales") or store_info.get("initial_products") or []
            if not initial_products:
                initial_products = copy.get("sample_products") or []

            for prod in initial_products:
                await self._create_product_impl(
                    project_id, workspace_id, prod, currency, store_info, ai=True
                )

            products = await self._list_products(project_id)
            seo = self._build_seo_artifacts(project, products, subdomain)
            await self.session.execute(
                text(
                    """
                    UPDATE os_store_projects
                    SET seo_artifacts = CAST(:seo AS jsonb),
                        pages_count = :pages,
                        status = 'ready',
                        error_message = NULL,
                        updated_at = NOW()
                    WHERE id = :id::uuid
                    """
                ),
                {
                    "id": project_id,
                    "seo": _json_dumps(seo),
                    "pages": len(STORE_PAGE_TYPES),
                },
            )
            await self.session.commit()
            return await self.get_project(project_id, workspace_id) or {}
        except Exception as exc:
            await self._set_status(project_id, "error", str(exc)[:2000])
            raise

    async def publish_store(self, project_id: str, workspace_id: int) -> dict[str, Any]:
        project = await self.get_project(project_id, workspace_id)
        if not project:
            raise ValueError("Project not found")
        if project.get("status") not in ("ready", "published"):
            raise ValueError("Store must be in ready status before publishing")

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
                        "UPDATE os_store_pages SET is_published = TRUE, updated_at = NOW() WHERE id = :id::uuid"
                    ),
                    {"id": page["id"]},
                )

        await self.session.execute(
            text(
                """
                UPDATE os_store_projects
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
        updated = await self.get_project(project_id, workspace_id) or {}
        updated["public_url"] = self._store_url(project.get("subdomain"))
        return updated

    async def add_product(
        self, project_id: str, workspace_id: int, product_info: dict[str, Any]
    ) -> dict[str, Any]:
        project = await self.get_project(project_id, workspace_id)
        if not project:
            raise ValueError("Project not found")
        store_info = _parse_jsonb(project.get("store_info")) or {}
        currency = project.get("currency") or "EUR"
        product = await self._create_product_impl(
            project_id, workspace_id, product_info, currency, store_info, ai=True
        )
        await self._refresh_sitemap(project_id)
        return product

    async def update_product(
        self,
        project_id: str,
        workspace_id: int,
        product_id: str,
        updates: dict[str, Any],
    ) -> dict[str, Any]:
        project = await self.get_project(project_id, workspace_id)
        if not project:
            raise ValueError("Project not found")
        await self._set_workspace(workspace_id)

        prod = await self._get_product(product_id, project_id)
        if not prod:
            raise ValueError("Product not found")

        if updates.get("regenerate_ai"):
            store_info = _parse_jsonb(project.get("store_info")) or {}
            ai = await self._generate_product_seo(
                {**prod, **updates}, store_info
            )
            updates["ai_description"] = ai.get("ai_description")
            updates["meta"] = ai.get("meta")

        sets = ["updated_at = NOW()"]
        params: dict[str, Any] = {"id": product_id, "pid": project_id}
        for field in ("name", "description", "ai_description", "stock", "category", "is_active"):
            if field in updates:
                sets.append(f"{field} = :{field}")
                params[field] = updates[field]
        if "price_cents" in updates:
            sets.append("price_cents = :price_cents")
            params["price_cents"] = int(updates["price_cents"])
        if "images" in updates:
            sets.append("images = CAST(:images AS jsonb)")
            params["images"] = _json_dumps(updates["images"])
        if "meta" in updates:
            sets.append("meta = CAST(:meta AS jsonb)")
            params["meta"] = _json_dumps(updates["meta"])

        await self.session.execute(
            text(
                f"UPDATE os_store_products SET {', '.join(sets)} WHERE id = :id::uuid AND project_id = :pid::uuid"
            ),
            params,
        )
        await self.session.commit()
        return await self._get_product(product_id, project_id) or {}

    async def delete_product(
        self, project_id: str, workspace_id: int, product_id: str
    ) -> bool:
        await self._set_workspace(workspace_id)
        prod = await self._get_product(product_id, project_id)
        if not prod:
            return False
        if prod.get("stripe_product_id") and _ensure_stripe_key():
            try:
                await stripe.Product.modify_async(prod["stripe_product_id"], active=False)
            except stripe.StripeError as exc:
                logger.warning("Stripe archive failed: %s", exc)
        await self.session.execute(
            text(
                """
                UPDATE os_store_products
                SET is_active = FALSE, stripe_status = 'archived', updated_at = NOW()
                WHERE id = :id::uuid AND project_id = :pid::uuid
                """
            ),
            {"id": product_id, "pid": project_id},
        )
        await self.session.commit()
        await self._refresh_sitemap(project_id)
        return True

    async def process_order(
        self, subdomain: str, order_data: dict[str, Any]
    ) -> dict[str, Any]:
        project = await self.get_project_by_subdomain(subdomain)
        if not project:
            raise ValueError("Store not found")

        workspace_id = int(project["workspace_id"])
        project_id = project["id"]
        currency = (project.get("currency") or "EUR").lower()
        items_in = order_data.get("items") or []
        if not items_in:
            raise ValueError("Cart is empty")

        line_items: list[dict[str, Any]] = []
        total_cents = 0
        for item in items_in:
            prod = await self._get_product_by_slug(project_id, item.get("slug") or item.get("product_slug", ""))
            if not prod or not prod.get("is_active"):
                raise ValueError(f"Product unavailable: {item.get('slug')}")
            qty = max(1, int(item.get("quantity") or 1))
            if prod.get("stock", 0) < qty:
                raise ValueError(f"Insufficient stock for {prod['name']}")
            subtotal = int(prod["price_cents"]) * qty
            total_cents += subtotal
            line_items.append(
                {
                    "product_id": prod["id"],
                    "slug": prod["slug"],
                    "name": prod["name"],
                    "quantity": qty,
                    "price_cents": prod["price_cents"],
                    "stripe_price_id": prod.get("stripe_price_id"),
                }
            )

        discount_code = order_data.get("discount_code")
        if discount_code:
            disc = await self._get_discount(project_id, discount_code)
            if disc and disc.get("is_active"):
                total_cents = self._apply_discount(total_cents, disc)

        order_id = str(uuid.uuid4())
        customer_email = order_data.get("customer_email") or order_data.get("email") or ""
        customer_name = order_data.get("customer_name") or order_data.get("name")

        payment_intent_id = None
        client_secret = None
        stripe_status = "pending_stripe"

        if _ensure_stripe_key():
            try:
                intent = await stripe.PaymentIntent.create_async(
                    amount=total_cents,
                    currency=currency,
                    metadata={
                        "os_store_order_id": order_id,
                        "os_store_project_id": project_id,
                        "subdomain": subdomain,
                    },
                    receipt_email=customer_email or None,
                )
                payment_intent_id = intent.id
                client_secret = intent.client_secret
                stripe_status = "created"
            except stripe.StripeError as exc:
                logger.warning("PaymentIntent creation failed: %s", exc)
                stripe_status = "pending_stripe"
        else:
            stripe_status = "pending_stripe"

        await self.session.execute(
            text(
                """
                INSERT INTO os_store_orders (
                    id, project_id, workspace_id, customer_email, customer_name,
                    items, total_cents, currency, status, stripe_payment_intent_id, metadata
                )
                VALUES (
                    :id, :pid, :ws, :email, :name,
                    CAST(:items AS jsonb), :total, :cur, 'pending', :pi,
                    CAST(:meta AS jsonb)
                )
                """
            ),
            {
                "id": order_id,
                "pid": project_id,
                "ws": workspace_id,
                "email": customer_email,
                "name": customer_name,
                "items": _json_dumps(line_items),
                "total": total_cents,
                "cur": currency.upper(),
                "pi": payment_intent_id,
                "meta": _json_dumps({"stripe_status": stripe_status}),
            },
        )
        await self.session.commit()

        result: dict[str, Any] = {
            "order_id": order_id,
            "total_cents": total_cents,
            "currency": currency.upper(),
            "status": "pending",
        }
        if client_secret:
            result["client_secret"] = client_secret
            result["payment_intent_id"] = payment_intent_id
        else:
            result["stripe_message"] = (
                "Stripe not configured. Set STRIPE_SECRET_KEY on Railway to enable payments."
            )
            result["pending_stripe"] = True
        return result

    async def handle_stripe_webhook(
        self, subdomain: str, payload: bytes, sig_header: str | None
    ) -> dict[str, Any]:
        project = await self.get_project_by_subdomain(subdomain)
        if not project:
            raise ValueError("Store not found")

        webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "").strip()
        event: dict[str, Any]

        if webhook_secret and sig_header and _ensure_stripe_key():
            try:
                event_obj = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
                event = dict(event_obj)
            except Exception as exc:
                raise ValueError(f"Webhook signature invalid: {exc}") from exc
        else:
            try:
                event = json.loads(payload.decode("utf-8"))
            except json.JSONDecodeError as exc:
                raise ValueError("Invalid webhook payload") from exc

        event_type = event.get("type")
        data_obj = (event.get("data") or {}).get("object") or {}

        if event_type == "payment_intent.succeeded":
            pi_id = data_obj.get("id")
            order_id = (data_obj.get("metadata") or {}).get("os_store_order_id")
            await self.session.execute(
                text(
                    """
                    UPDATE os_store_orders
                    SET status = 'paid', updated_at = NOW()
                    WHERE stripe_payment_intent_id = :pi
                       OR id = NULLIF(:oid, '')::uuid
                    """
                ),
                {"pi": pi_id, "oid": order_id or ""},
            )
            await self.session.commit()
            return {"handled": True, "event": event_type, "order_status": "paid"}

        return {"handled": False, "event": event_type}

    async def apply_discount(
        self, project_id: str, workspace_id: int, discount_info: dict[str, Any]
    ) -> dict[str, Any]:
        await self._set_workspace(workspace_id)
        project = await self.get_project(project_id, workspace_id)
        if not project:
            raise ValueError("Project not found")

        code = (discount_info.get("code") or "").strip().upper()
        dtype = discount_info.get("type") or "percent"
        value = float(discount_info.get("value") or 0)
        max_uses = discount_info.get("max_uses")
        expires_at = discount_info.get("expires_at")

        stripe_coupon_id = None
        if _ensure_stripe_key():
            try:
                coupon_params: dict[str, Any] = {
                    "duration": "once",
                    "name": f"Store {project.get('name')} — {code}",
                }
                if dtype == "percent":
                    coupon_params["percent_off"] = min(100, max(1, value))
                else:
                    coupon_params["amount_off"] = int(value * 100)
                    coupon_params["currency"] = (project.get("currency") or "EUR").lower()
                coupon = await stripe.Coupon.create_async(**coupon_params)
                stripe_coupon_id = coupon.id
            except stripe.StripeError as exc:
                logger.warning("Stripe coupon failed: %s", exc)

        disc_id = str(uuid.uuid4())
        r = await self.session.execute(
            text(
                """
                INSERT INTO os_store_discounts (
                    id, project_id, workspace_id, stripe_coupon_id, code, type, value,
                    max_uses, expires_at
                )
                VALUES (
                    :id, :pid, :ws, :stripe, :code, :type, :value, :max, :exp
                )
                RETURNING *
                """
            ),
            {
                "id": disc_id,
                "pid": project_id,
                "ws": workspace_id,
                "stripe": stripe_coupon_id,
                "code": code,
                "type": dtype,
                "value": value,
                "max": max_uses,
                "exp": expires_at,
            },
        )
        await self.session.commit()
        row = _row(r.fetchone())
        if not stripe_coupon_id:
            row["stripe_message"] = "Stripe not configured — discount saved locally only"
        return row

    async def get_store_analytics(self, project_id: str, workspace_id: int) -> dict[str, Any]:
        await self._set_workspace(workspace_id)
        orders_r = await self.session.execute(
            text(
                """
                SELECT status, COUNT(*) AS cnt, COALESCE(SUM(total_cents), 0) AS revenue
                FROM os_store_orders
                WHERE project_id = :pid::uuid
                GROUP BY status
                """
            ),
            {"pid": project_id},
        )
        by_status: dict[str, Any] = {}
        total_revenue = 0
        pending = 0
        for row in orders_r.fetchall():
            m = row._mapping
            st = m["status"]
            cnt = int(m["cnt"])
            rev = int(m["revenue"])
            by_status[st] = {"count": cnt, "revenue_cents": rev}
            if st == "paid":
                total_revenue += rev
            if st == "pending":
                pending += cnt

        top_r = await self.session.execute(
            text(
                """
                SELECT item->>'product_id' AS pid, item->>'name' AS name,
                       SUM((item->>'quantity')::int) AS qty
                FROM os_store_orders o,
                     jsonb_array_elements(o.items) AS item
                WHERE o.project_id = :pid::uuid AND o.status IN ('paid', 'shipped', 'delivered')
                GROUP BY 1, 2
                ORDER BY qty DESC
                LIMIT 10
                """
            ),
            {"pid": project_id},
        )
        top_products = [_row(x) for x in top_r.fetchall()]

        visits = 0
        home_page = await self._get_store_page_by_type(project_id, "home")
        if home_page and home_page.get("landing_page_id"):
            vr = await self.session.execute(
                text(
                    "SELECT COUNT(*) FROM landing_analytics WHERE page_id = :pid::uuid AND event_type = 'impression'"
                ),
                {"pid": home_page["landing_page_id"]},
            )
            visits = int(vr.scalar() or 0)

        paid_count = by_status.get("paid", {}).get("count", 0)
        conv_rate = round(100 * paid_count / visits, 2) if visits else 0.0

        return {
            "total_revenue_cents": total_revenue,
            "orders_by_status": by_status,
            "pending_orders": pending,
            "top_products": top_products,
            "visits": visits,
            "conversion_rate": conv_rate,
        }

    async def list_templates(self) -> list[dict[str, Any]]:
        await self.ensure_schema()
        r = await self.session.execute(
            text("SELECT id, name, category, thumbnail_url, sample_products FROM os_store_templates ORDER BY name")
        )
        return [_row(x) for x in r.fetchall()]

    async def get_project_by_subdomain(self, subdomain: str) -> dict[str, Any] | None:
        await self.ensure_schema()
        r = await self.session.execute(
            text(
                "SELECT * FROM os_store_projects WHERE subdomain = :sub AND status = 'published'"
            ),
            {"sub": subdomain.lower()},
        )
        return _row(r.fetchone()) or None

    async def get_public_store_home(self, subdomain: str) -> dict[str, Any] | None:
        return await self._public_page(subdomain, "home")

    async def get_public_catalog(self, subdomain: str) -> dict[str, Any] | None:
        project = await self.get_project_by_subdomain(subdomain)
        if not project:
            return None
        page = await self._public_page(subdomain, "productos")
        if not page:
            page = {"subdomain": subdomain, "page_slug": "productos", "blocks": []}
        page["products"] = await self._list_products(project["id"], active_only=True)
        return page

    async def get_public_product(self, subdomain: str, slug: str) -> dict[str, Any] | None:
        project = await self.get_project_by_subdomain(subdomain)
        if not project:
            return None
        prod = await self._get_product_by_slug(project["id"], slug)
        if not prod or not prod.get("is_active"):
            return None
        meta = _parse_jsonb(prod.get("meta")) or {}
        schema = meta.get("schema_org") or self._product_schema(prod, project)
        return {
            "subdomain": subdomain,
            "product": prod,
            "schema_org": schema,
            "store_name": project.get("name"),
            "currency": project.get("currency"),
        }

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

    async def delete_project(self, project_id: str, workspace_id: int) -> bool:
        await self._set_workspace(workspace_id)
        r = await self.session.execute(
            text(
                "DELETE FROM os_store_projects WHERE id = :id::uuid AND workspace_id = :ws RETURNING id"
            ),
            {"id": project_id, "ws": workspace_id},
        )
        await self.session.commit()
        return r.fetchone() is not None

    # ─── Internal helpers ───────────────────────────────────────────────────

    async def _create_product_impl(
        self,
        project_id: str,
        workspace_id: int,
        product_info: dict[str, Any],
        currency: str,
        store_info: dict[str, Any],
        *,
        ai: bool = False,
    ) -> dict[str, Any]:
        name = (product_info.get("name") or "Producto").strip()
        slug = _slugify(product_info.get("slug") or name)
        price = product_info.get("price") or product_info.get("price_eur") or 0
        price_cents = int(product_info.get("price_cents") or float(price) * 100)
        description = product_info.get("description") or ""
        category = product_info.get("category") or store_info.get("sector")

        ai_desc = description
        meta: dict[str, Any] = {}
        if ai:
            seo = await self._generate_product_seo(
                {"name": name, "description": description, "price_cents": price_cents, "category": category},
                store_info,
            )
            ai_desc = seo.get("ai_description") or description
            meta = seo.get("meta") or {}

        stripe_product_id = None
        stripe_price_id = None
        stripe_status = "pending_stripe"

        if _ensure_stripe_key():
            try:
                sp = await stripe.Product.create_async(
                    name=name,
                    description=ai_desc[:500] if ai_desc else None,
                    metadata={"os_store_project_id": project_id, "slug": slug},
                )
                stripe_product_id = sp.id
                pr = await stripe.Price.create_async(
                    product=stripe_product_id,
                    unit_amount=price_cents,
                    currency=currency.lower(),
                )
                stripe_price_id = pr.id
                stripe_status = "active"
            except stripe.StripeError as exc:
                logger.warning("Stripe product create failed: %s", exc)
                stripe_status = "pending_stripe"
        else:
            stripe_status = "pending_stripe"

        meta.setdefault("schema_org", self._product_schema_dict(name, ai_desc, price_cents, currency))
        if stripe_status == "pending_stripe":
            meta["stripe_message"] = "Stripe not configured. Set STRIPE_SECRET_KEY on Railway."

        product_id = str(uuid.uuid4())
        r = await self.session.execute(
            text(
                """
                INSERT INTO os_store_products (
                    id, project_id, workspace_id, name, slug, description, ai_description,
                    price_cents, currency, stripe_product_id, stripe_price_id, stripe_status,
                    stock, category, images, meta
                )
                VALUES (
                    :id, :pid, :ws, :name, :slug, :desc, :ai_desc,
                    :price, :cur, :sp, :spr, :ss,
                    :stock, :cat, CAST(:images AS jsonb), CAST(:meta AS jsonb)
                )
                RETURNING *
                """
            ),
            {
                "id": product_id,
                "pid": project_id,
                "ws": workspace_id,
                "name": name,
                "slug": slug,
                "desc": description,
                "ai_desc": ai_desc,
                "price": price_cents,
                "cur": currency,
                "sp": stripe_product_id,
                "spr": stripe_price_id,
                "ss": stripe_status,
                "stock": int(product_info.get("stock") or 100),
                "cat": category,
                "images": _json_dumps(product_info.get("images") or []),
                "meta": _json_dumps(meta),
            },
        )
        await self.session.commit()
        return _row(r.fetchone())

    async def _generate_store_copy(self, store_info: dict[str, Any]) -> dict[str, Any]:
        client = _openai_client()
        if not client:
            return self._fallback_store_copy(store_info)

        prompt = (
            f"Genera copy completo para una tienda online en {store_info.get('language', 'es')}.\n"
            f"Datos: {json.dumps(store_info, ensure_ascii=False)}\n"
            "Responde JSON con: hero_headline, hero_subheadline, value_proposition, about_text, "
            "shipping_policy, returns_policy, terms_summary, contact_intro, category_descriptions (objeto), "
            "sample_products (array con name, description, price)."
        )
        try:
            resp = await client.chat.completions.create(
                model=STORE_MODEL,
                messages=[
                    {"role": "system", "content": "Eres NELVYON OS Ecommerce — generas copy de tiendas online premium."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.5,
                response_format={"type": "json_object"},
            )
            return json.loads(resp.choices[0].message.content or "{}")
        except Exception as exc:
            logger.warning("Store copy AI fallback: %s", exc)
            return self._fallback_store_copy(store_info)

    async def _generate_product_seo(
        self, product: dict[str, Any], store_info: dict[str, Any]
    ) -> dict[str, Any]:
        client = _openai_client()
        name = product.get("name", "")
        if not client:
            desc = product.get("description") or f"{name} — disponible en nuestra tienda."
            return {
                "ai_description": desc,
                "meta": {
                    "meta_title": f"{name} | {store_info.get('store_name', 'Tienda')}",
                    "meta_description": desc[:160],
                    "keywords": [name, store_info.get("sector", "")],
                },
            }

        prompt = (
            f"Genera SEO para producto e-commerce: {json.dumps(product, ensure_ascii=False)}\n"
            f"Tienda: {store_info.get('store_name')} sector {store_info.get('sector')}\n"
            'JSON: {"ai_description":"...", "meta":{"meta_title":"...","meta_description":"...","keywords":[]}}'
        )
        try:
            resp = await client.chat.completions.create(
                model=STORE_MODEL,
                messages=[
                    {"role": "system", "content": "Generas descripciones SEO optimizadas para productos."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.4,
                response_format={"type": "json_object"},
            )
            return json.loads(resp.choices[0].message.content or "{}")
        except Exception as exc:
            logger.warning("Product SEO fallback: %s", exc)
            desc = product.get("description") or name
            return {"ai_description": desc, "meta": {"meta_title": name, "meta_description": desc[:160], "keywords": []}}

    def _fallback_store_copy(self, store_info: dict[str, Any]) -> dict[str, Any]:
        name = store_info.get("store_name") or store_info.get("name") or "Tienda"
        return {
            "hero_headline": f"Bienvenido a {name}",
            "hero_subheadline": store_info.get("description") or "Productos seleccionados para ti",
            "value_proposition": "Calidad, envío rápido y atención personalizada",
            "about_text": f"{name} nace con la misión de ofrecer lo mejor en {store_info.get('sector', 'retail')}.",
            "shipping_policy": "Envíos en 24-72h laborables. Gastos calculados en checkout.",
            "returns_policy": "Devoluciones en 30 días sin preguntas.",
            "terms_summary": "Al comprar aceptas nuestros términos y condiciones.",
            "contact_intro": "¿Necesitas ayuda? Escríbenos.",
            "category_descriptions": {},
            "sample_products": store_info.get("productos_iniciales") or [],
        }

    def _page_blocks(self, page_type: str, store_info: dict, copy: dict) -> list:
        name = store_info.get("store_name") or store_info.get("name") or "Tienda"
        colors = store_info.get("brand_colors") or store_info.get("colores") or {}
        primary = colors.get("primary") or "#111827"
        if page_type == "home":
            return [
                _make_block("hero", headline=copy.get("hero_headline", name), subheadline=copy.get("hero_subheadline", ""), backgroundColor=primary, ctaText="Ver catálogo", ctaUrl="/productos"),
                _make_block("text", content=copy.get("value_proposition", "")),
                _make_block("social_proof", stats=[{"label": "Clientes", "value": "5k+"}, {"label": "Envíos", "value": "24h"}]),
                _make_block("cta", headline="Compra ahora", buttonText="Explorar", buttonUrl="/productos"),
            ]
        if page_type == "catalogo":
            return [
                _make_block("hero", headline="Catálogo", subheadline="Todos nuestros productos", backgroundColor=primary),
                _make_block("text", content="Explora nuestra selección."),
            ]
        if page_type == "about":
            return [_make_block("text", content=copy.get("about_text", ""))]
        if page_type == "contacto":
            return [_make_block("form", headline=copy.get("contact_intro", "Contacto"))]
        if page_type == "politica-envios":
            return [_make_block("text", content=copy.get("shipping_policy", ""))]
        if page_type == "politica-devoluciones":
            return [_make_block("text", content=copy.get("returns_policy", ""))]
        if page_type == "checkout":
            return [_make_block("text", content="Completa tu pedido de forma segura con Stripe.")]
        if page_type == "carrito":
            return [_make_block("text", content="Revisa tu carrito antes de pagar.")]
        return [_make_block("text", content=copy.get("terms_summary", "Contenido de la tienda."))]

    def _page_meta(self, page_type: str, store_info: dict, copy: dict) -> dict:
        name = store_info.get("store_name") or store_info.get("name") or "Tienda"
        titles = {
            "home": name,
            "catalogo": f"Catálogo | {name}",
            "about": f"Sobre nosotros | {name}",
            "contacto": f"Contacto | {name}",
            "checkout": f"Checkout | {name}",
        }
        title = titles.get(page_type, f"{page_type} | {name}")
        return {
            "meta_title": title,
            "meta_description": (copy.get("value_proposition") or store_info.get("description") or title)[:160],
            "keywords": [name, store_info.get("sector", ""), page_type],
            "og_image": store_info.get("logo_url") or "",
        }

    def _build_seo_artifacts(
        self, project: dict, products: list, subdomain: str
    ) -> dict[str, Any]:
        base = f"{STORE_BASE}/store/{subdomain}"
        urlset = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
        for path in ["", "/productos", "/about", "/contacto"]:
            loc = base if not path else f"{base}{path}"
            url_el = ET.SubElement(urlset, "url")
            ET.SubElement(url_el, "loc").text = loc
            ET.SubElement(url_el, "changefreq").text = "weekly"
        for prod in products:
            if prod.get("is_active"):
                url_el = ET.SubElement(urlset, "url")
                ET.SubElement(url_el, "loc").text = f"{base}/producto/{prod['slug']}"
                ET.SubElement(url_el, "changefreq").text = "daily"
        sitemap_xml = ET.tostring(urlset, encoding="unicode", xml_declaration=True)
        robots_txt = f"User-agent: *\nAllow: /\nSitemap: {base}/sitemap.xml\n"
        store_info = _parse_jsonb(project.get("store_info")) or {}
        return {
            "sitemap_xml": sitemap_xml,
            "robots_txt": robots_txt,
            "schema_org": {
                "@context": "https://schema.org",
                "@type": "Store",
                "name": project.get("name"),
                "description": store_info.get("description"),
                "url": base,
            },
        }

    async def _refresh_sitemap(self, project_id: str) -> None:
        project = await self._get_project_raw(project_id)
        if not project:
            return
        products = await self._list_products(project_id)
        seo = self._build_seo_artifacts(project, products, project.get("subdomain") or "store")
        await self.session.execute(
            text(
                "UPDATE os_store_projects SET seo_artifacts = CAST(:seo AS jsonb), updated_at = NOW() WHERE id = :id::uuid"
            ),
            {"id": project_id, "seo": _json_dumps(seo)},
        )
        await self.session.commit()

    async def _public_page(self, subdomain: str, page_slug: str) -> dict[str, Any] | None:
        project = await self.get_project_by_subdomain(subdomain)
        if not project:
            return None
        r = await self.session.execute(
            text(
                """
                SELECT sp.*, lp.blocks, lp.meta, lp.name, lp.form_fields
                FROM os_store_pages sp
                LEFT JOIN landing_pages lp ON lp.id = sp.landing_page_id
                WHERE sp.project_id = :pid::uuid AND sp.page_slug = :slug AND sp.is_published = TRUE
                """
            ),
            {"pid": project["id"], "slug": page_slug},
        )
        page = _row(r.fetchone())
        if not page:
            return None
        return {
            "subdomain": subdomain,
            "store_name": project.get("name"),
            "page_slug": page_slug,
            "blocks": _parse_jsonb(page.get("blocks")) or [],
            "meta": _parse_jsonb(page.get("meta")) or {},
            "currency": project.get("currency"),
        }

    def _product_schema(self, prod: dict, project: dict) -> dict:
        return self._product_schema_dict(
            prod.get("name", ""),
            prod.get("ai_description") or prod.get("description", ""),
            int(prod.get("price_cents") or 0),
            project.get("currency") or "EUR",
            in_stock=prod.get("stock", 0) > 0,
        )

    def _product_schema_dict(
        self, name: str, desc: str, price_cents: int, currency: str, *, in_stock: bool = True
    ) -> dict:
        return {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": name,
            "description": desc,
            "offers": {
                "@type": "Offer",
                "price": round(price_cents / 100, 2),
                "priceCurrency": currency,
                "availability": "https://schema.org/InStock" if in_stock else "https://schema.org/OutOfStock",
            },
        }

    def _apply_discount(self, total_cents: int, disc: dict) -> int:
        if disc.get("type") == "percent":
            off = int(total_cents * float(disc.get("value") or 0) / 100)
            return max(0, total_cents - off)
        off = int(float(disc.get("value") or 0) * 100)
        return max(0, total_cents - off)

    async def _get_discount(self, project_id: str, code: str) -> dict | None:
        r = await self.session.execute(
            text(
                """
                SELECT * FROM os_store_discounts
                WHERE project_id = :pid::uuid AND code = :code AND is_active = TRUE
                """
            ),
            {"pid": project_id, "code": code.upper()},
        )
        return _row(r.fetchone()) or None

    async def _upsert_store_page(
        self, project_id: str, ws: int, page_type: str, slug: str, lp_id: str, order_idx: int
    ) -> None:
        existing = await self.session.execute(
            text(
                "SELECT id FROM os_store_pages WHERE project_id = :pid::uuid AND page_slug = :slug"
            ),
            {"pid": project_id, "slug": slug},
        )
        if existing.fetchone():
            await self.session.execute(
                text(
                    """
                    UPDATE os_store_pages
                    SET landing_page_id = :lp::uuid, order_index = :ord, updated_at = NOW()
                    WHERE project_id = :pid::uuid AND page_slug = :slug
                    """
                ),
                {"lp": lp_id, "ord": order_idx, "pid": project_id, "slug": slug},
            )
        else:
            await self.session.execute(
                text(
                    """
                    INSERT INTO os_store_pages (
                        project_id, workspace_id, page_type, page_slug, landing_page_id, order_index
                    )
                    VALUES (:pid, :ws, :ptype, :slug, :lp::uuid, :ord)
                    """
                ),
                {
                    "pid": project_id,
                    "ws": ws,
                    "ptype": page_type,
                    "slug": slug,
                    "lp": lp_id,
                    "ord": order_idx,
                },
            )

    async def _list_pages(self, project_id: str) -> list[dict]:
        r = await self.session.execute(
            text(
                "SELECT * FROM os_store_pages WHERE project_id = :pid::uuid ORDER BY order_index"
            ),
            {"pid": project_id},
        )
        return [_row(x) for x in r.fetchall()]

    async def _list_products(self, project_id: str, *, active_only: bool = False) -> list[dict]:
        q = "SELECT * FROM os_store_products WHERE project_id = :pid::uuid"
        if active_only:
            q += " AND is_active = TRUE"
        q += " ORDER BY created_at DESC"
        r = await self.session.execute(text(q), {"pid": project_id})
        return [_row(x) for x in r.fetchall()]

    async def _get_product(self, product_id: str, project_id: str) -> dict | None:
        r = await self.session.execute(
            text(
                "SELECT * FROM os_store_products WHERE id = :id::uuid AND project_id = :pid::uuid"
            ),
            {"id": product_id, "pid": project_id},
        )
        return _row(r.fetchone()) or None

    async def _get_product_by_slug(self, project_id: str, slug: str) -> dict | None:
        r = await self.session.execute(
            text(
                """
                SELECT * FROM os_store_products
                WHERE project_id = :pid::uuid AND slug = :slug AND is_active = TRUE
                """
            ),
            {"pid": project_id, "slug": slug},
        )
        return _row(r.fetchone()) or None

    async def _get_store_page_by_type(self, project_id: str, page_type: str) -> dict | None:
        r = await self.session.execute(
            text(
                "SELECT * FROM os_store_pages WHERE project_id = :pid::uuid AND page_type = :pt LIMIT 1"
            ),
            {"pid": project_id, "pt": page_type},
        )
        return _row(r.fetchone()) or None

    async def _get_project_raw(self, project_id: str) -> dict | None:
        r = await self.session.execute(
            text("SELECT * FROM os_store_projects WHERE id = :id::uuid"),
            {"id": project_id},
        )
        return _row(r.fetchone()) or None

    async def _set_status(self, project_id: str, status: str, error: str | None = None) -> None:
        await self.session.execute(
            text(
                """
                UPDATE os_store_projects
                SET status = :status, error_message = :err, updated_at = NOW()
                WHERE id = :id::uuid
                """
            ),
            {"id": project_id, "status": status, "err": error},
        )
        await self.session.commit()

    async def _unique_subdomain(self, name: str) -> str:
        base = _slugify(name)[:28]
        for i in range(25):
            candidate = base if i == 0 else f"{base}-{uuid.uuid4().hex[:4]}"
            r = await self.session.execute(
                text("SELECT 1 FROM os_store_projects WHERE subdomain = :sub LIMIT 1"),
                {"sub": candidate},
            )
            if r.fetchone() is None:
                return candidate
        return f"{base}-{uuid.uuid4().hex[:6]}"

    def _store_url(self, subdomain: str | None) -> str | None:
        if not subdomain:
            return None
        return f"{STORE_BASE}/store/{subdomain}"


def get_os_store_builder_service(
    session: AsyncSession, workspace_id: int | None = None
) -> OsStoreBuilderService:
    return OsStoreBuilderService(session, workspace_id)
