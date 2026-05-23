"""NELVYON agency marketplace — verified agencies, reviews, AI matching."""

from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any

from openai import AsyncOpenAI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import db_manager
from services.affiliate_service import AffiliateService

logger = logging.getLogger(__name__)

_SCHEMA_READY = False
MATCH_MODEL = "gpt-4o"


def _json_dumps(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, default=str)


def _row(row: Any) -> dict[str, Any]:
    if row is None:
        return {}
    data = dict(row._mapping)
    for k, v in list(data.items()):
        if isinstance(v, datetime):
            data[k] = v.isoformat()
        elif isinstance(v, Decimal):
            data[k] = float(v)
    return data


def _openai_client() -> AsyncOpenAI:
    api_key = (
        os.environ.get("OPENAI_API_KEY", "").strip()
        or os.environ.get("APP_AI_KEY", "").strip()
    )
    if not api_key:
        raise ValueError("OPENAI_API_KEY is not configured")
    base_url = (
        os.environ.get("OPENAI_BASE_URL", "").strip()
        or os.environ.get("APP_AI_BASE_URL", "").strip()
        or "https://api.openai.com/v1"
    ).rstrip("/")
    return AsyncOpenAI(api_key=api_key, base_url=base_url)


class MarketplaceService:
    """Global agency marketplace (white-label NELVYON partners)."""

    def __init__(self, session: AsyncSession, workspace_id: int | None = None):
        self.session = session
        self.workspace_id = int(workspace_id) if workspace_id is not None else None

    @staticmethod
    async def ensure_schema() -> None:
        await AffiliateService.ensure_schema()
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        _SCHEMA_READY = True

    async def list_agencies(
        self,
        *,
        country: str | None = None,
        service: str | None = None,
        min_rating: float | None = None,
        verified_only: bool = True,
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        await self.ensure_schema()
        q = """
            SELECT id, workspace_id, name, description, services, countries,
                   pricing, location, min_budget, max_budget,
                   rating, reviews_count, verified, created_at
            FROM agency_profiles
            WHERE active = TRUE
        """
        params: dict[str, Any] = {"limit": limit, "offset": offset}
        if verified_only:
            q += " AND verified = TRUE"
        if min_rating is not None:
            q += " AND rating >= :min_rating"
            params["min_rating"] = min_rating
        if country:
            q += " AND countries @> CAST(:country AS jsonb)"
            params["country"] = _json_dumps([country.strip()])
        if service:
            q += " AND services @> CAST(:service AS jsonb)"
            params["service"] = _json_dumps([service.strip()])
        q += " ORDER BY rating DESC, reviews_count DESC LIMIT :limit OFFSET :offset"
        r = await self.session.execute(text(q), params)
        return [self._public_agency_summary(_row(x)) for x in r.fetchall()]

    async def register_agency(
        self,
        workspace_id: int,
        profile_data: dict[str, Any],
    ) -> dict[str, Any]:
        await self.ensure_schema()
        name = (profile_data.get("name") or "").strip()
        if not name:
            raise ValueError("Agency name is required")

        services = profile_data.get("services") or []
        countries = profile_data.get("countries") or []
        pricing = profile_data.get("pricing") or {}

        agency_id = str(uuid.uuid4())
        r = await self.session.execute(
            text(
                """
                INSERT INTO agency_profiles (
                    id, workspace_id, name, description, services, countries,
                    pricing, location, min_budget, max_budget, verified
                )
                VALUES (
                    :id, :ws, :name, :description,
                    CAST(:services AS jsonb), CAST(:countries AS jsonb),
                    CAST(:pricing AS jsonb), :location, :min_budget, :max_budget,
                    :verified
                )
                ON CONFLICT (workspace_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    services = EXCLUDED.services,
                    countries = EXCLUDED.countries,
                    pricing = EXCLUDED.pricing,
                    location = EXCLUDED.location,
                    min_budget = EXCLUDED.min_budget,
                    max_budget = EXCLUDED.max_budget,
                    updated_at = NOW()
                RETURNING *
                """
            ),
            {
                "id": agency_id,
                "ws": workspace_id,
                "name": name,
                "description": profile_data.get("description"),
                "services": _json_dumps(services if isinstance(services, list) else []),
                "countries": _json_dumps(countries if isinstance(countries, list) else []),
                "pricing": _json_dumps(pricing if isinstance(pricing, dict) else {}),
                "location": profile_data.get("location"),
                "min_budget": profile_data.get("min_budget"),
                "max_budget": profile_data.get("max_budget"),
                "verified": bool(profile_data.get("verified", False)),
            },
        )
        await self.session.commit()
        return self._public_agency_summary(_row(r.fetchone()))

    async def get_agency_profile(self, agency_id: str) -> dict[str, Any]:
        await self.ensure_schema()
        r = await self.session.execute(
            text("SELECT * FROM agency_profiles WHERE id = :id::uuid AND active = TRUE"),
            {"id": agency_id},
        )
        row = r.fetchone()
        if not row:
            raise ValueError("Agency not found")

        profile = self._public_agency_summary(_row(row), include_pricing=True)
        reviews = await self.session.execute(
            text(
                """
                SELECT id, reviewer_workspace_id, rating, review, created_at
                FROM agency_reviews
                WHERE agency_id = :id::uuid
                ORDER BY created_at DESC
                LIMIT 20
                """
            ),
            {"id": agency_id},
        )
        profile["reviews"] = [_row(x) for x in reviews.fetchall()]
        return profile

    async def rate_agency(
        self,
        agency_id: str,
        reviewer_workspace_id: int,
        rating: int,
        review: str | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        if rating < 1 or rating > 5:
            raise ValueError("Rating must be between 1 and 5")

        agency = await self.session.execute(
            text("SELECT id FROM agency_profiles WHERE id = :id::uuid"),
            {"id": agency_id},
        )
        if not agency.fetchone():
            raise ValueError("Agency not found")

        review_id = str(uuid.uuid4())
        r = await self.session.execute(
            text(
                """
                INSERT INTO agency_reviews (id, agency_id, reviewer_workspace_id, rating, review)
                VALUES (:id, :aid::uuid, :rws, :rating, :review)
                ON CONFLICT (agency_id, reviewer_workspace_id) DO UPDATE SET
                    rating = EXCLUDED.rating,
                    review = EXCLUDED.review,
                    created_at = NOW()
                RETURNING *
                """
            ),
            {
                "id": review_id,
                "aid": agency_id,
                "rws": reviewer_workspace_id,
                "rating": rating,
                "review": review,
            },
        )
        avg_r = await self.session.execute(
            text(
                """
                SELECT AVG(rating)::numeric(3,2) AS avg_rating, COUNT(*) AS cnt
                FROM agency_reviews WHERE agency_id = :aid::uuid
                """
            ),
            {"aid": agency_id},
        )
        avg_row = avg_r.fetchone()
        await self.session.execute(
            text(
                """
                UPDATE agency_profiles
                SET rating = :rating, reviews_count = :cnt, updated_at = NOW()
                WHERE id = :aid::uuid
                """
            ),
            {
                "aid": agency_id,
                "rating": avg_row._mapping["avg_rating"] if avg_row else rating,
                "cnt": int(avg_row._mapping["cnt"] if avg_row else 1),
            },
        )
        await self.session.commit()
        return _row(r.fetchone())

    async def match_client_to_agency(
        self,
        client_needs: str,
        *,
        location: str | None = None,
        budget: float | None = None,
        limit: int = 5,
    ) -> dict[str, Any]:
        """AI matching of client needs to verified agencies (GPT-4o)."""
        await self.ensure_schema()
        agencies = await self.list_agencies(
            verified_only=True,
            limit=30,
            country=location if location and len(location) <= 3 else None,
        )
        if not agencies:
            return {"matches": [], "reasoning": "No verified agencies available"}

        catalog = [
            {
                "agency_id": a["id"],
                "name": a["name"],
                "services": a.get("services"),
                "countries": a.get("countries"),
                "location": a.get("location"),
                "rating": a.get("rating"),
                "min_budget": a.get("min_budget"),
                "max_budget": a.get("max_budget"),
                "description": (a.get("description") or "")[:400],
            }
            for a in agencies
        ]

        prompt = (
            "Eres el motor de matching del marketplace de agencias NELVYON. "
            "Selecciona las mejores agencias para el cliente según necesidades, ubicación y presupuesto.\n\n"
            f"Necesidades del cliente: {client_needs}\n"
            f"Ubicación: {location or 'no especificada'}\n"
            f"Presupuesto (EUR/mes): {budget if budget is not None else 'no especificado'}\n\n"
            f"Agencias disponibles (JSON):\n{_json_dumps(catalog)}\n\n"
            "Responde SOLO con JSON válido: "
            '{"matches":[{"agency_id":"uuid","score":0-100,"reason":"..."}],"reasoning":"..."}'
        )

        try:
            client = _openai_client()
            resp = await client.chat.completions.create(
                model=MATCH_MODEL,
                messages=[
                    {"role": "system", "content": "Respond only with valid JSON."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=1200,
            )
            raw = (resp.choices[0].message.content or "").strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            parsed = json.loads(raw)
        except json.JSONDecodeError as exc:
            logger.warning("marketplace match JSON parse failed: %s", exc)
            parsed = _fallback_match(catalog, client_needs, budget, limit)
        except Exception as exc:
            logger.warning("marketplace match GPT failed: %s", exc)
            parsed = _fallback_match(catalog, client_needs, budget, limit)

        matches_raw = (parsed.get("matches") or [])[:limit]
        enriched: list[dict[str, Any]] = []
        by_id = {a["id"]: a for a in agencies}
        for m in matches_raw:
            aid = m.get("agency_id")
            if aid and aid in by_id:
                enriched.append(
                    {
                        **by_id[aid],
                        "match_score": m.get("score", 0),
                        "match_reason": m.get("reason", ""),
                    }
                )

        return {
            "matches": enriched,
            "reasoning": parsed.get("reasoning", ""),
            "model": MATCH_MODEL,
            "candidates_evaluated": len(catalog),
        }

    @staticmethod
    def _public_agency_summary(
        row: dict[str, Any],
        *,
        include_pricing: bool = False,
    ) -> dict[str, Any]:
        services = row.get("services") or []
        countries = row.get("countries") or []
        pricing = row.get("pricing") or {}
        if isinstance(services, str):
            services = json.loads(services)
        if isinstance(countries, str):
            countries = json.loads(countries)
        if isinstance(pricing, str):
            pricing = json.loads(pricing)

        out: dict[str, Any] = {
            "id": row.get("id"),
            "workspace_id": row.get("workspace_id"),
            "name": row.get("name"),
            "description": row.get("description"),
            "services": services,
            "countries": countries,
            "location": row.get("location"),
            "rating": float(row.get("rating") or 0),
            "reviews_count": int(row.get("reviews_count") or 0),
            "verified": bool(row.get("verified")),
            "created_at": row.get("created_at"),
        }
        if include_pricing:
            out["pricing"] = pricing
            out["min_budget"] = row.get("min_budget")
            out["max_budget"] = row.get("max_budget")
        return out


def _fallback_match(
    catalog: list[dict[str, Any]],
    client_needs: str,
    budget: float | None,
    limit: int,
) -> dict[str, Any]:
    needs_lower = client_needs.lower()
    scored: list[tuple[float, dict[str, Any]]] = []
    for agency in catalog:
        score = float(agency.get("rating") or 0) * 15
        desc = (agency.get("description") or "").lower()
        for word in needs_lower.split():
            if len(word) > 3 and word in desc:
                score += 10
        services = agency.get("services") or []
        if isinstance(services, list):
            for svc in services:
                if str(svc).lower() in needs_lower:
                    score += 15
        if budget is not None:
            min_b = agency.get("min_budget")
            max_b = agency.get("max_budget")
            if min_b is not None and budget >= float(min_b):
                score += 10
            if max_b is not None and budget <= float(max_b):
                score += 10
        scored.append((score, agency))

    scored.sort(key=lambda x: x[0], reverse=True)
    matches = [
        {
            "agency_id": a["agency_id"],
            "score": min(100, int(s)),
            "reason": "Heuristic match (OpenAI unavailable)",
        }
        for s, a in scored[:limit]
    ]
    return {
        "matches": matches,
        "reasoning": "Fallback heuristic matching used",
    }


def get_marketplace_service(session: AsyncSession, workspace_id: int | None = None) -> MarketplaceService:
    return MarketplaceService(session, workspace_id)
