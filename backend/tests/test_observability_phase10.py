"""
Fase 10 — verificación mínima de observabilidad en tests (sin asumir Prometheus en CI).

- /metrics en formato Prometheus (ya cubierto en parte por phase9; aquí se reafirma).
- Correlación tipo traza: X-Request-ID ida y vuelta (middleware real).
- “Simulación” de condición de alerta: misma lógica de ratio que phase9_alerts.yaml (ratio > 0.1).
- El YAML de alertas existe y referencia job_outcomes_total (contrato operativo documentado en repo).
"""
from pathlib import Path

import pytest
from httpx import AsyncClient


def test_phase9_alerts_yaml_declares_job_failure_alert():
    p = Path(__file__).resolve().parents[1] / "ops" / "alerts" / "phase9_alerts.yaml"
    text = p.read_text(encoding="utf-8")
    assert "NelvyonJobFailureRatioHigh" in text
    assert "job_outcomes_total" in text


def test_stub_simulate_job_failure_ratio_alert_fires_like_yaml():
    """Replica la desigualdad del expr PromQL en forma discreta (sin series temporales)."""

    def ratio_would_fire(failed: int, total: int) -> bool:
        if total <= 0:
            return False
        return (failed / total) > 0.1

    assert ratio_would_fire(2, 10) is True
    assert ratio_would_fire(1, 10) is False


@pytest.mark.asyncio
async def test_metrics_endpoint_scrapeable(client: AsyncClient, auth_headers: dict):
    await client.get("/api/v1/entities/contracts", headers=auth_headers, params={"limit": 1})
    r = await client.get("/metrics")
    assert r.status_code == 200
    body = r.text
    assert "# HELP http_requests_total" in body
    assert "# HELP job_outcomes_total" in body


@pytest.mark.asyncio
async def test_request_id_roundtrip_for_operational_correlation(client: AsyncClient, auth_headers: dict):
    rid = "aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee"
    h = {**auth_headers, "X-Request-ID": rid}
    r = await client.get("/api/v1/entities/contracts", headers=h, params={"limit": 1})
    assert r.headers.get("x-request-id") == rid
