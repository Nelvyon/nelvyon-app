"""F64 — CPQ AI quotes + SES delivery + view tracking."""

from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any

from openai import AsyncOpenAI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.sql_compat import json_bind
from services.ses_service import get_ses_service

logger = logging.getLogger(__name__)

_SCHEMA_READY = False
VALID_STATUSES = frozenset({"draft", "sent", "viewed", "accepted", "rejected"})

PIXEL_GIF = (
    b"GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,"
    b"\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"
)


def _openai_client() -> AsyncOpenAI | None:
    key = os.environ.get("OPENAI_API_KEY", "").strip() or os.environ.get("APP_AI_KEY", "").strip()
    if not key:
        return None
    base = os.environ.get("OPENAI_BASE_URL", "").strip() or None
    return AsyncOpenAI(api_key=key, base_url=base)


class CpqService:
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
                CREATE TABLE IF NOT EXISTS cpq_quotes (
                    id TEXT PRIMARY KEY,
                    workspace_id INTEGER NOT NULL,
                    client_id TEXT NOT NULL DEFAULT 'default',
                    lead_email TEXT NOT NULL,
                    lead_name TEXT,
                    sector TEXT,
                    company_size TEXT,
                    budget_hint TEXT,
                    services_json TEXT NOT NULL DEFAULT '[]',
                    price_breakdown_json TEXT NOT NULL DEFAULT '{}',
                    total_eur REAL NOT NULL DEFAULT 0,
                    roi_summary TEXT,
                    status TEXT NOT NULL DEFAULT 'draft',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    sent_at TEXT,
                    viewed_at TEXT,
                    accepted_at TEXT
                )
                """
            )
        )
        await self.session.commit()
        _SCHEMA_READY = True

    async def generate_quote(
        self,
        *,
        client_id: str,
        lead_email: str,
        sector: str,
        services: list[str],
        budget_hint: str | None = None,
        company_size: str | None = None,
        lead_name: str | None = None,
        send_email: bool = True,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        breakdown = await self._ai_breakdown(sector, services, budget_hint, company_size)
        qid = str(uuid.uuid4())
        total = float(breakdown.get("total_eur") or 0)
        await self.session.execute(
            text(
                f"""
                INSERT INTO cpq_quotes (
                    id, workspace_id, client_id, lead_email, lead_name, sector,
                    company_size, budget_hint, services_json, price_breakdown_json,
                    total_eur, roi_summary, status
                )
                VALUES (
                    :id, :ws, :cid, :email, :name, :sector, :size, :budget,
                    {json_bind(self.session, "services")},
                    {json_bind(self.session, "breakdown")},
                    :total, :roi, 'draft'
                )
                """
            ),
            {
                "id": qid,
                "ws": self.workspace_id,
                "cid": client_id,
                "email": lead_email.strip().lower(),
                "name": lead_name,
                "sector": sector,
                "size": company_size,
                "budget": budget_hint,
                "services": json.dumps(services, ensure_ascii=False),
                "breakdown": json.dumps(breakdown, ensure_ascii=False),
                "total": total,
                "roi": breakdown.get("roi_summary", ""),
            },
        )
        await self.session.commit()
        quote = await self.get_quote(qid)
        if send_email:
            quote = await self.send_quote(qid)
        return quote

    async def _ai_breakdown(
        self,
        sector: str,
        services: list[str],
        budget_hint: str | None,
        company_size: str | None,
    ) -> dict[str, Any]:
        client = _openai_client()
        svc_list = ", ".join(services) if services else "SEO, Ads, Email automation"
        if not client:
            lines = [
                {"item": "Setup NELVYON OS", "amount_eur": 497, "notes": "Onboarding 14 días"},
                {"item": f"Plan Growth — {sector}", "amount_eur": 297, "notes": "Mensual"},
                {"item": "Creatividades IA + reporting", "amount_eur": 150, "notes": "Mensual"},
            ]
            total = sum(l["amount_eur"] for l in lines)
            return {
                "lines": lines,
                "total_eur": total,
                "timeline_weeks": 8,
                "conditions": "Pago mensual. 14 días prueba. Precios sin IVA.",
                "roi_summary": f"ROI estimado 3.2x en 90 días para {sector} ({company_size or 'PYME'}).",
                "mock": True,
            }
        try:
            resp = await client.chat.completions.create(
                model=os.environ.get("OPENAI_MODEL", "gpt-4o"),
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Genera presupuesto B2B NELVYON en JSON: lines[{item,amount_eur,notes}], "
                            "total_eur, timeline_weeks, conditions, roi_summary. Profesional, EUR."
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Sector: {sector}. Servicios: {svc_list}. "
                            f"Tamaño: {company_size}. Presupuesto cliente: {budget_hint}."
                        ),
                    },
                ],
                response_format={"type": "json_object"},
                temperature=0.5,
            )
            data = json.loads(resp.choices[0].message.content or "{}")
            if "total_eur" not in data and data.get("lines"):
                data["total_eur"] = sum(float(l.get("amount_eur", 0)) for l in data["lines"])
            data["mock"] = False
            return data
        except Exception as exc:
            logger.warning("cpq AI fallback: %s", exc)
            lines = [
                {"item": "NELVYON Growth", "amount_eur": 297, "notes": sector},
                {"item": "Implementación", "amount_eur": 497, "notes": "One-time"},
            ]
            return {
                "lines": lines,
                "total_eur": 794,
                "timeline_weeks": 6,
                "conditions": "14 días prueba incluida.",
                "roi_summary": f"ROI orientativo 2.5x ({company_size or 'PYME'}).",
                "mock": True,
            }

    async def list_quotes(self, client_id: str | None = None) -> dict[str, Any]:
        await self.ensure_schema()
        where = "workspace_id = :ws"
        params: dict[str, Any] = {"ws": self.workspace_id}
        if client_id:
            where += " AND client_id = :cid"
            params["cid"] = client_id
        rows = await self.session.execute(
            text(f"SELECT * FROM cpq_quotes WHERE {where} ORDER BY created_at DESC"),
            params,
        )
        quotes = []
        for r in rows.mappings().all():
            quotes.append(self._quote_dict(r))
        stats = self._aggregate_stats(quotes)
        return {"quotes": quotes, "stats": stats}

    def _quote_dict(self, row: Any) -> dict[str, Any]:
        d = dict(row._mapping) if hasattr(row, "_mapping") else dict(row)
        d["services"] = json.loads(d.get("services_json") or "[]")
        d["price_breakdown"] = json.loads(d.get("price_breakdown_json") or "{}")
        return d

    def _aggregate_stats(self, quotes: list[dict]) -> dict[str, Any]:
        sent = [q for q in quotes if q.get("status") in ("sent", "viewed", "accepted", "rejected")]
        viewed = [q for q in quotes if q.get("status") in ("viewed", "accepted")]
        accepted = [q for q in quotes if q.get("status") == "accepted"]
        total_value = sum(float(q.get("total_eur") or 0) for q in quotes)
        return {
            "total_quotes": len(quotes),
            "sent_count": len(sent),
            "open_rate_percent": round((len(viewed) / len(sent)) * 100, 1) if sent else 0,
            "acceptance_rate_percent": round((len(accepted) / len(sent)) * 100, 1) if sent else 0,
            "total_value_eur": round(total_value, 2),
        }

    async def get_quote(self, quote_id: str) -> dict[str, Any]:
        await self.ensure_schema()
        row = await self.session.execute(
            text("SELECT * FROM cpq_quotes WHERE id = :id AND workspace_id = :ws"),
            {"id": quote_id, "ws": self.workspace_id},
        )
        r = row.mappings().first()
        if not r:
            raise ValueError("Quote not found")
        return self._quote_dict(r)

    async def update_status(self, quote_id: str, status: str) -> dict[str, Any]:
        st = status.strip().lower()
        if st not in VALID_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(sorted(VALID_STATUSES))}")
        await self.ensure_schema()
        extra = ""
        if st == "accepted":
            extra = ", accepted_at = :now"
        await self.session.execute(
            text(f"UPDATE cpq_quotes SET status = :st{extra} WHERE id = :id AND workspace_id = :ws"),
            {
                "st": st,
                "id": quote_id,
                "ws": self.workspace_id,
                "now": datetime.now(timezone.utc).isoformat(),
            },
        )
        await self.session.commit()
        return await self.get_quote(quote_id)

    async def send_quote(self, quote_id: str) -> dict[str, Any]:
        quote = await self.get_quote(quote_id)
        base = os.environ.get("FRONTEND_APP_URL", "https://nelvyon.com").rstrip("/")
        api_base = os.environ.get("PYTHON_BACKEND_URL", "http://localhost:8000").rstrip("/")
        pixel = f"{api_base}/api/cpq/quotes/{quote_id}/viewed"
        lines = quote.get("price_breakdown", {}).get("lines", [])
        rows_html = "".join(
            f"<tr><td>{l.get('item')}</td><td>{l.get('amount_eur')} €</td><td>{l.get('notes','')}</td></tr>"
            for l in lines
        )
        html = f"""
        <h2>Presupuesto NELVYON — {quote.get('sector')}</h2>
        <p>Hola{(' ' + str(quote.get('lead_name'))) if quote.get('lead_name') else ''},</p>
        <p>Adjuntamos propuesta personalizada (total <strong>{quote.get('total_eur')} €</strong>).</p>
        <table border="1" cellpadding="8"><tr><th>Concepto</th><th>Importe</th><th>Notas</th></tr>
        {rows_html}</table>
        <p>{quote.get('roi_summary') or quote.get('price_breakdown', {}).get('roi_summary', '')}</p>
        <p><a href="{base}/register">Aceptar propuesta / empezar prueba 14 días</a></p>
        <img src="{pixel}" width="1" height="1" alt="" />
        """
        ses = get_ses_service()
        from_addr = os.environ.get("SES_FROM_EMAIL", "noreply@nelvyon.com").strip()
        to_email = str(quote.get("lead_email") or "").strip()
        if not to_email:
            raise ValueError("Quote lead_email is required to send")
        result = await ses.send_email(
            to_email,
            f"Presupuesto NELVYON — {quote.get('sector', 'su proyecto')}",
            html,
            from_email=from_addr or None,
        )
        now = datetime.now(timezone.utc).isoformat()
        await self.session.execute(
            text(
                "UPDATE cpq_quotes SET status = 'sent', sent_at = :now WHERE id = :id AND workspace_id = :ws"
            ),
            {"now": now, "id": quote_id, "ws": self.workspace_id},
        )
        await self.session.commit()
        out = await self.get_quote(quote_id)
        out["email_result"] = result
        return out

    async def mark_viewed(self, quote_id: str) -> bool:
        await self.ensure_schema()
        now = datetime.now(timezone.utc).isoformat()
        result = await self.session.execute(
            text(
                """
                UPDATE cpq_quotes SET status = 'viewed', viewed_at = COALESCE(viewed_at, :now)
                WHERE id = :id
                """
            ),
            {"id": quote_id, "now": now},
        )
        await self.session.commit()
        return (result.rowcount or 0) > 0


def get_cpq_service(session: AsyncSession, workspace_id: int) -> CpqService:
    return CpqService(session, workspace_id)
