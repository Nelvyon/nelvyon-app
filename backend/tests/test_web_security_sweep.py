"""
Barrido de seguridad web: lo que no cubrian los bloques anteriores.

Dos hallazgos y varias verificaciones.

1. **Open redirect con esquema libre.** `GET /api/campaigns/{id}/click?url=...`
   es publico, sin auth (es el clic de un correo) y redirigia a lo que dijera el
   parametro, incluidos `javascript:`, `data:` y `file:`. Con el dominio de
   NELVYON delante, eso convierte el tracking en un vector de ejecucion.

   Redirigir a un http(s) cualquiera es INHERENTE al tracking —el cliente pone
   el enlace que quiere en su campana—, asi que eso no se toca. Se corta lo que
   ningun correo legitimo necesita.

2. **Identificadores SQL sin acotar en un helper.** `_count_in_workspace`
   validaba `table` pero no `field`. Hoy todos los llamantes pasan literales, asi
   que no era explotable; pero la seguridad no deberia depender de que el
   proximo llamante se acuerde.

Verificado y correcto, anotado para no repetirlo: de 113 f-strings dentro de
`text()`, solo 5 interpolan un argumento de funcion, y los 5 estaban ya tras una
lista blanca. El resto interpola helpers de dialecto (`json_bind`, `uuid_bind`)
o nombres de columna filtrados por allowlist, con los valores como parametros
ligados. `aihub` usa `ast.literal_eval`, no `eval`.
"""
from __future__ import annotations

import ast
import os
from pathlib import Path

import pytest
from httpx import AsyncClient

RAIZ = Path(__file__).resolve().parent.parent


# ─────────────────────────────────────────── 1. redirect de tracking

@pytest.mark.asyncio
@pytest.mark.parametrize("peligroso", [
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "file:///etc/passwd",
    "vbscript:msgbox(1)",
    "JaVaScRiPt:alert(1)",
])
async def test_el_tracking_no_redirige_a_un_esquema_peligroso(
    client: AsyncClient, auth_headers: dict, peligroso
):
    # El endpoint se documenta como "no auth" pero un middleware exige cabecera
    # de tenant, lo que reduce la exposicion: no es un redirect abierto anonimo.
    r = await client.get(
        "/api/campaigns/track/click/1/1", params={"url": peligroso},
        headers=auth_headers, follow_redirects=False,
    )
    assert r.status_code == 400, f"{peligroso}: {r.status_code} {r.headers.get('location')}"


@pytest.mark.asyncio
async def test_el_tracking_sigue_redirigiendo_a_http(client: AsyncClient, auth_headers: dict):
    """
    Contraprueba: el tracking de clics tiene que seguir funcionando. Cerrar los
    esquemas no puede romper la funcionalidad.
    """
    r = await client.get(
        "/api/campaigns/track/click/1/1",
        params={"url": "https://cliente-real.example/oferta"},
        headers=auth_headers,
        follow_redirects=False,
    )
    assert r.status_code == 302, r.text[:150]
    assert r.headers["location"] == "https://cliente-real.example/oferta"


def test_el_endpoint_valida_el_esquema_antes_de_redirigir():
    """Regresion de forma: si se quita, vuelve el vector."""
    src = (RAIZ / "routers" / "campaigns.py").read_text(encoding="utf-8")
    i = src.index("async def track_campaign_click")
    cuerpo = src[i : i + 1500]
    assert "urlparse(target).scheme" in cuerpo
    assert '("http", "https")' in cuerpo


# ─────────────────────────────────────────── 2. identificadores SQL

def test_los_identificadores_de_conteo_salen_de_un_conjunto_cerrado():
    from routers.e2e_orchestrator import CAMPOS_CONTABLES, TABLAS_CONTABLES

    assert isinstance(TABLAS_CONTABLES, frozenset) and TABLAS_CONTABLES
    assert isinstance(CAMPOS_CONTABLES, frozenset) and CAMPOS_CONTABLES
    for x in TABLAS_CONTABLES | CAMPOS_CONTABLES:
        assert x.replace("_", "").isalnum(), f"identificador sospechoso: {x}"


@pytest.mark.asyncio
async def test_un_campo_no_previsto_corta_en_vez_de_llegar_al_sql():
    from routers.e2e_orchestrator import _count_in_workspace

    with pytest.raises(ValueError, match="Unsupported table/field"):
        await _count_in_workspace(None, "deals", "1=1 OR x", 1, "u", 1)


@pytest.mark.asyncio
async def test_una_tabla_no_prevista_tambien_corta():
    from routers.e2e_orchestrator import _count_in_workspace

    with pytest.raises(ValueError, match="Unsupported table/field"):
        await _count_in_workspace(None, "users; DROP TABLE x", "project_id", 1, "u", 1)


# ─────────────────────────────────────────── guard de clase: SQL construido

def test_ninguna_consulta_interpola_un_argumento_sin_acotar():
    """
    Guard de CLASE. Interpolar un argumento de funcion dentro de `text()` es la
    forma que tiene aqui la inyeccion SQL: los valores pueden ir como parametros
    ligados, pero los IDENTIFICADORES no, asi que la unica defensa es una lista
    blanca.

    Los cinco casos existentes la tienen. Uno nuevo sin ella falla aqui.
    """
    permitidos = {
        "services/tenant_service.py::verify_tenant_access": "allowlist de tablas justo encima",
        "routers/e2e_orchestrator.py::_count_in_workspace": "TABLAS_CONTABLES / CAMPOS_CONTABLES",
    }
    culpables = []
    revisados = 0
    for carpeta in ("services", "routers", "core"):
        base = RAIZ / carpeta
        if not base.exists():
            continue
        for f in sorted(base.rglob("*.py")):
            if "__pycache__" in str(f):
                continue
            try:
                arbol = ast.parse(f.read_text(encoding="utf-8"))
            except SyntaxError:  # pragma: no cover
                pytest.fail(f"{f.name} no parsea")
            rel = str(f.relative_to(RAIZ)).replace(os.sep, "/")
            for fn in ast.walk(arbol):
                if not isinstance(fn, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    continue
                params = {a.arg for a in fn.args.args} | {a.arg for a in fn.args.kwonlyargs}
                params.discard("self")
                for n in ast.walk(fn):
                    if not (isinstance(n, ast.Call) and isinstance(n.func, ast.Name)
                            and n.func.id == "text"):
                        continue
                    if not n.args or not isinstance(n.args[0], ast.JoinedStr):
                        continue
                    revisados += 1
                    for v in n.args[0].values:
                        if not isinstance(v, ast.FormattedValue):
                            continue
                        e = v.value
                        directo = (
                            (isinstance(e, ast.Name) and e.id in params)
                            or (isinstance(e, ast.Attribute)
                                and isinstance(e.value, ast.Name) and e.value.id in params)
                        )
                        if not directo:
                            continue
                        clave = f"{rel}::{fn.name}"
                        if clave in permitidos:
                            assert len(permitidos[clave]) > 15, f"{clave} sin motivo"
                            continue
                        culpables.append(f"{clave}:{n.lineno} -> {ast.unparse(e)[:40]}")
    assert revisados > 50, f"solo {revisados} consultas con f-string: el barrido murio"
    assert culpables == [], f"identificadores sin acotar en SQL: {culpables}"
