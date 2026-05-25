"""Industry benchmarking — sector medians vs client metrics (Mailchimp / HubSpot 2025)."""

from __future__ import annotations

from typing import Any

INDUSTRY_BENCHMARKS: dict[str, dict[str, Any]] = {
    "restaurante": {
        "label": "Restaurante / Hostelería",
        "email_open_rate": 22.4,
        "email_ctr": 2.1,
        "conversion_rate": 3.2,
        "cac_eur": 38.0,
        "churn_rate": 8.5,
        "source": "Mailchimp 2025; HubSpot Food & Beverage",
    },
    "ecommerce": {
        "label": "E-commerce / Retail online",
        "email_open_rate": 19.8,
        "email_ctr": 2.8,
        "conversion_rate": 2.4,
        "cac_eur": 52.0,
        "churn_rate": 6.2,
        "source": "Mailchimp 2025; HubSpot Retail",
    },
    "inmobiliaria": {
        "label": "Inmobiliaria",
        "email_open_rate": 24.1,
        "email_ctr": 3.4,
        "conversion_rate": 1.8,
        "cac_eur": 145.0,
        "churn_rate": 5.1,
        "source": "HubSpot Real Estate 2025",
    },
    "clinica": {
        "label": "Clínica / Salud",
        "email_open_rate": 26.3,
        "email_ctr": 3.1,
        "conversion_rate": 4.5,
        "cac_eur": 68.0,
        "churn_rate": 4.2,
        "source": "Mailchimp Healthcare 2025",
    },
    "startup": {
        "label": "Startup / SaaS B2B",
        "email_open_rate": 21.5,
        "email_ctr": 3.9,
        "conversion_rate": 3.8,
        "cac_eur": 210.0,
        "churn_rate": 7.8,
        "source": "HubSpot SaaS Benchmark 2025",
    },
    "retail": {
        "label": "Retail físico",
        "email_open_rate": 20.6,
        "email_ctr": 2.5,
        "conversion_rate": 2.9,
        "cac_eur": 44.0,
        "churn_rate": 7.0,
        "source": "Mailchimp Retail 2025",
    },
    "consultoria": {
        "label": "Consultoría / Servicios profesionales",
        "email_open_rate": 23.7,
        "email_ctr": 4.2,
        "conversion_rate": 5.1,
        "cac_eur": 95.0,
        "churn_rate": 5.5,
        "source": "HubSpot Professional Services 2025",
    },
}

METRIC_KEYS = ("email_open_rate", "email_ctr", "conversion_rate", "cac_eur", "churn_rate")
LOWER_IS_BETTER = frozenset({"cac_eur", "churn_rate"})


def _normalize_sector(sector: str) -> str:
    key = (sector or "startup").strip().lower()
    aliases = {
        "restaurant": "restaurante",
        "hosteleria": "restaurante",
        "e-commerce": "ecommerce",
        "tienda": "retail",
        "salud": "clinica",
        "healthcare": "clinica",
        "saas": "startup",
        "consulting": "consultoria",
        "real_estate": "inmobiliaria",
    }
    return aliases.get(key, key if key in INDUSTRY_BENCHMARKS else "startup")


def _pct_diff(client: float, industry: float, *, lower_is_better: bool) -> float:
    if industry == 0:
        return 0.0
    raw = ((client - industry) / industry) * 100.0
    if lower_is_better:
        raw = -raw
    return round(raw, 1)


class BenchmarkingService:
    @staticmethod
    def list_sectors() -> list[dict[str, str]]:
        return [{"id": k, "label": v["label"]} for k, v in INDUSTRY_BENCHMARKS.items()]

    @staticmethod
    def get_industry_benchmarks(sector: str) -> dict[str, Any]:
        key = _normalize_sector(sector)
        bench = INDUSTRY_BENCHMARKS[key]
        return {
            "sector": key,
            "label": bench["label"],
            "metrics": {m: bench[m] for m in METRIC_KEYS},
            "source": bench["source"],
        }

    @staticmethod
    def compare_client_vs_industry(
        user_id: str,
        metrics: dict[str, float],
        *,
        sector: str = "startup",
    ) -> dict[str, Any]:
        key = _normalize_sector(sector)
        bench = INDUSTRY_BENCHMARKS[key]
        comparisons: list[dict[str, Any]] = []
        better_count = 0
        worse_count = 0
        for mk in METRIC_KEYS:
            client_val = float(metrics.get(mk, 0) or 0)
            industry_val = float(bench[mk])
            lower_better = mk in LOWER_IS_BETTER
            diff_pct = _pct_diff(client_val, industry_val, lower_is_better=lower_better)
            verdict = "better" if diff_pct >= 0 else "worse"
            if verdict == "better":
                better_count += 1
            else:
                worse_count += 1
            comparisons.append(
                {
                    "metric": mk,
                    "client_value": round(client_val, 2),
                    "industry_average": industry_val,
                    "diff_percent": diff_pct,
                    "verdict": verdict,
                    "lower_is_better": lower_better,
                }
            )
        return {
            "user_id": user_id,
            "sector": key,
            "sector_label": bench["label"],
            "source": bench["source"],
            "comparisons": comparisons,
            "summary": {
                "metrics_better_than_industry": better_count,
                "metrics_worse_than_industry": worse_count,
                "overall": "above_average" if better_count >= worse_count else "below_average",
            },
        }


def get_benchmarking_service() -> BenchmarkingService:
    return BenchmarkingService()
