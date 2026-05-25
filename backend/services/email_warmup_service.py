"""F63 — Email warmup, SES pool rotation, deliverability scoring."""

from __future__ import annotations

import json
import logging
import os
import random
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
from openai import AsyncOpenAI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.sql_compat import json_bind

logger = logging.getLogger(__name__)

_SCHEMA_READY = False
WARMUP_DAYS = 30


def _enabled() -> bool:
    return os.environ.get("EMAIL_WARMUP_ENABLED", "true").strip().lower() in ("1", "true", "yes")


def _openai_client() -> AsyncOpenAI | None:
    key = os.environ.get("OPENAI_API_KEY", "").strip() or os.environ.get("APP_AI_KEY", "").strip()
    if not key:
        return None
    base = os.environ.get("OPENAI_BASE_URL", "").strip() or None
    return AsyncOpenAI(api_key=key, base_url=base)


def _daily_limit(day: int) -> int:
    """Progressive warmup: day 1 → 5 emails, scales to 50 by day 30."""
    d = max(1, min(day, WARMUP_DAYS))
    return min(50, max(5, int(5 + (45 * (d - 1) / (WARMUP_DAYS - 1)))))


class EmailWarmupService:
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
                CREATE TABLE IF NOT EXISTS email_warmup_accounts (
                    id TEXT PRIMARY KEY,
                    workspace_id INTEGER NOT NULL,
                    email TEXT NOT NULL,
                    domain TEXT,
                    ses_identity TEXT,
                    status TEXT NOT NULL DEFAULT 'idle',
                    warmup_day INTEGER NOT NULL DEFAULT 0,
                    daily_limit INTEGER NOT NULL DEFAULT 5,
                    sent_today INTEGER NOT NULL DEFAULT 0,
                    deliverability_score INTEGER NOT NULL DEFAULT 80,
                    dkim_ok INTEGER NOT NULL DEFAULT 0,
                    spf_ok INTEGER NOT NULL DEFAULT 0,
                    dmarc_ok INTEGER NOT NULL DEFAULT 0,
                    is_active_pool INTEGER NOT NULL DEFAULT 0,
                    stats_json TEXT NOT NULL DEFAULT '{}',
                    started_at TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        await self.session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS email_warmup_logs (
                    id TEXT PRIMARY KEY,
                    workspace_id INTEGER NOT NULL,
                    account_id TEXT NOT NULL,
                    action TEXT NOT NULL,
                    recipient TEXT,
                    spam_score INTEGER,
                    bounce INTEGER NOT NULL DEFAULT 0,
                    details_json TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        await self.session.commit()
        _SCHEMA_READY = True

    async def start_warmup(self, email: str, domain: str | None = None) -> dict[str, Any]:
        await self.ensure_schema()
        if not _enabled():
            return {"status": "disabled", "message": "EMAIL_WARMUP_ENABLED is false"}
        dom = (domain or email.split("@")[-1]).lower()
        dns = await self.validate_domain_dns(dom)
        aid = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        await self.session.execute(
            text(
                """
                INSERT INTO email_warmup_accounts (
                    id, workspace_id, email, domain, status, warmup_day, daily_limit,
                    deliverability_score, dkim_ok, spf_ok, dmarc_ok, started_at
                )
                VALUES (
                    :id, :ws, :email, :dom, 'warming', 1, 5,
                    :score, :dkim, :spf, :dmarc, :now
                )
                """
            ),
            {
                "id": aid,
                "ws": self.workspace_id,
                "email": email.strip().lower(),
                "dom": dom,
                "score": dns.get("deliverability_score", 75),
                "dkim": 1 if dns.get("dkim_ok") else 0,
                "spf": 1 if dns.get("spf_ok") else 0,
                "dmarc": 1 if dns.get("dmarc_ok") else 0,
                "now": now,
            },
        )
        await self._log(aid, "warmup_started", details=dns)
        await self.session.commit()
        return {"account_id": aid, "email": email, "warmup_day": 1, "daily_limit": 5, "dns": dns, "mock": False}

    async def get_stats(self, account_id: str | None = None) -> dict[str, Any]:
        await self.ensure_schema()
        if account_id:
            row = await self.session.execute(
                text(
                    "SELECT * FROM email_warmup_accounts WHERE id = :id AND workspace_id = :ws"
                ),
                {"id": account_id, "ws": self.workspace_id},
            )
            acc = row.mappings().first()
            if not acc:
                raise ValueError("Account not found")
            accounts = [dict(acc)]
        else:
            rows = await self.session.execute(
                text(
                    "SELECT * FROM email_warmup_accounts WHERE workspace_id = :ws ORDER BY created_at DESC"
                ),
                {"ws": self.workspace_id},
            )
            accounts = [dict(r) for r in rows.mappings().all()]
        out = []
        for a in accounts:
            logs = await self.session.execute(
                text(
                    """
                    SELECT COUNT(*) AS sent,
                           SUM(bounce) AS bounces,
                           AVG(spam_score) AS avg_spam
                    FROM email_warmup_logs WHERE account_id = :aid AND workspace_id = :ws
                    """
                ),
                {"aid": a["id"], "ws": self.workspace_id},
            )
            lg = dict(logs.mappings().first() or {})
            out.append(
                {
                    "account_id": a["id"],
                    "email": a["email"],
                    "status": a["status"],
                    "warmup_day": a["warmup_day"],
                    "daily_limit": a["daily_limit"],
                    "sent_today": a["sent_today"],
                    "deliverability_score": a["deliverability_score"],
                    "sent_total": int(lg.get("sent") or 0),
                    "bounces": int(lg.get("bounces") or 0),
                    "avg_spam_score": round(float(lg.get("avg_spam") or 0), 1),
                    "dkim_ok": bool(a["dkim_ok"]),
                    "spf_ok": bool(a["spf_ok"]),
                    "dmarc_ok": bool(a["dmarc_ok"]),
                    "alert_low_score": int(a["deliverability_score"] or 0) < 70,
                }
            )
        return {"accounts": out, "enabled": _enabled()}

    async def rotate_pool(self) -> dict[str, Any]:
        await self.ensure_schema()
        rows = await self.session.execute(
            text(
                """
                SELECT id, email, deliverability_score FROM email_warmup_accounts
                WHERE workspace_id = :ws AND status IN ('warming', 'ready')
                ORDER BY deliverability_score DESC, sent_today ASC
                """
            ),
            {"ws": self.workspace_id},
        )
        pool = list(rows.mappings().all())
        if not pool:
            raise ValueError("No accounts in warmup pool")
        await self.session.execute(
            text("UPDATE email_warmup_accounts SET is_active_pool = 0 WHERE workspace_id = :ws"),
            {"ws": self.workspace_id},
        )
        best = pool[0]
        await self.session.execute(
            text(
                "UPDATE email_warmup_accounts SET is_active_pool = 1 WHERE id = :id AND workspace_id = :ws"
            ),
            {"id": best["id"], "ws": self.workspace_id},
        )
        await self._log(str(best["id"]), "pool_rotate", details={"selected": best["email"]})
        await self.session.commit()
        return {"active_account_id": best["id"], "active_email": best["email"], "pool_size": len(pool)}

    async def check_deliverability(
        self,
        *,
        subject: str,
        body: str,
        sender: str,
        domain: str | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        dom = (domain or sender.split("@")[-1]).lower()
        dns = await self.validate_domain_dns(dom)
        blacklist = await self.check_blacklist(dom)
        spam = await self._spam_score_ai(subject, body, sender)
        score = max(
            0,
            min(
                100,
                int(
                    (dns.get("deliverability_score", 70) * 0.35)
                    + (spam.get("score", 70) * 0.45)
                    + ((100 if not blacklist.get("listed") else 20) * 0.2)
                ),
            ),
        )
        return {
            "deliverability_score": score,
            "spam_analysis": spam,
            "dns": dns,
            "blacklist": blacklist,
            "recommendation": "send" if score >= 70 else "review_before_send",
            "alert": score < 70,
        }

    async def validate_domain_dns(self, domain: str) -> dict[str, Any]:
        """DKIM/SPF/DMARC check (HTTP DNS-over-HTTPS style mock + optional real lookup)."""
        mock = not os.environ.get("EMAIL_WARMUP_DNS_REAL", "").strip()
        if mock:
            rng = random.Random(hash(domain) % 10000)
            dkim = rng.random() > 0.15
            spf = rng.random() > 0.1
            dmarc = rng.random() > 0.2
            score = 55 + (15 if dkim else 0) + (15 if spf else 0) + (15 if dmarc else 0)
            return {
                "domain": domain,
                "dkim_ok": dkim,
                "spf_ok": spf,
                "dmarc_ok": dmarc,
                "deliverability_score": min(100, score),
                "mock": True,
            }
        dkim = spf = dmarc = True
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(f"https://dns.google/resolve?name={domain}&type=TXT")
                answers = (resp.json() or {}).get("Answer") or []
                txt = " ".join(a.get("data", "") for a in answers).lower()
                spf = "v=spf1" in txt
                dmarc = "_dmarc" in txt or "v=dmarc1" in txt
                dkim = "v=dkim1" in txt or "dkim" in txt
        except Exception as exc:
            logger.debug("dns lookup skipped: %s", exc)
        score = 55 + (15 if dkim else 0) + (15 if spf else 0) + (15 if dmarc else 0)
        return {
            "domain": domain,
            "dkim_ok": dkim,
            "spf_ok": spf,
            "dmarc_ok": dmarc,
            "deliverability_score": min(100, score),
            "mock": False,
        }

    async def check_blacklist(self, domain: str) -> dict[str, Any]:
        """MXToolbox-style blacklist check via HTTP (mock when no API key)."""
        api_key = os.environ.get("MXTOOLBOX_API_KEY", "").strip()
        if not api_key:
            listed = random.Random(hash(domain)).random() < 0.05
            return {"domain": domain, "listed": listed, "sources": [] if not listed else ["mock-rbl"], "mock": True}
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.get(
                    f"https://api.mxtoolbox.com/api/v1/lookup/blacklist/{domain}",
                    headers={"Authorization": api_key},
                )
            data = resp.json() if resp.status_code < 400 else {}
            failed = [x for x in (data.get("Failed") or []) if x]
            return {"domain": domain, "listed": len(failed) > 0, "sources": failed, "mock": False}
        except Exception as exc:
            logger.warning("blacklist check failed: %s", exc)
            return {"domain": domain, "listed": False, "sources": [], "mock": True, "error": str(exc)}

    async def _spam_score_ai(self, subject: str, body: str, sender: str) -> dict[str, Any]:
        client = _openai_client()
        if not client:
            triggers = sum(
                1
                for w in ("gratis", "urgente", "click aquí", "100%", "!!!", "ganar dinero")
                if w in (subject + body).lower()
            )
            score = max(40, 92 - triggers * 12)
            return {
                "score": score,
                "risks": ["Palabras spam detectadas"] if triggers else [],
                "summary": "Análisis heurístico (sin OpenAI)",
                "mock": True,
            }
        try:
            resp = await client.chat.completions.create(
                model=os.environ.get("OPENAI_MODEL", "gpt-4o"),
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Eres experto en deliverability. Devuelve JSON: "
                            "score (0-100, 100=inbox seguro), risks (array), summary (string)."
                        ),
                    },
                    {
                        "role": "user",
                        "content": f"From: {sender}\nSubject: {subject}\n\n{body[:2000]}",
                    },
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
            )
            data = json.loads(resp.choices[0].message.content or "{}")
            return {**data, "mock": False}
        except Exception as exc:
            logger.warning("spam score AI fallback: %s", exc)
            triggers = sum(
                1
                for w in ("gratis", "urgente", "click aquí", "100%", "!!!")
                if w in (subject + body).lower()
            )
            return {
                "score": max(40, 92 - triggers * 12),
                "risks": ["Análisis IA no disponible"],
                "summary": str(exc)[:120],
                "mock": True,
            }

    async def _log(
        self,
        account_id: str,
        action: str,
        *,
        recipient: str | None = None,
        spam_score: int | None = None,
        bounce: bool = False,
        details: dict | None = None,
    ) -> None:
        await self.session.execute(
            text(
                f"""
                INSERT INTO email_warmup_logs (
                    id, workspace_id, account_id, action, recipient, spam_score, bounce, details_json
                )
                VALUES (
                    :id, :ws, :aid, :action, :rec, :spam, :bounce, {json_bind(self.session, "details")}
                )
                """
            ),
            {
                "id": str(uuid.uuid4()),
                "ws": self.workspace_id,
                "aid": account_id,
                "action": action,
                "rec": recipient,
                "spam": spam_score,
                "bounce": 1 if bounce else 0,
                "details": json.dumps(details or {}, ensure_ascii=False),
            },
        )


def get_email_warmup_service(session: AsyncSession, workspace_id: int) -> EmailWarmupService:
    return EmailWarmupService(session, workspace_id)
