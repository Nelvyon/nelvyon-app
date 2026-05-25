"""OS Web Builder — GPT-4o custom HTML/CSS from client briefing (F61)."""

from __future__ import annotations

import json
import logging
import os
import re
import uuid
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.sql_compat import json_bind

logger = logging.getLogger(__name__)

SCHEMA_PATH = "client_web_builder.sql"


def _slugify(name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", (name or "negocio").lower()).strip("-")
    return base[:48] or "negocio"


def _mock_html(briefing: dict[str, Any]) -> tuple[str, str, list[dict[str, Any]]]:
    name = briefing.get("business_name", "Mi Negocio")
    sector = briefing.get("sector", "servicios")
    city = briefing.get("city", "España")
    primary = briefing.get("primary_color", "#0066FF")
    desc = briefing.get("description", "Solución profesional para tu negocio.")
    services = briefing.get("services") or ["Servicio 1", "Servicio 2", "Servicio 3"]

    css = f"""
*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:Inter,system-ui,sans-serif;background:#0a0a0a;color:#f5f5f5;line-height:1.6}}
.hero{{min-height:70vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:4rem 1.5rem;background:radial-gradient(ellipse at top,rgba(0,102,255,.2),transparent 60%)}}
.hero h1{{font-size:clamp(2rem,5vw,3.5rem);font-weight:800}}
.hero p{{max-width:640px;margin-top:1rem;color:#a3a3a3}}
.btn{{display:inline-block;margin-top:2rem;padding:1rem 2rem;background:{primary};color:#fff;border-radius:999px;text-decoration:none;font-weight:600}}
section{{padding:4rem 1.5rem;max-width:1100px;margin:0 auto}}
.grid{{display:grid;gap:1.5rem;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}}
.card{{padding:1.5rem;border:1px solid rgba(255,255,255,.1);border-radius:1rem;background:rgba(255,255,255,.04);backdrop-filter:blur(12px)}}
footer{{text-align:center;padding:3rem 1rem;color:#737373;border-top:1px solid rgba(255,255,255,.08)}}
@media(max-width:640px){{.hero{{min-height:60vh}}}}
"""

    service_cards = "".join(
        f'<article class="card"><h3>{s}</h3><p>En {city}, con calidad {sector}.</p></article>' for s in services[:6]
    )

    html = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>{name} — {sector} en {city}</title>
<meta name="description" content="{desc[:160]}"/>
<meta property="og:title" content="{name}"/>
<meta property="og:description" content="{desc[:200]}"/>
<meta property="og:type" content="website"/>
<script type="application/ld+json">{json.dumps({"@context":"https://schema.org","@type":"LocalBusiness","name":name,"description":desc,"areaServed":city}, ensure_ascii=False)}</script>
<link rel="stylesheet" href="styles.css"/>
</head>
<body>
<header class="hero" id="hero">
<h1>{name}</h1>
<p>{desc}</p>
<a class="btn" href="#contacto">Contactar</a>
</header>
<section id="about"><h2>Sobre nosotros</h2><p>{desc}</p><p>Operamos en {city} con enfoque {sector}.</p></section>
<section id="servicios"><h2>Servicios</h2><div class="grid">{service_cards}</div></section>
<section id="testimonios"><h2>Testimonios</h2><div class="grid">
<article class="card"><p>«Excelente servicio, muy recomendable.»</p><strong>Cliente A</strong></article>
<article class="card"><p>«Profesionales y rápidos en {city}.»</p><strong>Cliente B</strong></article>
</div></section>
<section id="contacto"><h2>Contacto</h2><p>Escríbenos desde {city} o llámanos hoy.</p></section>
<footer>&copy; {name} — Generado con NELVYON IA</footer>
</body>
</html>"""

    sections = [
        {"section_type": "hero", "content": {"headline": name, "sub": desc}, "order_index": 0},
        {"section_type": "about", "content": {"body": desc}, "order_index": 1},
        {"section_type": "services", "content": {"items": services}, "order_index": 2},
        {"section_type": "testimonials", "content": {}, "order_index": 3},
        {"section_type": "contact", "content": {"city": city}, "order_index": 4},
        {"section_type": "footer", "content": {"name": name}, "order_index": 5},
    ]
    return html, css, sections


async def _gpt_generate(briefing: dict[str, Any]) -> tuple[str, str, list[dict[str, Any]]]:
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key:
        return _mock_html(briefing)

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(
            api_key=key,
            base_url=os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1").strip(),
        )
        prompt = (
            "Genera una web completa en JSON con keys: html (documento HTML5 completo mobile-first), "
            "css (hoja de estilos), sections (array de {section_type, content, order_index}). "
            "Incluye hero, about, servicios, testimonios, contacto, footer. "
            "SEO: meta description, Open Graph, schema.org LocalBusiness. "
            f"Briefing: {json.dumps(briefing, ensure_ascii=False)}"
        )
        resp = await client.chat.completions.create(
            model=os.environ.get("OPENAI_MODEL", "gpt-4o"),
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            response_format={"type": "json_object"},
        )
        raw = resp.choices[0].message.content or "{}"
        data = json.loads(raw)
        html = str(data.get("html", ""))
        css = str(data.get("css", ""))
        sections = list(data.get("sections", []))
        if not html:
            return _mock_html(briefing)
        return html, css, sections
    except Exception as exc:
        logger.warning("web_builder GPT fallback: %s", exc)
        return _mock_html(briefing)


class WebBuilderService:
    def __init__(self, session: AsyncSession, workspace_id: int | None = None):
        self.session = session
        self.workspace_id = workspace_id
        self._schema_ready = False

    async def _ensure_schema(self) -> None:
        if self._schema_ready:
            return
        bind = self.session.get_bind()
        dialect = bind.dialect.name if bind is not None else "postgresql"
        if dialect == "sqlite":
            stmts = [
                """CREATE TABLE IF NOT EXISTS client_websites (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    client_id TEXT NOT NULL,
                    workspace_id INTEGER,
                    slug TEXT NOT NULL,
                    html_content TEXT NOT NULL,
                    css_content TEXT,
                    version INTEGER NOT NULL DEFAULT 1,
                    published_at TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )""",
                """CREATE TABLE IF NOT EXISTS website_sections (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    website_id INTEGER NOT NULL,
                    section_type TEXT NOT NULL,
                    content_json TEXT NOT NULL,
                    order_index INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )""",
            ]
        else:
            from pathlib import Path

            path = Path(__file__).resolve().parent.parent / "migrations" / SCHEMA_PATH
            stmts = []
            if path.exists():
                stmts = [s.strip() for s in path.read_text(encoding="utf-8").split(";") if s.strip() and not s.strip().startswith("--")]
        for stmt in stmts:
            try:
                await self.session.execute(text(stmt))
            except Exception as exc:
                logger.debug("web_builder schema stmt skipped: %s", exc)
        await self.session.commit()
        self._schema_ready = True

    async def generate(
        self,
        *,
        client_id: str,
        briefing: dict[str, Any],
        regenerate_section: str | None = None,
        website_id: int | None = None,
    ) -> dict[str, Any]:
        await self._ensure_schema()
        cid = client_id.strip() or str(uuid.uuid4())
        slug = _slugify(briefing.get("business_name", cid))

        if regenerate_section and website_id:
            row = await self.session.execute(
                text("SELECT html_content, css_content, version FROM client_websites WHERE id = :id"),
                {"id": website_id},
            )
            existing = row.mappings().first()
            if not existing:
                raise ValueError("website not found")
            html, css, sections = await _gpt_generate(briefing)
            html = html.replace(
                f'id="{regenerate_section}"',
                f'id="{regenerate_section}" data-regenerated="true"',
                1,
            )
            version = int(existing["version"]) + 1
        else:
            html, css, sections = await _gpt_generate(briefing)
            version = 1

        ins = await self.session.execute(
            text(
                """
                INSERT INTO client_websites (client_id, workspace_id, slug, html_content, css_content, version)
                VALUES (:client_id, :ws, :slug, :html, :css, :version)
                """
            ),
            {
                "client_id": cid,
                "ws": self.workspace_id,
                "slug": slug,
                "html": html,
                "css": css or "",
                "version": version,
            },
        )
        await self.session.commit()
        site_id_row = await self.session.execute(text("SELECT last_insert_rowid() AS id"))
        site_id = int(site_id_row.scalar_one())
        slug_row = await self.session.execute(
            text("SELECT slug, version, created_at FROM client_websites WHERE id = :id"),
            {"id": site_id},
        )
        site = slug_row.mappings().first()

        for sec in sections:
            content_json = json.dumps(sec.get("content", sec), ensure_ascii=False)
            await self.session.execute(
                text(
                    f"""
                    INSERT INTO website_sections (website_id, section_type, content_json, order_index)
                    VALUES (:wid, :stype, {json_bind(self.session, "content")}, :ord)
                    """
                ),
                {
                    "wid": site_id,
                    "stype": sec.get("section_type", "block"),
                    "content": content_json,
                    "ord": int(sec.get("order_index", 0)),
                },
            )
        await self.session.commit()

        return {
            "website_id": site_id,
            "client_id": cid,
            "slug": site["slug"],
            "version": site["version"],
            "html": html,
            "css": css,
            "preview_url": f"/api/web-builder/preview/{site_id}",
            "subdomain": f"{site['slug']}.nelvyon.com",
            "sections": sections,
        }

    async def get_preview(self, website_id: int) -> dict[str, Any]:
        await self._ensure_schema()
        row = await self.session.execute(
            text("SELECT id, slug, html_content, css_content, version FROM client_websites WHERE id = :id"),
            {"id": website_id},
        )
        site = row.mappings().first()
        if not site:
            raise ValueError("website not found")
        html = site["html_content"]
        if site["css_content"]:
            html = html.replace(
                '<link rel="stylesheet" href="styles.css"/>',
                f"<style>{site['css_content']}</style>",
            )
        return {"website_id": website_id, "html": html, "slug": site["slug"], "version": site["version"]}

    async def history(self, client_id: str) -> dict[str, Any]:
        await self._ensure_schema()
        rows = await self.session.execute(
            text(
                """
                SELECT id, slug, version, published_at, created_at
                FROM client_websites
                WHERE client_id = :cid
                ORDER BY version DESC, created_at DESC
                """
            ),
            {"cid": client_id},
        )
        items = [dict(r) for r in rows.mappings().all()]
        return {"client_id": client_id, "items": items}

    async def restore_version(self, client_id: str, website_id: int) -> dict[str, Any]:
        await self._ensure_schema()
        row = await self.session.execute(
            text(
                "SELECT slug, html_content, css_content, version FROM client_websites WHERE id = :id AND client_id = :cid"
            ),
            {"id": website_id, "cid": client_id},
        )
        site = row.mappings().first()
        if not site:
            raise ValueError("version not found")
        new_version = int(site["version"]) + 1
        await self.session.execute(
            text(
                """
                INSERT INTO client_websites (client_id, workspace_id, slug, html_content, css_content, version)
                VALUES (:client_id, :ws, :slug, :html, :css, :version)
                """
            ),
            {
                "client_id": client_id,
                "ws": self.workspace_id,
                "slug": site["slug"],
                "html": site["html_content"],
                "css": site["css_content"] or "",
                "version": new_version,
            },
        )
        await self.session.commit()
        site_id_row = await self.session.execute(text("SELECT last_insert_rowid() AS id"))
        new_id = int(site_id_row.scalar_one())
        return {
            "website_id": new_id,
            "restored_from": website_id,
            "version": new_version,
            "slug": site["slug"],
            "preview_url": f"/api/web-builder/preview/{new_id}",
        }


def get_web_builder_service(session: AsyncSession, workspace_id: int | None = None) -> WebBuilderService:
    return WebBuilderService(session, workspace_id)
