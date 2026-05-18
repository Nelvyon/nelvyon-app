"""
PR H2-4 — Hardening de observabilidad en dashboards.

Verifica:
- shape aditiva (data_status, partial_errors),
- señalización correcta de fallo parcial,
- ausencia de except silenciosos en KPI críticos.
"""
import inspect
from datetime import datetime, timezone

import pytest
from httpx import AsyncClient

from dependencies.workspace import WorkspaceContext
from models.sales_records import Sales_records
from routers.dashboard_metrics import get_dashboard_metrics
from routers.global_dashboard import get_global_dashboard


class _DummyResult:
    def __init__(self, scalar_value=0, first_row=None, all_rows=None):
        self._scalar_value = scalar_value
        self._first_row = first_row
        self._all_rows = all_rows or []

    def scalar(self):
        return self._scalar_value

    def mappings(self):
        return self

    def first(self):
        return self._first_row

    def all(self):
        return self._all_rows

    def fetchall(self):
        return self._all_rows


class _FakeMetricsDB:
    """Fuerza error solo en queries sobre deals para validar data_status=partial."""

    async def execute(self, statement, *args, **kwargs):
        sql = str(statement).lower()
        if "deals" in sql:
            raise RuntimeError("forced deals query failure")
        return _DummyResult(scalar_value=0)


class _FakeGlobalDB:
    """Fuerza error en revenue y devuelve ceros válidos para otros bloques."""

    async def execute(self, statement, *args, **kwargs):
        sql = str(statement).lower()
        if "from sales_records" in sql:
            raise RuntimeError("forced revenue query failure")
        if "from subscriptions" in sql:
            return _DummyResult(first_row={"mrr": 0})
        if "from deals d" in sql:
            return _DummyResult(all_rows=[])
        if "from deals" in sql:
            return _DummyResult(first_row={"total": 0, "open_count": 0, "won_count": 0, "lost_count": 0, "pipeline_val": 0})
        if "from helpdesk_tickets" in sql:
            return _DummyResult(first_row={"total": 0, "open_count": 0, "resolved_count": 0})
        if "from campaigns" in sql:
            return _DummyResult(first_row={"total": 0, "active_count": 0, "total_recipients": 0, "total_sent": 0, "total_open": 0, "total_click": 0})
        if "from contracts" in sql:
            return _DummyResult(first_row={"total": 0, "active_count": 0})
        if "from contacts" in sql:
            return _DummyResult(first_row={"c": 0})
        if "from activities" in sql:
            return _DummyResult(all_rows=[])
        return _DummyResult(first_row={})


@pytest.mark.asyncio
async def test_dashboard_metrics_shape_includes_status_and_partial_errors(
    client: AsyncClient, auth_headers: dict
):
    r = await client.get("/api/v1/dashboard/metrics", headers=auth_headers)
    assert r.status_code == 200
    payload = r.json()
    assert payload.get("data_status") in {"ok", "partial", "error"}
    assert isinstance(payload.get("partial_errors"), list)
    assert payload.get("sales_scope_policy") == "workspace_strict_excludes_null_workspace_id"
    assert isinstance(payload.get("orphan_sales_records_count"), int)


@pytest.mark.asyncio
async def test_global_dashboard_shape_includes_status_and_partial_errors(
    client: AsyncClient, auth_headers: dict
):
    r = await client.get("/api/v1/global-dashboard/overview", headers=auth_headers)
    assert r.status_code == 200
    payload = r.json()
    assert payload.get("data_status") in {"ok", "partial", "error"}
    assert isinstance(payload.get("partial_errors"), list)
    assert payload.get("sales_scope_policy") == "workspace_strict_excludes_null_workspace_id"
    assert isinstance(payload.get("orphan_sales_records_count"), int)
    assert payload.get("contracts_value_computable") is False
    assert "no disponible en Fase 2" in str(payload.get("contracts_value_note", ""))


@pytest.mark.asyncio
async def test_modules_summary_social_scope_is_explicit_cross_workspace(
    client: AsyncClient, auth_headers: dict
):
    r = await client.get("/api/v1/global-dashboard/modules-summary", headers=auth_headers)
    assert r.status_code == 200
    modules = r.json()
    social = next((m for m in modules if m.get("module") == "social"), None)
    assert social is not None
    assert social.get("scope") == "user_cross_workspace"
    assert social.get("scope_note") == "Actividad social personal (todas tus marcas)"


@pytest.mark.asyncio
async def test_dashboard_metrics_reports_partial_on_controlled_failure():
    ws_ctx = WorkspaceContext(workspace_id=1, user_id="test-user")
    payload = await get_dashboard_metrics(period="30d", ws_ctx=ws_ctx, db=_FakeMetricsDB())
    assert payload["data_status"] == "partial"
    assert any(e.get("module") == "deals" for e in payload["partial_errors"])


@pytest.mark.asyncio
async def test_global_dashboard_reports_partial_on_controlled_failure():
    ws_ctx = WorkspaceContext(workspace_id=1, user_id="test-user")
    payload = await get_global_dashboard(period="30d", ws_ctx=ws_ctx, db=_FakeGlobalDB())
    # FastAPI normalmente serializa este modelo; aquí se devuelve directamente la instancia pydantic.
    if hasattr(payload, "model_dump"):
        payload = payload.model_dump()
    assert payload["data_status"] == "partial"
    assert any(e.get("module") == "revenue" for e in payload["partial_errors"])


def test_no_except_pass_in_kpi_critical_dashboard_routers():
    import routers.dashboard_metrics as dm
    import routers.global_dashboard as gd

    src_dm = inspect.getsource(dm)
    src_gd = inspect.getsource(gd)
    assert "except Exception:\n        pass" not in src_dm
    assert "except Exception:\n            pass" not in src_dm
    assert "except Exception:\n        pass" not in src_gd
    assert "except Exception:\n            pass" not in src_gd


@pytest.mark.asyncio
async def test_sales_orphans_visible_and_excluded_from_workspace_revenue(
    client: AsyncClient, auth_headers: dict, db_session
):
    # Baseline
    before_m = await client.get("/api/v1/dashboard/metrics", headers=auth_headers)
    before_g = await client.get("/api/v1/global-dashboard/overview", headers=auth_headers)
    assert before_m.status_code == 200 and before_g.status_code == 200
    before_mj = before_m.json()
    before_gj = before_g.json()

    base_sales_total = float(before_mj["kpis"]["sales"]["total_amount"])
    base_revenue_total = float(before_gj["revenue"]["total_revenue"])
    base_orphans = int(before_mj.get("orphan_sales_records_count", 0))

    # Insert 1 orphan (workspace_id NULL) + 1 valid ws record
    now = datetime.now(timezone.utc)
    db_session.add(
        Sales_records(
            user_id="test-user-00000000-0000-0000-0000-000000000001",
            workspace_id=None,
            client_name="Orphan Sale",
            amount=111.0,
            status="paid",
            created_at=now,
        )
    )
    db_session.add(
        Sales_records(
            user_id="test-user-00000000-0000-0000-0000-000000000001",
            workspace_id=1,
            client_name="Tenant Sale",
            amount=222.0,
            status="paid",
            created_at=now,
        )
    )
    await db_session.commit()

    after_m = await client.get("/api/v1/dashboard/metrics", headers=auth_headers)
    after_g = await client.get("/api/v1/global-dashboard/overview", headers=auth_headers)
    assert after_m.status_code == 200 and after_g.status_code == 200
    after_mj = after_m.json()
    after_gj = after_g.json()

    # Only workspace record must affect financial KPI totals.
    assert float(after_mj["kpis"]["sales"]["total_amount"]) == pytest.approx(base_sales_total + 222.0, rel=1e-6)
    assert float(after_gj["revenue"]["total_revenue"]) == pytest.approx(base_revenue_total + 222.0, rel=1e-6)
    # Orphan remains excluded from revenue but visible as metadata.
    assert int(after_mj["orphan_sales_records_count"]) >= base_orphans + 1
    assert int(after_gj["orphan_sales_records_count"]) >= base_orphans + 1
    assert after_mj["sales_scope_policy"] == "workspace_strict_excludes_null_workspace_id"
    assert after_gj["sales_scope_policy"] == "workspace_strict_excludes_null_workspace_id"
