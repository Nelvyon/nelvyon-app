"""NELVYON affiliate program — referrals, commissions, Stripe payouts."""

from __future__ import annotations

import json
import logging
import os
import secrets
import uuid
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Any

import stripe
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import db_manager

logger = logging.getLogger(__name__)

_SCHEMA_READY = False
FIRST_YEAR_RATE = Decimal("0.20")
RECURRING_RATE = Decimal("0.10")
AFFILIATE_CODE_PREFIX = "NEL"
DEFAULT_COMMISSION_RATE = Decimal("0.20")


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


def _money(value: Decimal | float | int) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _generate_code() -> str:
    return f"{AFFILIATE_CODE_PREFIX}{secrets.token_hex(4).upper()}"


def _stripe_configured() -> bool:
    return bool(os.environ.get("STRIPE_SECRET_KEY", "").strip())


class AffiliateService:
    """Workspace-scoped affiliate management."""

    def __init__(self, session: AsyncSession, workspace_id: int | None = None):
        self.session = session
        self.workspace_id = int(workspace_id) if workspace_id is not None else None

    @staticmethod
    async def ensure_schema() -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        if not db_manager.async_session_maker:
            await db_manager.ensure_initialized()
        sql_path = Path(__file__).resolve().parent.parent / "migrations" / "affiliates.sql"
        if sql_path.exists():
            raw = sql_path.read_text(encoding="utf-8")
            async with db_manager.async_session_maker() as session:
                for stmt in [s.strip() for s in raw.split(";") if s.strip()]:
                    try:
                        await session.execute(text(stmt))
                    except Exception as exc:
                        if "already exists" not in str(exc).lower():
                            logger.debug("affiliates schema stmt skipped: %s", exc)
                await session.commit()
        _SCHEMA_READY = True

    async def register_affiliate(
        self,
        workspace_id: int,
        user_id: str,
        commission_rate: float | Decimal | None = None,
        *,
        stripe_connect_id: str | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        rate = _money(commission_rate if commission_rate is not None else DEFAULT_COMMISSION_RATE)

        existing = await self.session.execute(
            text(
                """
                SELECT id FROM affiliates
                WHERE workspace_id = :ws AND user_id = :uid
                """
            ),
            {"ws": workspace_id, "uid": user_id},
        )
        if existing.fetchone():
            raise ValueError("Affiliate already registered for this workspace")

        affiliate_id = str(uuid.uuid4())
        code = _generate_code()
        for _ in range(5):
            dup = await self.session.execute(
                text("SELECT 1 FROM affiliates WHERE code = :code"),
                {"code": code},
            )
            if not dup.fetchone():
                break
            code = _generate_code()

        r = await self.session.execute(
            text(
                """
                INSERT INTO affiliates (
                    id, workspace_id, user_id, code, commission_rate,
                    stripe_connect_id, status
                )
                VALUES (
                    :id, :ws, :uid, :code, :rate, :connect_id, 'active'
                )
                RETURNING *
                """
            ),
            {
                "id": affiliate_id,
                "ws": workspace_id,
                "uid": user_id,
                "code": code,
                "rate": rate,
                "connect_id": stripe_connect_id,
            },
        )
        await self.session.commit()
        row = _row(r.fetchone())
        row["affiliate_link"] = self._affiliate_link(code)
        return row

    async def get_affiliate_by_code(self, code: str) -> dict[str, Any] | None:
        await self.ensure_schema()
        normalized = (code or "").strip().upper()
        r = await self.session.execute(
            text("SELECT * FROM affiliates WHERE code = :code AND status = 'active'"),
            {"code": normalized},
        )
        row = r.fetchone()
        return _row(row) if row else None

    async def get_affiliate_for_workspace(self, workspace_id: int, user_id: str) -> dict[str, Any] | None:
        await self.ensure_schema()
        r = await self.session.execute(
            text(
                """
                SELECT * FROM affiliates
                WHERE workspace_id = :ws AND user_id = :uid
                """
            ),
            {"ws": workspace_id, "uid": user_id},
        )
        row = r.fetchone()
        return _row(row) if row else None

    async def track_click(
        self,
        affiliate_code: str,
        *,
        ip_hash: str | None = None,
        user_agent: str | None = None,
        referrer: str | None = None,
    ) -> dict[str, Any]:
        affiliate = await self.get_affiliate_by_code(affiliate_code)
        if not affiliate:
            raise ValueError("Invalid or inactive affiliate code")

        await self.session.execute(
            text(
                """
                INSERT INTO affiliate_clicks (affiliate_id, code, ip_hash, user_agent, referrer)
                VALUES (:aid::uuid, :code, :ip_hash, :ua, :ref)
                """
            ),
            {
                "aid": affiliate["id"],
                "code": affiliate["code"],
                "ip_hash": ip_hash,
                "ua": user_agent,
                "ref": referrer,
            },
        )
        await self.session.execute(
            text(
                """
                UPDATE affiliates
                SET total_clicks = total_clicks + 1, updated_at = NOW()
                WHERE id = :id::uuid
                """
            ),
            {"id": affiliate["id"]},
        )
        await self.session.commit()
        return {"tracked": True, "type": "click", "code": affiliate["code"]}

    async def track_referral(
        self,
        affiliate_code: str,
        referred_workspace_id: int,
        *,
        subscription_amount: float | Decimal = 0,
        is_recurring: bool = False,
    ) -> dict[str, Any]:
        """Register a referral conversion (20% first year, 10% recurring)."""
        await self.ensure_schema()
        affiliate = await self.get_affiliate_by_code(affiliate_code)
        if not affiliate:
            raise ValueError("Invalid or inactive affiliate code")

        if int(affiliate.get("workspace_id") or 0) == int(referred_workspace_id):
            raise ValueError("Cannot refer your own workspace")

        dup = await self.session.execute(
            text(
                "SELECT id FROM affiliate_referrals WHERE referred_workspace_id = :rws"
            ),
            {"rws": referred_workspace_id},
        )
        if dup.fetchone():
            raise ValueError("Workspace already referred")

        commission_type = "recurring" if is_recurring else "first_year"
        rate = RECURRING_RATE if is_recurring else FIRST_YEAR_RATE
        amount = _money(subscription_amount)
        commission = _money(amount * rate) if amount > 0 else Decimal("0")

        referral_id = str(uuid.uuid4())
        r = await self.session.execute(
            text(
                """
                INSERT INTO affiliate_referrals (
                    id, affiliate_id, referred_workspace_id, status,
                    commission_type, subscription_amount, commission_amount
                )
                VALUES (
                    :id, :aid::uuid, :rws, 'approved',
                    :ctype, :sub_amount, :commission
                )
                RETURNING *
                """
            ),
            {
                "id": referral_id,
                "aid": affiliate["id"],
                "rws": referred_workspace_id,
                "ctype": commission_type,
                "sub_amount": amount,
                "commission": commission,
            },
        )
        await self.session.execute(
            text(
                """
                UPDATE affiliates
                SET total_conversions = total_conversions + 1,
                    total_earnings = total_earnings + :commission,
                    pending_payout = pending_payout + :commission,
                    updated_at = NOW()
                WHERE id = :id::uuid
                """
            ),
            {"id": affiliate["id"], "commission": commission},
        )
        await self.session.commit()
        return _row(r.fetchone())

    async def calculate_commission(
        self,
        affiliate_id: str,
        period: str,
    ) -> dict[str, Any]:
        """
        Calculate commission for a period (YYYY-MM or YYYY-MM-DD:YYYY-MM-DD).
        Applies 20% first-year and 10% recurring rules on approved unpaid referrals.
        """
        await self.ensure_schema()
        start, end = _parse_period(period)

        r = await self.session.execute(
            text(
                """
                SELECT id, referred_workspace_id, commission_type,
                       subscription_amount, commission_amount, status, created_at
                FROM affiliate_referrals
                WHERE affiliate_id = :aid::uuid
                  AND created_at >= :start AND created_at < :end
                  AND status IN ('pending', 'approved')
                ORDER BY created_at ASC
                """
            ),
            {"aid": affiliate_id, "start": start, "end": end},
        )
        rows = [_row(x) for x in r.fetchall()]
        total = Decimal("0")
        breakdown: list[dict[str, Any]] = []

        for ref in rows:
            sub = _money(ref.get("subscription_amount") or 0)
            ctype = ref.get("commission_type") or "first_year"
            rate = RECURRING_RATE if ctype == "recurring" else FIRST_YEAR_RATE
            commission = _money(ref.get("commission_amount") or 0)
            if commission == 0 and sub > 0:
                commission = _money(sub * rate)
            total += commission
            breakdown.append(
                {
                    "referral_id": ref["id"],
                    "commission_type": ctype,
                    "rate": float(rate),
                    "subscription_amount": float(sub),
                    "commission_amount": float(commission),
                }
            )

        return {
            "affiliate_id": affiliate_id,
            "period": period,
            "period_start": start.isoformat(),
            "period_end": end.isoformat(),
            "referrals_count": len(rows),
            "total_commission": float(total),
            "breakdown": breakdown,
        }

    async def payout_affiliate(
        self,
        affiliate_id: str,
        amount: float | Decimal,
    ) -> dict[str, Any]:
        """Pay affiliate via Stripe Transfer to Connect account."""
        await self.ensure_schema()
        payout_amount = _money(amount)
        if payout_amount <= 0:
            raise ValueError("Payout amount must be positive")

        r = await self.session.execute(
            text("SELECT * FROM affiliates WHERE id = :id::uuid"),
            {"id": affiliate_id},
        )
        affiliate = _row(r.fetchone())
        if not affiliate:
            raise ValueError("Affiliate not found")

        pending = _money(affiliate.get("pending_payout") or 0)
        if payout_amount > pending:
            raise ValueError(f"Payout exceeds pending balance ({float(pending)})")

        payout_id = str(uuid.uuid4())
        stripe_transfer_id: str | None = None
        status = "pending"
        error_message: str | None = None

        connect_id = affiliate.get("stripe_connect_id")
        if _stripe_configured() and connect_id:
            stripe.api_key = os.environ["STRIPE_SECRET_KEY"].strip()
            try:
                transfer = stripe.Transfer.create(
                    amount=int(payout_amount * 100),
                    currency="eur",
                    destination=connect_id,
                    metadata={
                        "affiliate_id": affiliate_id,
                        "payout_id": payout_id,
                        "nelvyon": "affiliate_payout",
                    },
                )
                stripe_transfer_id = transfer.id
                status = "completed"
            except stripe.StripeError as exc:
                logger.warning("Stripe transfer failed: %s", exc)
                status = "failed"
                error_message = str(exc)[:500]
        elif not connect_id:
            status = "failed"
            error_message = "Affiliate has no Stripe Connect account configured"
        else:
            status = "failed"
            error_message = "STRIPE_SECRET_KEY not configured"

        await self.session.execute(
            text(
                """
                INSERT INTO affiliate_payouts (
                    id, affiliate_id, amount, status, stripe_transfer_id, error_message
                )
                VALUES (:id, :aid::uuid, :amount, :status, :transfer_id, :error)
                """
            ),
            {
                "id": payout_id,
                "aid": affiliate_id,
                "amount": payout_amount,
                "status": status,
                "transfer_id": stripe_transfer_id,
                "error": error_message,
            },
        )

        if status == "completed":
            await self.session.execute(
                text(
                    """
                    UPDATE affiliates
                    SET pending_payout = pending_payout - :amount, updated_at = NOW()
                    WHERE id = :id::uuid
                    """
                ),
                {"id": affiliate_id, "amount": payout_amount},
            )
            await self.session.execute(
                text(
                    """
                    UPDATE affiliate_referrals
                    SET status = 'paid', paid_at = NOW()
                    WHERE affiliate_id = :aid::uuid
                      AND status = 'approved' AND paid_at IS NULL
                    """
                ),
                {"aid": affiliate_id},
            )

        await self.session.commit()
        return {
            "payout_id": payout_id,
            "affiliate_id": affiliate_id,
            "amount": float(payout_amount),
            "status": status,
            "stripe_transfer_id": stripe_transfer_id,
            "error_message": error_message,
        }

    async def get_affiliate_stats(self, affiliate_id: str) -> dict[str, Any]:
        await self.ensure_schema()
        r = await self.session.execute(
            text("SELECT * FROM affiliates WHERE id = :id::uuid"),
            {"id": affiliate_id},
        )
        affiliate = _row(r.fetchone())
        if not affiliate:
            raise ValueError("Affiliate not found")

        conv = await self.session.execute(
            text(
                """
                SELECT COUNT(*) AS cnt,
                       COALESCE(SUM(commission_amount), 0) AS total_commission
                FROM affiliate_referrals
                WHERE affiliate_id = :aid::uuid
                """
            ),
            {"aid": affiliate_id},
        )
        conv_row = conv.fetchone()
        pending_comm = await self.session.execute(
            text(
                """
                SELECT COALESCE(SUM(commission_amount), 0) AS pending
                FROM affiliate_referrals
                WHERE affiliate_id = :aid::uuid AND status = 'approved' AND paid_at IS NULL
                """
            ),
            {"aid": affiliate_id},
        )
        pending_row = pending_comm.fetchone()

        return {
            "affiliate_id": affiliate_id,
            "code": affiliate.get("code"),
            "affiliate_link": self._affiliate_link(str(affiliate.get("code"))),
            "status": affiliate.get("status"),
            "clicks": int(affiliate.get("total_clicks") or 0),
            "conversions": int(affiliate.get("total_conversions") or 0),
            "total_earnings": float(affiliate.get("total_earnings") or 0),
            "pending_payout": float(affiliate.get("pending_payout") or 0),
            "pending_commissions": float(pending_row._mapping["pending"] if pending_row else 0),
            "total_referral_commission": float(conv_row._mapping["total_commission"] if conv_row else 0),
            "commission_rates": {
                "first_year": float(FIRST_YEAR_RATE),
                "recurring": float(RECURRING_RATE),
            },
        }

    async def list_payouts(self, affiliate_id: str, *, limit: int = 50) -> list[dict[str, Any]]:
        await self.ensure_schema()
        r = await self.session.execute(
            text(
                """
                SELECT id, affiliate_id, amount, currency, status,
                       stripe_transfer_id, error_message, created_at
                FROM affiliate_payouts
                WHERE affiliate_id = :aid::uuid
                ORDER BY created_at DESC
                LIMIT :limit
                """
            ),
            {"aid": affiliate_id, "limit": limit},
        )
        return [_row(x) for x in r.fetchall()]

    @staticmethod
    def _affiliate_link(code: str) -> str:
        base = os.environ.get("NEXT_PUBLIC_APP_URL", "https://nelvyon.com").rstrip("/")
        return f"{base}/?ref={code}"


def _parse_period(period: str) -> tuple[datetime, datetime]:
    period = (period or "").strip()
    if ":" in period:
        start_s, end_s = period.split(":", 1)
        start = datetime.fromisoformat(start_s.replace("Z", "+00:00"))
        end = datetime.fromisoformat(end_s.replace("Z", "+00:00"))
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        if end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)
        return start, end

    if len(period) == 7:
        year, month = int(period[:4]), int(period[5:7])
        start = datetime(year, month, 1, tzinfo=timezone.utc)
        if month == 12:
            end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            end = datetime(year, month + 1, 1, tzinfo=timezone.utc)
        return start, end

    raise ValueError("Period must be YYYY-MM or ISO start:end")


def get_affiliate_service(session: AsyncSession, workspace_id: int | None = None) -> AffiliateService:
    return AffiliateService(session, workspace_id)
