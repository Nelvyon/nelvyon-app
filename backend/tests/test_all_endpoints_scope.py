"""
Los endpoints `/all` tienen que estar acotados o ser de plataforma.

HALLAZGO de la auditoria desde cero (bloque 46). Ningun barrido anterior los
miro: el de aislamiento por id solo cubria rutas con `{...}`, y estas no lo
llevan.

De 28 endpoints `/all`, diez ya exigian autoridad de plataforma. Ocho tenian
`get_db` como UNICA dependencia y no filtraban por nada — el comentario original
lo decia sin rodeos: "without user limitation". Cualquier usuario autenticado
recibia filas de todos los inquilinos.

Los diez restantes llevan `require_workspace*` y SI pasan `workspace_id` al
servicio pese al nombre `/all`: estan acotados al workspace del llamante y no
son defecto.
"""
from __future__ import annotations

import ast
import os
import sys
from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
from tests.test_workspace_mutation_authz_guard import _dependencias  # noqa: E402

AUTORIDAD_DE_PLATAFORMA = {"get_super_admin_user", "require_super_admin", "get_admin_user"}


def _endpoints_all():
    for f in sorted((RAIZ / "routers").rglob("*.py")):
        if "__pycache__" in str(f):
            continue
        try:
            arbol = ast.parse(f.read_text(encoding="utf-8"))
        except SyntaxError:  # pragma: no cover
            pytest.fail(f"{f.name} no parsea")
        rel = str(f.relative_to(RAIZ)).replace(os.sep, "/")
        for n in ast.walk(arbol):
            if not isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            if not n.name.endswith("_all"):
                continue
            # Solo endpoints: un helper privado como `_fetch_all` no esta
            # enrutado y no tiene dependencias que analizar.
            es_endpoint = any(
                isinstance((d.func if isinstance(d, ast.Call) else d), ast.Attribute)
                and (d.func if isinstance(d, ast.Call) else d).attr.lower()
                in ("get", "post", "put", "patch", "delete")
                for d in n.decorator_list
            )
            if not es_endpoint:
                continue
            yield rel, n.name, _dependencias(n), ast.unparse(n)


def test_el_barrido_encuentra_endpoints_all():
    """Sin esto, un barrido roto daria cero hallazgos y pareceria limpio."""
    hallados = list(_endpoints_all())
    assert len(hallados) > 20, f"solo {len(hallados)} endpoints /all"


@pytest.mark.parametrize(
    "fichero,funcion,deps,cuerpo",
    [pytest.param(f, fn, d, c, id=f"{f}::{fn}") for f, fn, d, c in _endpoints_all()],
)
def test_todo_endpoint_all_esta_acotado_o_es_de_plataforma(fichero, funcion, deps, cuerpo):
    """
    Dos formas validas, y ninguna mas:

      * acota por workspace y lo PASA al servicio (no basta con depender de
        `require_workspace` y luego consultar sin filtro);
      * o es una vista de todos los inquilinos, y entonces exige plataforma.
    """
    if AUTORIDAD_DE_PLATAFORMA & deps:
        return
    acotado = "workspace_id" in cuerpo or "user_id" in cuerpo
    assert acotado, (
        f"{fichero}::{funcion} devuelve filas sin filtrar por workspace y sin "
        f"autoridad de plataforma. Dependencias: {sorted(deps)}"
    )


def test_los_que_dependen_solo_de_la_base_ya_no_existen():
    """El caso exacto del hallazgo: `get_db` como unica dependencia."""
    culpables = [
        f"{f}::{fn}" for f, fn, d, _ in _endpoints_all() if d == {"get_db"}
    ]
    assert culpables == [], f"endpoints /all sin ninguna autoridad: {culpables}"


def test_ningun_endpoint_de_escritura_queda_publico_sin_verificar():
    """Barrido final: POST/PUT/PATCH/DELETE publicos que escriben en la base.

    Encontro `system_health.track_metric`: publico, sin autenticar, insertaba
    una fila por llamada en `platform_metrics` y aceptaba el `user_id` como
    parametro. Es decir, llenar la tabla sin limite y fabricar metricas a nombre
    de cualquiera. No lo llamaba nadie: superficie regalada.

    Los webhooks entrantes quedan fuera porque su autenticidad no es una sesion
    sino la firma del proveedor; los cubre
    `test_inbound_webhooks_fail_closed.py`.
    """
    import ast
    from pathlib import Path

    raiz = Path(__file__).resolve().parent.parent / "routers"
    AUTORIDAD = (
        "get_current_user", "require_workspace", "get_super_admin", "get_admin_user",
        "require_public_scope", "api_key", "require_platform",
    )
    VERIFICACION = ("verificar_", "construct", "webhook_key", "verify_", "signature")

    desprotegidos = []
    for fichero in sorted(raiz.rglob("*.py")):
        try:
            arbol = ast.parse(fichero.read_text(encoding="utf-8"))
        except SyntaxError:
            continue
        for nodo in ast.walk(arbol):
            if not isinstance(nodo, (ast.AsyncFunctionDef, ast.FunctionDef)):
                continue
            metodos = [
                d.func.attr for d in nodo.decorator_list
                if isinstance(d, ast.Call) and isinstance(d.func, ast.Attribute)
            ]
            if not any(m in ("post", "put", "patch", "delete") for m in metodos):
                continue
            argumentos = ast.unparse(nodo.args)
            if any(a in argumentos for a in AUTORIDAD):
                continue
            cuerpo = ast.unparse(nodo)
            escribe = any(
                k in cuerpo for k in ("INSERT INTO", "UPDATE ", "db.add(", "DELETE FROM")
            )
            if escribe and not any(v in cuerpo for v in VERIFICACION):
                desprotegidos.append(f"{fichero.name}::{nodo.name}")

    assert not desprotegidos, (
        "endpoints publicos que escriben sin establecer autoridad ni "
        "autenticidad:\n  " + "\n  ".join(desprotegidos)
    )
