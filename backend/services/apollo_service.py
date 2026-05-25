"""F62 — Apollo.io lead search, enrich, CRM sync (mock when no API key)."""

from __future__ import annotations

import json
import logging
import os
import random
import uuid
from typing import Any

import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from services.crm_service import CRMService

logger = logging.getLogger(__name__)

APOLLO_BASE = "https://api.apollo.io/v1"
_SCHEMA_READY = False

MOCK_LEADS = [
    {
        "apollo_id": "mock-001",
        "name": "Laura García",
        "title": "CMO",
        "company": "TechScale SL",
        "email": "laura.garcia@techscale.es",
        "phone": "+34600111222",
        "linkedin_url": "https://linkedin.com/in/lauragarcia",
        "city": "Madrid",
        "sector": "saas",
        "company_size": "51-200",
    },
    {
        "apollo_id": "mock-002",
        "name": "Carlos Méndez",
        "title": "Director Comercial",
        "company": "Innova Retail",
        "email": "carlos.mendez@innovaretail.com",
        "phone": "+34600333444",
        "linkedin_url": "https://linkedin.com/in/carlosmendez",
        "city": "Barcelona",
        "sector": "ecommerce",
        "company_size": "201-500",
    },
    {
        "apollo_id": "mock-003",
        "name": "Elena Ruiz",
        "title": "Head of Growth",
        "company": "Clínica Nova",
        "email": "elena.ruiz@clinicanova.es",
        "phone": "+34600555666",
        "linkedin_url": "https://linkedin.com/in/elenaruiz",
        "city": "Valencia",
        "sector": "salud",
        "company_size": "11-50",
    },
]


def _mock_mode() -> bool:
    return not os.environ.get("APOLLO_API_KEY", "").strip()


def _ai_score(lead: dict[str, Any], sector: str) -> int:
    base = 55
    if lead.get("email"):
        base += 15
    if lead.get("phone"):
        base += 10
    if (lead.get("sector") or "").lower() == sector.lower():
        base += 12
    titles = (lead.get("title") or "").lower()
    if any(t in titles for t in ("cmo", "ceo", "director", "head", "vp")):
        base += 8
    return min(100, base + random.randint(-5, 5))


class ApolloService:
    def __init__(self, session: AsyncSession, workspace_id: int):
        self.session = session
        self.workspace_id = workspace_id
        self.api_key = os.environ.get("APOLLO_API_KEY", "").strip()

    async def _ensure_schema(self) -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        await self.session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS apollo_lead_cache (
                    id TEXT PRIMARY KEY,
                    workspace_id INTEGER NOT NULL,
                    apollo_id TEXT,
                    payload_json TEXT NOT NULL,
                    ai_score INTEGER,
                    synced_contact_id TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        await self.session.commit()
        _SCHEMA_READY = True

    async def search(
        self,
        *,
        sector: str = "saas",
        title: str | None = None,
        city: str | None = None,
        company_size: str | None = None,
        limit: int = 25,
    ) -> dict[str, Any]:
        await self._ensure_schema()
        if _mock_mode():
            items = []
            for lead in MOCK_LEADS:
                if sector and lead.get("sector") != sector and sector != "all":
                    continue
                if title and title.lower() not in (lead.get("title") or "").lower():
                    continue
                if city and city.lower() not in (lead.get("city") or "").lower():
                    continue
                if company_size and lead.get("company_size") != company_size:
                    continue
                scored = {**lead, "ai_score": _ai_score(lead, sector)}
                items.append(scored)
            return {"items": items[:limit], "mock": True, "total": len(items)}

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{APOLLO_BASE}/mixed_people/search",
                headers={"Content-Type": "application/json", "Cache-Control": "no-cache"},
                json={
                    "api_key": self.api_key,
                    "person_titles": [title] if title else [],
                    "organization_locations": [city] if city else [],
                    "per_page": limit,
                },
            )
        if resp.status_code >= 400:
            logger.warning("Apollo search failed: %s", resp.text[:300])
            old = self.api_key
            self.api_key = ""
            try:
                return await self.search(
                    sector=sector, title=title, city=city, company_size=company_size, limit=limit
                )
            finally:
                self.api_key = old
        data = resp.json()
        people = data.get("people") or []
        items = []
        for p in people:
            org = p.get("organization") or {}
            lead = {
                "apollo_id": p.get("id"),
                "name": f"{p.get('first_name','')} {p.get('last_name','')}".strip(),
                "title": p.get("title"),
                "company": org.get("name"),
                "email": (p.get("email") or (p.get("email_status") == "verified" and p.get("email"))),
                "phone": p.get("phone_numbers", [{}])[0].get("raw_number") if p.get("phone_numbers") else None,
                "linkedin_url": p.get("linkedin_url"),
                "city": p.get("city"),
                "sector": sector,
                "company_size": org.get("estimated_num_employees"),
            }
            lead["ai_score"] = _ai_score(lead, sector)
            items.append(lead)
        return {"items": items, "mock": False, "total": len(items)}

    async def enrich_contact(self, contact_id: str) -> dict[str, Any]:
        await self._ensure_schema()
        crm = CRMService(self.session, self.workspace_id)
        contact = await crm.get_contact_by_id(contact_id)
        meta = contact.get("metadata") or {}
        if isinstance(meta, str):
            try:
                meta = json.loads(meta) if meta else {}
            except json.JSONDecodeError:
                meta = {}
        if _mock_mode():
            enriched = {
                "email": contact.get("email") or f"enriched.{contact_id[:8]}@example.com",
                "phone": contact.get("phone") or "+34600999888",
                "linkedin_url": f"https://linkedin.com/in/{contact_id[:8]}",
                "company": contact.get("company") or "Empresa Demo",
                "title": "Decision Maker",
            }
        else:
            enriched = {"email": contact.get("email"), "phone": contact.get("phone")}

        await crm.update_contact(
            contact_id,
            email=enriched.get("email"),
            phone=enriched.get("phone"),
            metadata={
                **meta,
                "linkedin_url": enriched.get("linkedin_url"),
                "apollo_enriched": True,
            },
        )
        await self.session.commit()
        return {"contact_id": contact_id, "enriched": enriched, "mock": _mock_mode()}

    async def sync_to_crm(self, leads: list[dict[str, Any]]) -> dict[str, Any]:
        await self._ensure_schema()
        crm = CRMService(self.session, self.workspace_id)
        created: list[dict[str, Any]] = []
        for lead in leads:
            name = lead.get("name") or "Lead Apollo"
            try:
                row = await crm.create_contact(
                    name=name,
                    email=lead.get("email"),
                    phone=lead.get("phone"),
                    company=lead.get("company"),
                    tags=["apollo"],
                    metadata={
                        "apollo_id": lead.get("apollo_id"),
                        "linkedin_url": lead.get("linkedin_url"),
                        "title": lead.get("title"),
                        "ai_score": lead.get("ai_score"),
                    },
                )
                created.append({"contact_id": str(row.get("id")), "name": name, "ai_score": lead.get("ai_score")})
            except Exception as exc:
                logger.warning("apollo sync contact skip: %s", exc)
        await self.session.commit()
        return {"synced": len(created), "contacts": created, "mock": _mock_mode()}

    async def suggestions(self, client_id: str, sector: str = "saas") -> dict[str, Any]:
        result = await self.search(sector=sector, limit=10)
        for item in result.get("items", []):
            item["reason"] = f"Encaje alto con sector {sector} del cliente {client_id}"
        return {"client_id": client_id, "sector": sector, "suggestions": result.get("items", []), "mock": result.get("mock", True)}


def get_apollo_service(session: AsyncSession, workspace_id: int) -> ApolloService:
    return ApolloService(session, workspace_id)
