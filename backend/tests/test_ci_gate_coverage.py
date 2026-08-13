"""
El gate de PR tiene que ejecutar lo que sostiene las certificaciones.

HALLAZGO: `ci-minimal.yml` —el unico workflow que corre en TODO pull request—
ejecutaba `lint` y `test:fast`, que son 9 ficheros de test. Los guards
estructurales de los bloques de cierre viven en el resto de la suite, asi que
un PR podia revertir cualquiera de esas propiedades sin que nada lo notase.

Los demas workflows no cubrian el hueco: `security-gates` solo corre si cambia
`package.json` o el lockfile, `playwright-saas` solo bajo `apps/web/src/app/saas`,
y `os-gate` / `os-saas-100-gate` solo en push a main.

Este test vigila el gate desde dentro de la suite que el gate ejecuta, que es la
unica forma de que no se pueda quitar en silencio.
"""
from __future__ import annotations

from pathlib import Path

import pytest

WORKFLOW = Path(__file__).resolve().parent.parent.parent / ".github" / "workflows" / "ci-minimal.yml"


def _contenido() -> str:
    assert WORKFLOW.is_file(), f"falta el workflow del gate: {WORKFLOW}"
    return WORKFLOW.read_text(encoding="utf-8")


def test_el_gate_corre_en_todo_pull_request():
    """Un gate con filtro de rutas deja pasar lo que no encaje en el filtro."""
    src = _contenido()
    i = src.index("on:")
    cabecera = src[i : src.index("jobs:")]
    assert "pull_request:" in cabecera
    assert "paths:" not in cabecera, "el gate principal no puede filtrar por rutas"


def test_el_gate_ejecuta_la_suite_completa_del_backend():
    """Ahi viven los guards de autoridad, tenencia, auditoria y drift."""
    src = _contenido()
    assert "pytest tests/" in src, "el gate no ejecuta la suite completa"


def test_el_gate_ejecuta_typecheck_y_tests_del_frontend():
    src = _contenido()
    assert "tsc --noEmit" in src
    assert "vitest run" in src


def test_los_guards_de_certificacion_existen_y_estan_en_la_suite():
    """
    Contraprueba: exigir que el gate corra la suite no sirve si los guards no
    estan en ella. Se comprueba que los ficheros existen.
    """
    tests = Path(__file__).resolve().parent
    imprescindibles = [
        "test_workspace_mutation_authz_guard.py",
        "test_messaging_provider_tenancy.py",
        "test_audit_event_loss_policy.py",
        "test_file_handling_security.py",
        "test_log_secret_hygiene.py",
        "test_pagination_bounds.py",
        "test_production_fail_fast.py",
        "test_sqlite_only_sql_guard.py",
        "test_cross_tenant_id_addressing.py",
    ]
    faltan = [g for g in imprescindibles if not (tests / g).is_file()]
    assert faltan == [], f"guards ausentes de la suite: {faltan}"
