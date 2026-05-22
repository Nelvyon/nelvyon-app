"""
NELVYON multi-currency — conversion and locale-aware formatting.
"""

from __future__ import annotations

import logging
import os
import time
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

import httpx

from core.i18n import normalize_language

logger = logging.getLogger(__name__)

SUPPORTED_CURRENCIES = frozenset(
    {"USD", "EUR", "GBP", "BRL", "MXN", "ARS", "COP", "JPY", "CAD", "AUD"}
)

# Hardcoded rates vs USD (base). Update periodically or via Open Exchange Rates API.
DEFAULT_RATES_USD: dict[str, Decimal] = {
    "USD": Decimal("1"),
    "EUR": Decimal("0.92"),
    "GBP": Decimal("0.79"),
    "BRL": Decimal("5.05"),
    "MXN": Decimal("17.15"),
    "ARS": Decimal("875.0"),
    "COP": Decimal("3950.0"),
    "JPY": Decimal("156.0"),
    "CAD": Decimal("1.36"),
    "AUD": Decimal("1.52"),
}

_rates_cache: dict[str, Decimal] = dict(DEFAULT_RATES_USD)
_rates_fetched_at: float = 0.0
_RATES_TTL_SECONDS = 3600


def _normalize_currency(code: str) -> str:
    c = (code or "USD").strip().upper()
    if c not in SUPPORTED_CURRENCIES:
        raise ValueError(f"Unsupported currency: {code}")
    return c


async def refresh_rates_from_api(force: bool = False) -> dict[str, Decimal]:
    """Fetch latest USD-base rates from Open Exchange Rates when API key is set."""
    global _rates_cache, _rates_fetched_at

    api_key = (os.environ.get("OPENEXCHANGE_API_KEY") or "").strip()
    if not api_key:
        return dict(_rates_cache)

    now = time.time()
    if not force and _rates_fetched_at and (now - _rates_fetched_at) < _RATES_TTL_SECONDS:
        return dict(_rates_cache)

    url = f"https://openexchangerates.org/api/latest.json?app_id={api_key}&base=USD"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            payload = resp.json()
        rates_raw: dict[str, Any] = payload.get("rates") or {}
        updated: dict[str, Decimal] = {"USD": Decimal("1")}
        for code in SUPPORTED_CURRENCIES:
            if code == "USD":
                continue
            val = rates_raw.get(code)
            if val is not None:
                updated[code] = Decimal(str(val))
            elif code in _rates_cache:
                updated[code] = _rates_cache[code]
            elif code in DEFAULT_RATES_USD:
                updated[code] = DEFAULT_RATES_USD[code]
        _rates_cache = updated
        _rates_fetched_at = now
        logger.info("Open Exchange Rates refreshed (%d currencies)", len(updated))
    except Exception as exc:
        logger.warning("Open Exchange Rates fetch failed, using cached/fixed rates: %s", exc)
    return dict(_rates_cache)


def get_rates() -> dict[str, Decimal]:
    """Return current in-memory rates (fixed or last API refresh)."""
    return dict(_rates_cache)


async def convert_amount(
    amount: float | Decimal,
    from_currency: str,
    to_currency: str,
) -> Decimal:
    """Convert amount between supported currencies using USD as pivot."""
    src = _normalize_currency(from_currency)
    dst = _normalize_currency(to_currency)
    value = Decimal(str(amount))
    if src == dst:
        return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    await refresh_rates_from_api()
    rates = get_rates()
    usd_amount = value / rates[src] if src != "USD" else value
    converted = usd_amount * rates[dst] if dst != "USD" else usd_amount
    if dst == "JPY":
        return converted.quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return converted.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _locale_separators(language: str | None) -> tuple[str, str]:
    lang = normalize_language(language)
    if lang in ("en",):
        return ",", "."
    return ".", ","


def format_amount(
    amount: float | Decimal,
    currency: str,
    language: str | None = None,
) -> str:
    """Format monetary amount according to currency and language locale."""
    code = _normalize_currency(currency)
    value = Decimal(str(amount))
    if code == "JPY":
        value = value.quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        decimals = 0
    else:
        value = value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        decimals = 2

    thousand_sep, decimal_sep = _locale_separators(language)
    sign = "-" if value < 0 else ""
    abs_val = abs(value)
    int_part = int(abs_val)
    frac_part = abs_val - Decimal(int_part)

    int_str = f"{int_part:,}".replace(",", "X").replace(".", thousand_sep).replace("X", thousand_sep)
    if decimals == 0:
        number = int_str
    else:
        frac_str = str(int((frac_part * (10**decimals)).quantize(Decimal("1")))).zfill(decimals)
        number = f"{int_str}{decimal_sep}{frac_str}"

    symbols = {
        "USD": "$",
        "EUR": "€",
        "GBP": "£",
        "BRL": "R$",
        "MXN": "MX$",
        "ARS": "AR$",
        "COP": "COL$",
        "JPY": "¥",
        "CAD": "CA$",
        "AUD": "A$",
    }
    sym = symbols.get(code, code)
    lang = normalize_language(language)

    if code == "EUR" and lang in ("es", "de", "fr", "it", "pt", "nl"):
        return f"{sign}{number} {sym}".strip()
    return f"{sign}{sym}{number}"
