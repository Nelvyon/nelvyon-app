"""F65 — PR Digital IA: press releases, headlines, crisis comms, media lists."""

from __future__ import annotations

import json
import logging
import os
import uuid
from typing import Any

from openai import AsyncOpenAI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.sql_compat import json_bind

logger = logging.getLogger(__name__)

_SCHEMA_READY = False
VALID_TYPES = frozenset({"press_release", "crisis", "bio", "headlines"})

MEDIA_BY_SECTOR: dict[str, list[dict[str, Any]]] = {
    "tech": [
        {"name": "TechCrunch ES", "tier": 1, "reach": 2_500_000},
        {"name": "Xataka", "tier": 1, "reach": 4_000_000},
        {"name": "Genbeta", "tier": 2, "reach": 1_200_000},
    ],
    "moda": [
        {"name": "Vogue España", "tier": 1, "reach": 3_000_000},
        {"name": "Telva", "tier": 2, "reach": 1_800_000},
        {"name": "Fashionsnap", "tier": 3, "reach": 400_000},
    ],
    "gastronomia": [
        {"name": "Conde Nast Traveler", "tier": 1, "reach": 1_500_000},
        {"name": "Tapas Magazine", "tier": 2, "reach": 600_000},
        {"name": "Directo al Paladar", "tier": 2, "reach": 2_000_000},
    ],
    "saas": [
        {"name": "Forbes Technology", "tier": 1, "reach": 5_000_000},
        {"name": "Sifted", "tier": 2, "reach": 800_000},
        {"name": "EU-Startups", "tier": 2, "reach": 500_000},
    ],
    "salud": [
        {"name": "Redacción Médica", "tier": 1, "reach": 900_000},
        {"name": "Diario Salud", "tier": 2, "reach": 450_000},
    ],
}


def _openai_client() -> AsyncOpenAI | None:
    key = os.environ.get("OPENAI_API_KEY", "").strip() or os.environ.get("APP_AI_KEY", "").strip()
    if not key:
        return None
    base = os.environ.get("OPENAI_BASE_URL", "").strip() or None
    return AsyncOpenAI(api_key=key, base_url=base)


class PrDigitalService:
    def __init__(self, session: AsyncSession, workspace_id: int):
        self.session = session
        self.workspace_id = workspace_id

    async def ensure_schema(self) -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        await self.session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS pr_releases (
                    id TEXT PRIMARY KEY,
                    workspace_id INTEGER NOT NULL,
                    client_id TEXT NOT NULL DEFAULT 'default',
                    sector TEXT,
                    type TEXT NOT NULL,
                    title TEXT,
                    content TEXT NOT NULL,
                    media_targets_json TEXT NOT NULL DEFAULT '[]',
                    estimated_reach INTEGER NOT NULL DEFAULT 0,
                    publication_probability REAL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        await self.session.commit()
        _SCHEMA_READY = True

    async def generate_release(
        self,
        *,
        client_id: str,
        company: str,
        sector: str,
        news: str,
        tone: str = "profesional",
        release_type: str = "press_release",
    ) -> dict[str, Any]:
        await self.ensure_schema()
        rtype = release_type.strip().lower()
        if rtype not in VALID_TYPES:
            rtype = "press_release"
        content, title, mock = await self._ai_content(
            company=company,
            sector=sector,
            news=news,
            tone=tone,
            release_type=rtype,
        )
        media = self.media_list(sector)
        reach = sum(int(m.get("reach", 0)) for m in media.get("media", []))
        prob = round(min(0.85, 0.35 + len(media.get("media", [])) * 0.08), 2)
        rid = str(uuid.uuid4())
        await self.session.execute(
            text(
                f"""
                INSERT INTO pr_releases (
                    id, workspace_id, client_id, sector, type, title, content,
                    media_targets_json, estimated_reach, publication_probability
                )
                VALUES (
                    :id, :ws, :cid, :sector, :type, :title, :content,
                    {json_bind(self.session, "media")}, :reach, :prob
                )
                """
            ),
            {
                "id": rid,
                "ws": self.workspace_id,
                "cid": client_id,
                "sector": sector,
                "type": rtype,
                "title": title,
                "content": content,
                "media": json.dumps(media.get("media", []), ensure_ascii=False),
                "reach": reach,
                "prob": prob,
            },
        )
        await self.session.commit()
        return {
            "id": rid,
            "title": title,
            "content": content,
            "type": rtype,
            "media_targets": media.get("media", []),
            "estimated_reach": reach,
            "publication_probability": prob,
            "mock": mock,
        }

    async def generate_headlines(
        self, *, company: str, sector: str, news: str
    ) -> dict[str, Any]:
        client = _openai_client()
        if not client:
            return {
                "headlines": [
                    f"{company} revoluciona {sector} con su última novedad",
                    f"El sector {sector} tiene un nuevo referente: {company}",
                    f"{company}: la innovación que el mercado esperaba",
                    f"Noticia de impacto en {sector} — {company} lidera el cambio",
                    f"{company} confirma su apuesta por {news[:40]}",
                ],
                "mock": True,
            }
        try:
            resp = await client.chat.completions.create(
                model=os.environ.get("OPENAI_MODEL", "gpt-4o"),
                messages=[
                    {
                        "role": "user",
                        "content": (
                            f"Genera 5 titulares de prensa en español para {company} ({sector}). "
                            f"Novedad: {news}. JSON: headlines (array de 5 strings)."
                        ),
                    }
                ],
                response_format={"type": "json_object"},
                temperature=0.8,
            )
            data = json.loads(resp.choices[0].message.content or "{}")
            headlines = data.get("headlines") or []
            if len(headlines) < 5:
                headlines = (headlines + [f"{company} — titular {i}" for i in range(1, 6)])[:5]
            return {"headlines": headlines[:5], "mock": False}
        except Exception as exc:
            logger.warning("pr headlines fallback: %s", exc)
            return {
                "headlines": [f"{company} anuncia avance en {sector}" for _ in range(5)],
                "mock": True,
            }

    async def generate_crisis(
        self,
        *,
        client_id: str,
        company: str,
        sector: str,
        situation: str,
        tone: str = "empático y transparente",
    ) -> dict[str, Any]:
        content, title, mock = await self._ai_content(
            company=company,
            sector=sector,
            news=situation,
            tone=tone,
            release_type="crisis",
        )
        return await self._save_release(
            client_id=client_id,
            sector=sector,
            release_type="crisis",
            title=title,
            content=content,
            mock=mock,
        )

    async def _save_release(
        self,
        *,
        client_id: str,
        sector: str,
        release_type: str,
        title: str,
        content: str,
        mock: bool,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        media = self.media_list(sector)
        reach = sum(int(m.get("reach", 0)) for m in media.get("media", []))
        rid = str(uuid.uuid4())
        await self.session.execute(
            text(
                f"""
                INSERT INTO pr_releases (
                    id, workspace_id, client_id, sector, type, title, content,
                    media_targets_json, estimated_reach, publication_probability
                )
                VALUES (
                    :id, :ws, :cid, :sector, :type, :title, :content,
                    {json_bind(self.session, "media")}, :reach, :prob
                )
                """
            ),
            {
                "id": rid,
                "ws": self.workspace_id,
                "cid": client_id,
                "sector": sector,
                "type": release_type,
                "title": title,
                "content": content,
                "media": json.dumps(media.get("media", []), ensure_ascii=False),
                "reach": reach,
                "prob": 0.55,
            },
        )
        await self.session.commit()
        return {
            "id": rid,
            "title": title,
            "content": content,
            "type": release_type,
            "estimated_reach": reach,
            "mock": mock,
        }

    async def _ai_content(
        self,
        *,
        company: str,
        sector: str,
        news: str,
        tone: str,
        release_type: str,
    ) -> tuple[str, str, bool]:
        client = _openai_client()
        if not client:
            title = f"{company} — comunicado oficial"
            if release_type == "crisis":
                body = (
                    f"Comunicado de {company} ({sector})\n\n"
                    f"Ante la situación descrita, {company} confirma su compromiso con la transparencia. "
                    f"{news}\n\nContacto prensa: prensa@{company.lower().replace(' ', '')}.com"
                )
            elif release_type == "bio":
                body = (
                    f"{company} es una empresa líder en {sector}, especializada en innovación "
                    f"y crecimiento sostenible. {news}"
                )
            else:
                body = (
                    f"NOTA DE PRENSA — {company}\n\n"
                    f"{company}, referente en {sector}, anuncia: {news}. "
                    f"Tono: {tone}. Contacto: prensa@nelvyon.com"
                )
            return body, title, True
        try:
            prompt = (
                f"Escribe {'comunicado de crisis' if release_type == 'crisis' else 'nota de prensa' if release_type == 'press_release' else 'bio corporativa'} "
                f"para {company} ({sector}). Novedad/situación: {news}. Tono: {tone}. "
                "JSON: title, content (markdown, español, profesional)."
            )
            resp = await client.chat.completions.create(
                model=os.environ.get("OPENAI_MODEL", "gpt-4o"),
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.6,
            )
            data = json.loads(resp.choices[0].message.content or "{}")
            return (
                data.get("content", ""),
                data.get("title", f"{company} — nota"),
                False,
            )
        except Exception as exc:
            logger.warning("pr generate fallback: %s", exc)
            return (
                f"{company} comunica: {news}",
                f"{company} — {sector}",
                True,
            )

    def media_list(self, sector: str) -> dict[str, Any]:
        key = sector.strip().lower()
        media = MEDIA_BY_SECTOR.get(key) or MEDIA_BY_SECTOR.get("saas", [])
        total_reach = sum(int(m.get("reach", 0)) for m in media)
        return {
            "sector": key,
            "media": media,
            "estimated_reach": total_reach,
            "distribution_mock": True,
        }

    async def list_releases(self, client_id: str | None = None) -> dict[str, Any]:
        await self.ensure_schema()
        where = "workspace_id = :ws"
        params: dict[str, Any] = {"ws": self.workspace_id}
        if client_id:
            where += " AND client_id = :cid"
            params["cid"] = client_id
        rows = await self.session.execute(
            text(f"SELECT * FROM pr_releases WHERE {where} ORDER BY created_at DESC"),
            params,
        )
        releases = []
        for r in rows.mappings().all():
            d = dict(r)
            d["media_targets"] = json.loads(d.pop("media_targets_json", "[]") or "[]")
            releases.append(d)
        return {"releases": releases}


def get_pr_digital_service(session: AsyncSession, workspace_id: int) -> PrDigitalService:
    return PrDigitalService(session, workspace_id)
