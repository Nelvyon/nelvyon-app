"""
NELVYON multi-region — optimal region routing and regional configuration.
"""

from __future__ import annotations

import ipaddress
import logging
import os
import re
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)

REGION_IDS = frozenset({"eu-west", "us-east", "us-west", "ap-southeast", "sa-east"})
DEFAULT_REGION = "eu-west"

# Railway / cloud region slug → NELVYON region id
_RAILWAY_REGION_MAP: dict[str, str] = {
    "europe-west4": "eu-west",
    "europe-west1": "eu-west",
    "europe-west2": "eu-west",
    "europe-west3": "eu-west",
    "europe-north1": "eu-west",
    "us-east4": "us-east",
    "us-east1": "us-east",
    "us-east5": "us-east",
    "us-west1": "us-west",
    "us-west2": "us-west",
    "us-west3": "us-west",
    "us-west4": "us-west",
    "us-central1": "us-east",
    "asia-southeast1": "ap-southeast",
    "asia-southeast2": "ap-southeast",
    "asia-east1": "ap-southeast",
    "asia-east2": "ap-southeast",
    "asia-northeast1": "ap-southeast",
    "australia-southeast1": "ap-southeast",
    "southamerica-east1": "sa-east",
    "southamerica-west1": "sa-east",
}


def _normalize_railway_region(raw: str) -> str:
    slug = raw.strip().lower().replace("_", "-")
    if slug in REGION_IDS:
        return slug
    if slug in _RAILWAY_REGION_MAP:
        return _RAILWAY_REGION_MAP[slug]
    for prefix, region in (
        ("europe", "eu-west"),
        ("us-east", "us-east"),
        ("us-west", "us-west"),
        ("asia", "ap-southeast"),
        ("southamerica", "sa-east"),
    ):
        if slug.startswith(prefix):
            return region
    return DEFAULT_REGION


def detect_current_region() -> str:
    """Resolve deployment region from RAILWAY_REGION or NELVYON_REGION."""
    raw = (
        os.environ.get("RAILWAY_REGION")
        or os.environ.get("NELVYON_REGION")
        or os.environ.get("AWS_REGION")
        or ""
    ).strip()
    if not raw:
        return DEFAULT_REGION
    return _normalize_railway_region(raw)


CURRENT_REGION = detect_current_region()


@dataclass(frozen=True)
class RegionConfig:
    """Regional deployment metadata."""

    id: str
    label: str
    api_base: str
    expected_latency_ms: int
    services: tuple[str, ...] = field(default_factory=tuple)
    status: str = "active"


REGION_CONFIGS: dict[str, RegionConfig] = {
    "eu-west": RegionConfig(
        id="eu-west",
        label="Europe West",
        api_base=os.environ.get("NELVYON_API_EU_WEST", "https://api-eu.nelvyon.com"),
        expected_latency_ms=45,
        services=("database", "redis", "openai", "ses", "supabase", "storage"),
    ),
    "us-east": RegionConfig(
        id="us-east",
        label="US East",
        api_base=os.environ.get("NELVYON_API_US_EAST", "https://api-us-east.nelvyon.com"),
        expected_latency_ms=35,
        services=("database", "redis", "openai", "ses", "supabase", "storage"),
    ),
    "us-west": RegionConfig(
        id="us-west",
        label="US West",
        api_base=os.environ.get("NELVYON_API_US_WEST", "https://api-us-west.nelvyon.com"),
        expected_latency_ms=40,
        services=("database", "redis", "openai", "ses", "supabase", "storage"),
    ),
    "ap-southeast": RegionConfig(
        id="ap-southeast",
        label="Asia Pacific",
        api_base=os.environ.get("NELVYON_API_AP_SE", "https://api-ap.nelvyon.com"),
        expected_latency_ms=55,
        services=("database", "redis", "openai", "ses", "supabase"),
    ),
    "sa-east": RegionConfig(
        id="sa-east",
        label="South America",
        api_base=os.environ.get("NELVYON_API_SA_EAST", "https://api-sa.nelvyon.com"),
        expected_latency_ms=50,
        services=("database", "redis", "openai", "ses", "supabase"),
    ),
}


# ISO 3166-1 alpha-2 → NELVYON region
_COUNTRY_TO_REGION: dict[str, str] = {
    # Europe
    "ES": "eu-west", "FR": "eu-west", "DE": "eu-west", "IT": "eu-west", "PT": "eu-west",
    "NL": "eu-west", "BE": "eu-west", "IE": "eu-west", "GB": "eu-west", "SE": "eu-west",
    "NO": "eu-west", "DK": "eu-west", "FI": "eu-west", "PL": "eu-west", "CH": "eu-west",
    "AT": "eu-west", "GR": "eu-west", "CZ": "eu-west", "RO": "eu-west", "HU": "eu-west",
    # US / Canada
    "US": "us-east", "CA": "us-east",
    # US West bias (optional finer routing)
    "MX": "us-west",
    # Latin America
    "BR": "sa-east", "AR": "sa-east", "CL": "sa-east", "CO": "sa-east", "PE": "sa-east",
    "UY": "sa-east", "PY": "sa-east", "BO": "sa-east", "EC": "sa-east", "VE": "sa-east",
    # Asia Pacific
    "CN": "ap-southeast", "JP": "ap-southeast", "KR": "ap-southeast", "SG": "ap-southeast",
    "IN": "ap-southeast", "AU": "ap-southeast", "NZ": "ap-southeast", "TH": "ap-southeast",
    "VN": "ap-southeast", "ID": "ap-southeast", "MY": "ap-southeast", "PH": "ap-southeast",
    "HK": "ap-southeast", "TW": "ap-southeast",
}


def _is_private_ip(ip_str: str) -> bool:
    try:
        ip = ipaddress.ip_address(ip_str.strip())
        return ip.is_private or ip.is_loopback or ip.is_link_local
    except ValueError:
        return True


def _lookup_country_ip2region(ip: str) -> str | None:
    """Optional ip2region lookup if xdb file and package are available."""
    db_path = (os.environ.get("IP2REGION_DB") or "").strip()
    if not db_path or not os.path.isfile(db_path):
        return None
    try:
        from ip2region import Ip2Region  # type: ignore[import-untyped]

        searcher = Ip2Region(db_path)
        result = searcher.search(ip)
        if not result:
            return None
        # Format: country|region|city|isp
        parts = str(result).split("|")
        country = parts[0] if parts else ""
        if country and country != "0":
            return country.upper() if len(country) == 2 else country
    except ImportError:
        logger.debug("ip2region package not installed")
    except Exception as exc:
        logger.debug("ip2region lookup failed: %s", exc)
    return None


def _lookup_country_geoip2(ip: str) -> str | None:
    """Optional MaxMind GeoIP2 lookup."""
    db_path = (os.environ.get("GEOIP_DB") or os.environ.get("GEOIP_COUNTRY_DB") or "").strip()
    if not db_path or not os.path.isfile(db_path):
        return None
    try:
        import geoip2.database  # type: ignore[import-untyped]

        with geoip2.database.Reader(db_path) as reader:
            resp = reader.country(ip)
            return resp.country.iso_code
    except ImportError:
        logger.debug("geoip2 package not installed")
    except Exception as exc:
        logger.debug("geoip2 lookup failed: %s", exc)
    return None


def _lookup_country_heuristic(ip: str) -> str | None:
    """Lightweight fallback using common public range hints (non-authoritative)."""
    try:
        addr = ipaddress.ip_address(ip.strip())
        octets = str(addr).split(".")
        if len(octets) != 4:
            return None
        first = int(octets[0])
        if 1 <= first <= 14:
            return "US"
        if 80 <= first <= 95:
            return "EU"
        if 110 <= first <= 125:
            return "CN"
        if 180 <= first <= 183:
            return "JP"
        if 200 <= first <= 201:
            return "BR"
    except (ValueError, IndexError):
        pass
    return None


def resolve_country_code(user_ip: str | None) -> str | None:
    """Resolve ISO country code from IP using ip2region, GeoIP, or heuristics."""
    if not user_ip or user_ip in ("unknown", "127.0.0.1", "::1"):
        return None
    ip = user_ip.split(",")[0].strip()
    if _is_private_ip(ip):
        return None
    for lookup in (_lookup_country_ip2region, _lookup_country_geoip2, _lookup_country_heuristic):
        country = lookup(ip)
        if country:
            code = country.upper()[:2]
            if re.match(r"^[A-Z]{2}$", code):
                return code
    return None


def get_optimal_region(user_ip: str | None) -> str:
    """
    Detect optimal NELVYON region for a user IP.
    Falls back to CURRENT_REGION for private/unknown IPs.
    """
    if not user_ip or _is_private_ip(user_ip.split(",")[0].strip()):
        return CURRENT_REGION
    country = resolve_country_code(user_ip)
    if country and country in _COUNTRY_TO_REGION:
        return _COUNTRY_TO_REGION[country]
    return CURRENT_REGION


def get_region_config(region_id: str | None = None) -> RegionConfig:
    rid = region_id if region_id in REGION_CONFIGS else CURRENT_REGION
    return REGION_CONFIGS.get(rid, REGION_CONFIGS[DEFAULT_REGION])


def list_regions() -> list[dict[str, Any]]:
    """Serialize all region configs for monitoring API."""
    return [
        {
            "id": cfg.id,
            "label": cfg.label,
            "api_base": cfg.api_base,
            "expected_latency_ms": cfg.expected_latency_ms,
            "services": list(cfg.services),
            "status": cfg.status,
            "current": cfg.id == CURRENT_REGION,
        }
        for cfg in REGION_CONFIGS.values()
    ]
