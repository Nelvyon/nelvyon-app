"""F65 — Text-2-Pay: Stripe payment links via SMS / WhatsApp."""

from __future__ import annotations

import json
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
import stripe
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from services.whatsapp_service import get_whatsapp_service

logger = logging.getLogger(__name__)

_SCHEMA_READY = False
TWILIO_API = "https://api.twilio.com/2010-04-01"
VALID_CHANNELS = frozenset({"sms", "whatsapp"})
VALID_STATUSES = frozenset({"pending", "paid", "expired"})


def _normalize_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone or "")
    if len(digits) < 8:
        raise ValueError("lead_phone must be a valid number")
    return f"+{digits}"


class Text2PayService:
    def __init__(self, session: AsyncSession, workspace_id: int):
        self.session = session
        self.workspace_id = workspace_id
        self.stripe_key = os.environ.get("STRIPE_SECRET_KEY", "").strip()
        self.twilio_sid = os.environ.get("TWILIO_ACCOUNT_SID", "").strip()
        self.twilio_token = os.environ.get("TWILIO_AUTH_TOKEN", "").strip()
        self.twilio_from = os.environ.get("TWILIO_PHONE_NUMBER", "").strip()

    @property
    def is_mock(self) -> bool:
        key = self.stripe_key
        if not key:
            return True
        if "fake" in key.lower() or key.endswith("_not_for_production"):
            return True
        return False

    @property
    def sms_configured(self) -> bool:
        return bool(self.twilio_sid and self.twilio_token and self.twilio_from)

    async def ensure_schema(self) -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        await self.session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS text2pay_payments (
                    id TEXT PRIMARY KEY,
                    workspace_id INTEGER NOT NULL,
                    client_id TEXT NOT NULL DEFAULT 'default',
                    lead_phone TEXT NOT NULL,
                    amount REAL NOT NULL,
                    currency TEXT NOT NULL DEFAULT 'eur',
                    description TEXT,
                    channel TEXT NOT NULL DEFAULT 'sms',
                    stripe_payment_link TEXT,
                    stripe_session_id TEXT,
                    status TEXT NOT NULL DEFAULT 'pending',
                    send_result_json TEXT NOT NULL DEFAULT '{}',
                    sent_at TEXT,
                    paid_at TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        await self.session.commit()
        _SCHEMA_READY = True

    async def create_and_send(
        self,
        *,
        client_id: str,
        lead_phone: str,
        amount: float,
        currency: str = "eur",
        description: str,
        channel: str = "sms",
    ) -> dict[str, Any]:
        await self.ensure_schema()
        ch = channel.strip().lower()
        if ch not in VALID_CHANNELS:
            raise ValueError(f"channel must be one of: {', '.join(sorted(VALID_CHANNELS))}")
        if amount <= 0:
            raise ValueError("amount must be greater than 0")
        phone = _normalize_phone(lead_phone)
        pid = str(uuid.uuid4())
        link_info = await self._create_payment_link(amount, currency, description, pid)
        message = (
            f"NELVYON: {description}\n"
            f"Importe: {amount:.2f} {currency.upper()}\n"
            f"Paga aquí: {link_info['url']}"
        )
        send_result = await self._send_message(phone, message, ch)
        now = datetime.now(timezone.utc).isoformat()
        await self.session.execute(
            text(
                """
                INSERT INTO text2pay_payments (
                    id, workspace_id, client_id, lead_phone, amount, currency,
                    description, channel, stripe_payment_link, stripe_session_id,
                    status, send_result_json, sent_at
                )
                VALUES (
                    :id, :ws, :cid, :phone, :amount, :cur, :desc, :ch,
                    :link, :sid, 'pending', :send, :now
                )
                """
            ),
            {
                "id": pid,
                "ws": self.workspace_id,
                "cid": client_id,
                "phone": phone,
                "amount": amount,
                "cur": currency.lower(),
                "desc": description,
                "ch": ch,
                "link": link_info["url"],
                "sid": link_info.get("session_id"),
                "send": json.dumps(send_result, ensure_ascii=False),
                "now": now,
            },
        )
        await self.session.commit()
        return await self.get_payment(pid)

    async def _create_payment_link(
        self, amount: float, currency: str, description: str, payment_id: str
    ) -> dict[str, Any]:
        base = os.environ.get("FRONTEND_APP_URL", "https://nelvyon.com").rstrip("/")
        if self.is_mock:
            mock_url = f"{base}/pay/mock/{payment_id}"
            return {"url": mock_url, "session_id": f"cs_mock_{payment_id[:8]}", "mock": True}
        stripe.api_key = self.stripe_key
        amount_cents = int(round(amount * 100))
        try:
            session = await stripe.checkout.Session.create_async(
                mode="payment",
                line_items=[
                    {
                        "price_data": {
                            "currency": currency.lower(),
                            "unit_amount": amount_cents,
                            "product_data": {"name": description[:120] or "NELVYON cobro"},
                        },
                        "quantity": 1,
                    }
                ],
                success_url=f"{base}/saas/dashboard/text2pay?paid={payment_id}",
                cancel_url=f"{base}/saas/dashboard/text2pay?cancelled=1",
                metadata={"text2pay_id": payment_id, "workspace_id": str(self.workspace_id)},
            )
        except stripe.StripeError as exc:
            logger.warning("text2pay Stripe fallback mock: %s", exc)
            mock_url = f"{base}/pay/mock/{payment_id}"
            return {"url": mock_url, "session_id": f"cs_mock_{payment_id[:8]}", "mock": True}
        return {"url": session.url, "session_id": session.id, "mock": False}

    async def _send_message(self, phone: str, message: str, channel: str) -> dict[str, Any]:
        if channel == "whatsapp":
            wa = get_whatsapp_service()
            return await wa.send_message(phone, message)
        if not self.sms_configured:
            logger.info("[TEXT2PAY MOCK SMS] to=%s", phone)
            return {"mock": True, "channel": "sms", "status": "accepted", "to": phone}
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{TWILIO_API}/Accounts/{self.twilio_sid}/Messages.json",
                data={"To": phone, "From": self.twilio_from, "Body": message},
                auth=(self.twilio_sid, self.twilio_token),
            )
        if resp.status_code >= 400:
            return {"mock": False, "error": resp.text, "status": "failed"}
        data = resp.json()
        return {"mock": False, "sid": data.get("sid"), "status": data.get("status", "queued")}

    async def list_payments(self, client_id: str | None = None) -> dict[str, Any]:
        await self.ensure_schema()
        where = "workspace_id = :ws"
        params: dict[str, Any] = {"ws": self.workspace_id}
        if client_id:
            where += " AND client_id = :cid"
            params["cid"] = client_id
        rows = await self.session.execute(
            text(f"SELECT * FROM text2pay_payments WHERE {where} ORDER BY created_at DESC"),
            params,
        )
        payments = [self._row_dict(r) for r in rows.mappings().all()]
        return {"payments": payments, "stats": self._stats(payments), "mock": self.is_mock}

    def _stats(self, payments: list[dict]) -> dict[str, Any]:
        sent = [p for p in payments if p.get("sent_at")]
        paid = [p for p in payments if p.get("status") == "paid"]
        total_collected = sum(float(p.get("amount") or 0) for p in paid)
        hours: list[float] = []
        for p in paid:
            if p.get("sent_at") and p.get("paid_at"):
                try:
                    s = datetime.fromisoformat(str(p["sent_at"]).replace("Z", "+00:00"))
                    d = datetime.fromisoformat(str(p["paid_at"]).replace("Z", "+00:00"))
                    hours.append((d - s).total_seconds() / 3600)
                except ValueError:
                    pass
        return {
            "total_collected_eur": round(total_collected, 2),
            "conversion_rate_percent": round((len(paid) / len(sent)) * 100, 1) if sent else 0,
            "avg_hours_to_pay": round(sum(hours) / len(hours), 1) if hours else 0,
            "pending_count": sum(1 for p in payments if p.get("status") == "pending"),
        }

    def _row_dict(self, row: Any) -> dict[str, Any]:
        d = dict(row._mapping) if hasattr(row, "_mapping") else dict(row)
        d["send_result"] = json.loads(d.pop("send_result_json", "{}") or "{}")
        return d

    async def get_payment(self, payment_id: str) -> dict[str, Any]:
        await self.ensure_schema()
        row = await self.session.execute(
            text(
                "SELECT * FROM text2pay_payments WHERE id = :id AND workspace_id = :ws"
            ),
            {"id": payment_id, "ws": self.workspace_id},
        )
        r = row.mappings().first()
        if not r:
            raise ValueError("Payment not found")
        out = self._row_dict(r)
        out["mock"] = self.is_mock
        return out

    async def handle_webhook(self, payload: dict[str, Any]) -> dict[str, Any]:
        await self.ensure_schema()
        event_type = payload.get("type", "")
        obj = (payload.get("data") or {}).get("object") or {}
        metadata = obj.get("metadata") or {}
        payment_id = metadata.get("text2pay_id")
        if not payment_id and obj.get("id", "").startswith("cs_"):
            row = await self.session.execute(
                text(
                    "SELECT id FROM text2pay_payments WHERE stripe_session_id = :sid LIMIT 1"
                ),
                {"sid": obj.get("id")},
            )
            found = row.mappings().first()
            if found:
                payment_id = found["id"]
        if not payment_id:
            return {"handled": False, "reason": "no text2pay_id in metadata"}
        now = datetime.now(timezone.utc).isoformat()
        status = "pending"
        if event_type in ("checkout.session.completed", "payment_intent.succeeded"):
            status = "paid"
        elif event_type in ("checkout.session.expired",):
            status = "expired"
        await self.session.execute(
            text(
                """
                UPDATE text2pay_payments
                SET status = :st, paid_at = CASE WHEN :st = 'paid' THEN :now ELSE paid_at END
                WHERE id = :id
                """
            ),
            {"st": status, "now": now, "id": payment_id},
        )
        await self.session.commit()
        return {"handled": True, "payment_id": payment_id, "status": status}


def get_text2pay_service(session: AsyncSession, workspace_id: int) -> Text2PayService:
    return Text2PayService(session, workspace_id)
