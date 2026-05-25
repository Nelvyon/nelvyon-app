"""NELVYON white-label — custom domains, branding, and branded email templates."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import db_manager

logger = logging.getLogger(__name__)

_SCHEMA_READY = False
_DOMAIN_RE = re.compile(
    r"^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$",
    re.IGNORECASE,
)
DEFAULT_CNAME_TARGET = os.getenv("WHITELABEL_CNAME_TARGET", "app.nelvyon.com").strip().rstrip(".")
DEFAULT_COLORS = {
    "primary_color": "#6366f1",
    "secondary_color": "#8b5cf6",
    "accent_color": "#06b6d4",
}

ALLOWED_FONTS = frozenset({"Inter", "Poppins", "Montserrat", "Playfair Display"})
EMAIL_TEMPLATE_TYPES = frozenset(
    {
        "welcome",
        "invoice",
        "booking_confirmation",
        "campaign",
        "password_reset",
        "notification",
    }
)


def _json_dumps(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, default=str)


def _row(row: Any) -> dict[str, Any]:
    if row is None:
        return {}
    data = dict(row._mapping)
    for k, v in list(data.items()):
        if isinstance(v, datetime):
            data[k] = v.isoformat()
    return data


def _normalize_domain(domain: str) -> str:
    raw = (domain or "").strip().lower()
    if raw.startswith("http://") or raw.startswith("https://"):
        raw = urlparse(raw).netloc or raw
    return raw.rstrip(".")


class WhitelabelService:
    """Workspace-scoped white-label configuration."""

    def __init__(self, session: AsyncSession, workspace_id: int):
        self.session = session
        self.workspace_id = int(workspace_id)

    @staticmethod
    async def ensure_schema() -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        if not db_manager.async_session_maker:
            await db_manager.ensure_initialized()
        sql_path = Path(__file__).resolve().parent.parent / "migrations" / "whitelabel.sql"
        ext_path = Path(__file__).resolve().parent.parent / "migrations" / "whitelabel_config.sql"
        if sql_path.exists():
            raw = sql_path.read_text(encoding="utf-8")
            async with db_manager.async_session_maker() as session:
                for stmt in [s.strip() for s in raw.split(";") if s.strip()]:
                    try:
                        await session.execute(text(stmt))
                    except Exception as exc:
                        if "already exists" not in str(exc).lower():
                            logger.debug("whitelabel schema stmt skipped: %s", exc)
                await session.commit()
        if ext_path.exists():
            raw_ext = ext_path.read_text(encoding="utf-8")
            async with db_manager.async_session_maker() as session:
                for stmt in [s.strip() for s in raw_ext.split(";") if s.strip()]:
                    try:
                        await session.execute(text(stmt))
                    except Exception as exc:
                        if "already exists" not in str(exc).lower() and "duplicate column" not in str(exc).lower():
                            logger.debug("whitelabel ext stmt skipped: %s", exc)
                await session.commit()
        _SCHEMA_READY = True

    async def configure_whitelabel(self, config: dict[str, Any]) -> dict[str, Any]:
        """Upsert white-label branding for the workspace."""
        await self.ensure_schema()

        colors = {
            "primary_color": config.get("primary_color") or DEFAULT_COLORS["primary_color"],
            "secondary_color": config.get("secondary_color") or DEFAULT_COLORS["secondary_color"],
            "accent_color": config.get("accent_color") or DEFAULT_COLORS["accent_color"],
        }
        email_config = {
            "custom_email_from_name": config.get("custom_email_from_name"),
            "custom_email_from_address": config.get("custom_email_from_address"),
        }
        custom_domain = config.get("custom_domain")
        domain_norm = _normalize_domain(custom_domain) if custom_domain else None
        if domain_norm and not _DOMAIN_RE.match(domain_norm):
            raise ValueError("Invalid custom domain format")

        verified_domain = False
        dns_txt_token = None
        if domain_norm:
            dns_txt_token = secrets.token_hex(16)
            check = await self.validate_custom_domain(domain_norm)
            verified_domain = bool(check.get("verified"))

        font = (config.get("font") or "Inter").strip()
        if font not in ALLOWED_FONTS:
            font = "Inter"

        r = await self.session.execute(
            text(
                """
                INSERT INTO whitelabel_configs (
                    workspace_id, custom_domain, brand_name, logo_url, favicon_url,
                    colors, email_config, hide_branding, custom_css, verified_domain,
                    font, support_email, dns_txt_token, updated_at
                )
                VALUES (
                    :ws, :custom_domain, :brand_name, :logo_url, :favicon_url,
                    CAST(:colors AS jsonb), CAST(:email_config AS jsonb),
                    :hide_branding, :custom_css, :verified_domain,
                    :font, :support_email, :dns_txt_token, NOW()
                )
                ON CONFLICT (workspace_id) DO UPDATE SET
                    custom_domain = EXCLUDED.custom_domain,
                    brand_name = EXCLUDED.brand_name,
                    logo_url = EXCLUDED.logo_url,
                    favicon_url = EXCLUDED.favicon_url,
                    colors = EXCLUDED.colors,
                    email_config = EXCLUDED.email_config,
                    hide_branding = EXCLUDED.hide_branding,
                    custom_css = EXCLUDED.custom_css,
                    verified_domain = EXCLUDED.verified_domain,
                    font = EXCLUDED.font,
                    support_email = EXCLUDED.support_email,
                    dns_txt_token = COALESCE(EXCLUDED.dns_txt_token, whitelabel_configs.dns_txt_token),
                    updated_at = NOW()
                RETURNING *
                """
            ),
            {
                "ws": self.workspace_id,
                "custom_domain": domain_norm,
                "brand_name": (config.get("brand_name") or config.get("company_name") or "").strip() or None,
                "logo_url": config.get("logo_url"),
                "favicon_url": config.get("favicon_url"),
                "colors": _json_dumps(colors),
                "email_config": _json_dumps(email_config),
                "hide_branding": bool(config.get("hide_nelvyon_branding")),
                "custom_css": config.get("custom_css"),
                "verified_domain": verified_domain,
                "font": font,
                "support_email": config.get("support_email"),
                "dns_txt_token": dns_txt_token,
            },
        )
        await self.session.commit()
        return self._format_config(_row(r.fetchone()))

    async def get_whitelabel_config(self, workspace_id: int | None = None) -> dict[str, Any]:
        """Return current white-label config or sensible defaults."""
        await self.ensure_schema()
        ws = int(workspace_id or self.workspace_id)
        r = await self.session.execute(
            text("SELECT * FROM whitelabel_configs WHERE workspace_id = :ws"),
            {"ws": ws},
        )
        row = r.fetchone()
        if not row:
            return self._default_config(ws)
        return self._format_config(_row(row))

    async def get_config_by_domain(self, domain: str) -> dict[str, Any] | None:
        await self.ensure_schema()
        domain_norm = _normalize_domain(domain)
        r = await self.session.execute(
            text(
                """
                SELECT * FROM whitelabel_configs
                WHERE custom_domain = :domain AND verified_domain = TRUE
                """
            ),
            {"domain": domain_norm},
        )
        row = r.fetchone()
        return self._format_config(_row(row)) if row else None

    async def validate_custom_domain(self, domain: str) -> dict[str, Any]:
        """Verify DNS CNAME points to NELVYON."""
        domain_norm = _normalize_domain(domain)
        if not domain_norm:
            raise ValueError("Domain is required")
        if not _DOMAIN_RE.match(domain_norm):
            raise ValueError("Invalid domain format")

        target = DEFAULT_CNAME_TARGET
        records = await asyncio.to_thread(_resolve_cname_chain, domain_norm)
        target_lower = target.lower()
        verified = any(
            rec.rstrip(".").lower() == target_lower
            or rec.rstrip(".").lower().endswith("." + target_lower)
            for rec in records
        )

        return {
            "domain": domain_norm,
            "expected_cname": target,
            "records": records,
            "verified": verified,
        }

    async def verify_domain(self, workspace_id: int | None = None) -> dict[str, Any]:
        """Verify DNS TXT record (and optionally CNAME) for custom domain."""
        await self.ensure_schema()
        ws = int(workspace_id or self.workspace_id)
        cfg = await self.get_whitelabel_config(ws)
        domain = cfg.get("custom_domain")
        if not domain:
            raise ValueError("No custom domain configured")

        token = cfg.get("dns_txt_token")
        if not token:
            token = secrets.token_hex(16)
            await self.session.execute(
                text(
                    "UPDATE whitelabel_configs SET dns_txt_token = :t, updated_at = NOW() WHERE workspace_id = :ws"
                ),
                {"t": token, "ws": ws},
            )
            await self.session.commit()

        expected_txt = f"nelvyon-verification={token}"
        txt_records = await asyncio.to_thread(_resolve_txt, domain)
        txt_verified = any(expected_txt in rec for rec in txt_records)

        cname_check = await self.validate_custom_domain(domain)
        verified = txt_verified or bool(cname_check.get("verified"))

        if verified:
            await self.session.execute(
                text(
                    "UPDATE whitelabel_configs SET verified_domain = TRUE, updated_at = NOW() WHERE workspace_id = :ws"
                ),
                {"ws": ws},
            )
            await self.session.commit()
            await self.verify_ses_domain(domain)

        return {
            "domain": domain,
            "verified": verified,
            "txt_record_name": f"_nelvyon.{domain}",
            "txt_record_value": expected_txt,
            "txt_found": txt_records,
            "cname": cname_check,
            "instructions": (
                f"Añade un registro TXT en _nelvyon.{domain} con valor: {expected_txt}\n"
                f"Opcional: CNAME {domain} → {DEFAULT_CNAME_TARGET}"
            ),
        }

    async def get_dns_instructions(self) -> dict[str, Any]:
        cfg = await self.get_whitelabel_config()
        domain = cfg.get("custom_domain")
        if not domain:
            raise ValueError("Configure a custom domain first")
        token = cfg.get("dns_txt_token") or secrets.token_hex(16)
        if not cfg.get("dns_txt_token"):
            await self.session.execute(
                text("UPDATE whitelabel_configs SET dns_txt_token = :t WHERE workspace_id = :ws"),
                {"t": token, "ws": self.workspace_id},
            )
            await self.session.commit()
        return {
            "domain": domain,
            "txt_host": f"_nelvyon.{domain}",
            "txt_value": f"nelvyon-verification={token}",
            "cname_target": DEFAULT_CNAME_TARGET,
        }

    async def apply_whitelabel(self, workspace_id: int | None = None) -> dict[str, Any]:
        """Full frontend theming payload with CSS variables."""
        cfg = await self.get_whitelabel_config(workspace_id)
        font = cfg.get("font") or "Inter"
        primary = cfg.get("primary_color") or DEFAULT_COLORS["primary_color"]
        secondary = cfg.get("secondary_color") or DEFAULT_COLORS["secondary_color"]
        brand = cfg.get("brand_name") or "Portal"
        hide = bool(cfg.get("hide_nelvyon_branding"))
        return {
            "workspace_id": cfg.get("workspace_id"),
            "company_name": brand,
            "brand_name": brand,
            "logo_url": cfg.get("logo_url"),
            "favicon_url": cfg.get("favicon_url"),
            "primary_color": primary,
            "secondary_color": secondary,
            "font": font,
            "support_email": cfg.get("support_email"),
            "hide_nelvyon_branding": hide,
            "custom_css": cfg.get("custom_css") or "",
            "custom_domain": cfg.get("custom_domain"),
            "verified_domain": cfg.get("verified_domain"),
            "smtp_from_name": cfg.get("custom_email_from_name") or brand,
            "smtp_from_email": cfg.get("custom_email_from_address"),
            "css_variables": {
                "--primary-color": primary,
                "--secondary-color": secondary,
                "--font-family": f'"{font}", system-ui, -apple-system, sans-serif',
                "--brand-name": f'"{brand}"',
            },
        }

    async def verify_ses_domain(self, domain: str) -> dict[str, Any]:
        """Request SES domain identity verification for client sending."""
        domain_norm = _normalize_domain(domain)
        if not domain_norm:
            return {"verified": False, "skipped": True}
        if os.environ.get("SES_MOCK", "").lower() in ("1", "true", "yes"):
            return {"domain": domain_norm, "verified": True, "mock": True}

        def _verify() -> dict[str, Any]:
            import boto3

            client = boto3.client("ses", region_name=os.environ.get("AWS_REGION", "eu-west-1"))
            resp = client.verify_domain_identity(Domain=domain_norm)
            client.verify_domain_dkim(Domain=domain_norm)
            return {"verification_token": resp.get("VerificationToken"), "domain": domain_norm}

        try:
            result = await asyncio.to_thread(_verify)
            await self.session.execute(
                text(
                    """
                    UPDATE whitelabel_configs
                    SET ses_domain_verified = TRUE, updated_at = NOW()
                    WHERE workspace_id = :ws AND custom_domain = :domain
                    """
                ),
                {"ws": self.workspace_id, "domain": domain_norm},
            )
            await self.session.commit()
            result["verified"] = True
            return result
        except Exception as exc:
            logger.warning("SES domain verify failed for %s: %s", domain_norm, exc)
            return {"domain": domain_norm, "verified": False, "error": str(exc)}

    async def get_email_sender(self, workspace_id: int | None = None) -> dict[str, str | None]:
        """Resolved from-name / from-email for campaigns and reports."""
        cfg = await self.get_whitelabel_config(workspace_id)
        brand = cfg.get("brand_name") or "Portal"
        from_name = cfg.get("custom_email_from_name") or brand
        from_email = cfg.get("custom_email_from_address")
        if from_email and cfg.get("verified_domain"):
            return {"from_name": from_name, "from_email": from_email}
        return {
            "from_name": from_name,
            "from_email": from_email or os.environ.get("SES_FROM_EMAIL", "").strip() or None,
        }

    async def partner_can_resell(self) -> bool:
        r = await self.session.execute(
            text("SELECT plan, features_json FROM workspaces WHERE id = :ws"),
            {"ws": self.workspace_id},
        )
        row = r.mappings().first()
        if not row:
            return False
        plan = (row.get("plan") or "").lower()
        if plan in ("enterprise", "partner", "whitelabel", "agency"):
            return True
        features = row.get("features_json") or ""
        return "whitelabel" in features.lower() or "partner" in features.lower()

    async def create_subworkspace(self, name: str, admin_email: str) -> dict[str, Any]:
        """Partner creates a child workspace inheriting partner branding."""
        if not await self.partner_can_resell():
            raise ValueError("White-label partner plan required to create sub-workspaces")

        partner_cfg = await self.get_whitelabel_config()
        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:40] or "client"
        ins = await self.session.execute(
            text(
                """
                INSERT INTO workspaces (user_id, name, slug, plan, status, parent_workspace_id, created_at)
                VALUES (:uid, :name, :slug, 'starter', 'active', :parent, NOW())
                RETURNING id
                """
            ),
            {
                "uid": f"partner-{self.workspace_id}",
                "name": name.strip(),
                "slug": f"{slug}-{secrets.token_hex(3)}",
                "parent": self.workspace_id,
            },
        )
        child_id = int(ins.scalar_one())
        await self.session.execute(
            text(
                """
                INSERT INTO whitelabel_configs (
                    workspace_id, brand_name, logo_url, favicon_url, colors, email_config,
                    hide_branding, custom_css, verified_domain, font, support_email, updated_at
                )
                SELECT
                    :child, brand_name, logo_url, favicon_url, colors, email_config,
                    TRUE, custom_css, FALSE, font, support_email, NOW()
                FROM whitelabel_configs WHERE workspace_id = :parent
                """
            ),
            {"child": child_id, "parent": self.workspace_id},
        )
        await self.session.execute(
            text(
                """
                INSERT INTO whitelabel_partner_clients (partner_workspace_id, client_workspace_id, client_name, admin_email)
                VALUES (:partner, :child, :name, :email)
                """
            ),
            {
                "partner": self.workspace_id,
                "child": child_id,
                "name": name.strip(),
                "email": admin_email.strip(),
            },
        )
        await self.session.commit()
        return {
            "client_workspace_id": child_id,
            "client_name": name,
            "admin_email": admin_email,
            "branding": await self.apply_whitelabel(child_id),
        }

    async def list_partner_clients(self) -> list[dict[str, Any]]:
        r = await self.session.execute(
            text(
                """
                SELECT c.*, w.name AS workspace_name, w.status
                FROM whitelabel_partner_clients c
                JOIN workspaces w ON w.id = c.client_workspace_id
                WHERE c.partner_workspace_id = :ws
                ORDER BY c.created_at DESC
                """
            ),
            {"ws": self.workspace_id},
        )
        return [_row(x) for x in r.mappings().all()]

    async def mark_domain_verified(self, domain: str) -> dict[str, Any]:
        check = await self.validate_custom_domain(domain)
        if not check["verified"]:
            raise ValueError(f"CNAME for {domain} does not point to {DEFAULT_CNAME_TARGET}")
        await self.session.execute(
            text(
                """
                UPDATE whitelabel_configs
                SET verified_domain = TRUE, updated_at = NOW()
                WHERE workspace_id = :ws AND custom_domain = :domain
                """
            ),
            {"ws": self.workspace_id, "domain": check["domain"]},
        )
        await self.session.commit()
        return check

    async def generate_whitelabel_email_template(
        self,
        template_type: str,
        *,
        variables: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Render a branded HTML email using workspace white-label config."""
        cfg = await self.get_whitelabel_config()
        vars_map = dict(variables or {})
        brand = cfg.get("brand_name") or "Your Platform"
        hide = cfg.get("hide_nelvyon_branding", False)
        colors = cfg.get("colors") or DEFAULT_COLORS
        primary = colors.get("primary_color", DEFAULT_COLORS["primary_color"])
        email_cfg = cfg.get("email_config") or {}

        body_content = vars_map.get("body") or vars_map.get("content") or ""
        subject = vars_map.get("subject") or _default_subject(template_type, brand)

        footer = ""
        if hide:
            support = cfg.get("support_email")
            footer = f'<p style="color:#64748b;font-size:12px;">{brand}'
            if support:
                footer += f' · <a href="mailto:{support}">{support}</a>'
            footer += "</p>"
        else:
            footer = '<p style="color:#94a3b8;font-size:12px;">Powered by NELVYON</p>'

        html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:24px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
    <tr><td style="background:{primary};padding:24px;text-align:center;">
      {"<img src='" + cfg.get("logo_url") + "' alt='" + brand + "' style='max-height:48px;'/>" if cfg.get("logo_url") else f"<h1 style='color:#fff;margin:0;'>{brand}</h1>"}
    </td></tr>
    <tr><td style="padding:32px 24px;color:#1e293b;line-height:1.6;">
      {_wrap_template_body(template_type, body_content, vars_map)}
    </td></tr>
    <tr><td style="padding:16px 24px;background:#f1f5f9;text-align:center;">
      {footer}
    </td></tr>
  </table>
</body></html>"""

        return {
            "template_type": template_type,
            "subject": subject,
            "html": html,
            "from_name": email_cfg.get("custom_email_from_name") or brand,
            "from_address": email_cfg.get("custom_email_from_address"),
            "brand_name": brand,
            "hide_nelvyon_branding": hide,
            "primary_color": primary,
        }

    def build_preview(self, config: dict[str, Any] | None = None) -> dict[str, Any]:
        """Build preview payload for frontend theming."""
        cfg = config or {}
        colors = cfg.get("colors") or DEFAULT_COLORS
        return {
            "brand_name": cfg.get("brand_name") or "Your Brand",
            "logo_url": cfg.get("logo_url"),
            "favicon_url": cfg.get("favicon_url"),
            "colors": colors,
            "custom_css": cfg.get("custom_css") or "",
            "hide_nelvyon_branding": cfg.get("hide_nelvyon_branding", False),
            "custom_domain": cfg.get("custom_domain"),
            "verified_domain": cfg.get("verified_domain", False),
        }

    @staticmethod
    def _default_config(workspace_id: int) -> dict[str, Any]:
        return {
            "workspace_id": workspace_id,
            "custom_domain": None,
            "brand_name": None,
            "logo_url": None,
            "favicon_url": None,
            "colors": dict(DEFAULT_COLORS),
            "email_config": {},
            "hide_nelvyon_branding": False,
            "custom_css": None,
            "verified_domain": False,
            "primary_color": DEFAULT_COLORS["primary_color"],
            "secondary_color": DEFAULT_COLORS["secondary_color"],
            "accent_color": DEFAULT_COLORS["accent_color"],
        }

    @staticmethod
    def _format_config(row: dict[str, Any]) -> dict[str, Any]:
        colors = row.get("colors") or {}
        if isinstance(colors, str):
            colors = json.loads(colors)
        email_cfg = row.get("email_config") or {}
        if isinstance(email_cfg, str):
            email_cfg = json.loads(email_cfg)
        return {
            "workspace_id": row.get("workspace_id"),
            "custom_domain": row.get("custom_domain"),
            "brand_name": row.get("brand_name"),
            "logo_url": row.get("logo_url"),
            "favicon_url": row.get("favicon_url"),
            "colors": colors,
            "primary_color": colors.get("primary_color", DEFAULT_COLORS["primary_color"]),
            "secondary_color": colors.get("secondary_color", DEFAULT_COLORS["secondary_color"]),
            "accent_color": colors.get("accent_color", DEFAULT_COLORS["accent_color"]),
            "email_config": email_cfg,
            "custom_email_from_name": email_cfg.get("custom_email_from_name"),
            "custom_email_from_address": email_cfg.get("custom_email_from_address"),
            "hide_nelvyon_branding": bool(row.get("hide_branding")),
            "custom_css": row.get("custom_css"),
            "verified_domain": bool(row.get("verified_domain")),
            "font": row.get("font") or "Inter",
            "support_email": row.get("support_email"),
            "dns_txt_token": row.get("dns_txt_token"),
            "ses_domain_verified": bool(row.get("ses_domain_verified")),
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
        }


def _resolve_txt(domain: str) -> list[str]:
    try:
        import dns.resolver
    except ImportError:
        return []
    records: list[str] = []
    for host in (f"_nelvyon.{domain}", domain):
        try:
            answers = dns.resolver.resolve(host, "TXT")
            for r in answers:
                txt = b"".join(r.strings).decode("utf-8", errors="ignore")
                records.append(txt)
        except Exception:
            continue
    return records


def _resolve_cname_chain(domain: str) -> list[str]:
    try:
        import dns.resolver
    except ImportError:
        logger.warning("dnspython not installed; domain validation skipped")
        return []

    records: list[str] = []
    try:
        answers = dns.resolver.resolve(domain, "CNAME")
        for r in answers:
            records.append(str(r.target).rstrip("."))
    except dns.resolver.NoAnswer:
        pass
    except Exception as exc:
        logger.debug("CNAME lookup failed for %s: %s", domain, exc)

    if not records:
        try:
            answers = dns.resolver.resolve(domain, "A")
            for r in answers:
                records.append(str(r))
        except Exception:
            pass
    return records


def _default_subject(template_type: str, brand: str) -> str:
    subjects = {
        "welcome": f"Welcome to {brand}",
        "invoice": f"Your invoice from {brand}",
        "booking_confirmation": f"Booking confirmed — {brand}",
        "campaign": f"Update from {brand}",
        "password_reset": f"Reset your {brand} password",
        "notification": f"Notification from {brand}",
    }
    return subjects.get(template_type, f"Message from {brand}")


def _wrap_template_body(template_type: str, body: str, variables: dict[str, Any]) -> str:
    if body:
        return body
    if template_type == "welcome":
        name = variables.get("name", "there")
        return f"<p>Hi {name},</p><p>Welcome! We're glad to have you on board.</p>"
    if template_type == "invoice":
        return f"<p>Your invoice <strong>{variables.get('invoice_number', '')}</strong> is ready.</p>"
    if template_type == "booking_confirmation":
        return f"<p>Your booking for <strong>{variables.get('service', 'your service')}</strong> is confirmed.</p>"
    return "<p>You have a new message.</p>"


def get_whitelabel_service(session: AsyncSession, workspace_id: int) -> WhitelabelService:
    return WhitelabelService(session, workspace_id)
