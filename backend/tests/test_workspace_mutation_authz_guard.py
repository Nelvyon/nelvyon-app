"""
Guard estructural: ninguna mutacion workspace-scoped puede quedarse en
`require_workspace`.

El hallazgo que motiva esto: `POST /api/ads-agent/briefing` usaba
`require_workspace` —que solo comprueba PERTENENCIA— mientras sus 21 endpoints
mutantes hermanos usaban `require_workspace_operator`. Nada obligaba a ser
coherente, asi que la excepcion paso inadvertida.

COMO FUNCIONA
-------------
No es un grep. Recorre los `routers/*.py` con el AST de Python (`ast`, libreria
estandar: no anade dependencias), localiza funciones decoradas con
`@<algo>.post/put/patch/delete` y examina los DEFAULTS de sus parametros
buscando `Depends(...)`. Una mutacion que dependa de `require_workspace` sin una
autoridad de rol por encima es un fallo.

Al trabajar sobre el AST detecta routers con cualquier nombre de variable
(`router`, `os_store_router`, `funnel_router`...), que es justo donde un conteo
ingenuo por `@router.` se dejaba endpoints fuera.
"""
from __future__ import annotations

import ast
from pathlib import Path

import pytest

ROUTERS_DIR = Path(__file__).resolve().parent.parent / "routers"

METODOS_MUTANTES = {"post", "put", "patch", "delete"}

#: Dependencias que SI acreditan autoridad de mutacion.
AUTORIDAD_SUFICIENTE = {
    "require_workspace_operator",
    "require_workspace_admin",
    "require_super_admin",
    "require_admin",
}

#: La dependencia debil: acredita pertenencia, no autoridad.
SOLO_PERTENENCIA = "require_workspace"

#: Excepciones por ENDPOINT, nunca por fichero.
#: clave: "<fichero>::<funcion>"
PERMITIDAS: dict[str, dict[str, str]] = {
    # (vacio a proposito: hoy no hay ninguna mutacion legitima que se conforme
    #  con pertenencia. Cualquier alta aqui debe declarar autoridad esperada.)
}


def _dependencias(func: ast.AST) -> set[str]:
    """Nombres pasados a `Depends(...)` en los defaults de la firma."""
    nombres: set[str] = set()
    args = getattr(func, "args", None)
    if args is None:
        return nombres
    defaults = list(args.defaults) + [d for d in args.kw_defaults if d is not None]
    for d in defaults:
        if not isinstance(d, ast.Call):
            continue
        fn = d.func
        if not (isinstance(fn, ast.Name) and fn.id == "Depends"):
            continue
        for a in d.args:
            if isinstance(a, ast.Name):
                nombres.add(a.id)
            elif isinstance(a, ast.Attribute):
                nombres.add(a.attr)
    return nombres


def _es_mutacion(func: ast.AST) -> bool:
    for dec in getattr(func, "decorator_list", []):
        f = dec.func if isinstance(dec, ast.Call) else dec
        # `@<lo_que_sea>.post(...)` — el nombre del router no importa.
        if isinstance(f, ast.Attribute) and f.attr.lower() in METODOS_MUTANTES:
            return True
    return False


def _recolectar_todos() -> list[tuple[str, str, set[str]]]:
    """(fichero, funcion, dependencias) de TODO endpoint, mute o no."""
    out: list[tuple[str, str, set[str]]] = []
    for p in sorted(ROUTERS_DIR.glob("*.py")):
        arbol = ast.parse(p.read_text(encoding="utf-8"))
        for nodo in ast.walk(arbol):
            if isinstance(nodo, (ast.FunctionDef, ast.AsyncFunctionDef)):
                for dec in getattr(nodo, "decorator_list", []):
                    f = dec.func if isinstance(dec, ast.Call) else dec
                    if isinstance(f, ast.Attribute) and f.attr.lower() in (
                        METODOS_MUTANTES | {"get"}
                    ):
                        out.append((p.name, nodo.name, _dependencias(nodo)))
                        break
    return out


def _recolectar() -> list[tuple[str, str, set[str]]]:
    """(fichero, funcion, dependencias) de cada endpoint mutante."""
    out: list[tuple[str, str, set[str]]] = []
    for p in sorted(ROUTERS_DIR.glob("*.py")):
        try:
            arbol = ast.parse(p.read_text(encoding="utf-8"))
        except SyntaxError:  # pragma: no cover
            pytest.fail(f"{p.name} no parsea")
        for nodo in ast.walk(arbol):
            if isinstance(nodo, (ast.FunctionDef, ast.AsyncFunctionDef)) and _es_mutacion(nodo):
                out.append((p.name, nodo.name, _dependencias(nodo)))
    return out


#: Routers auditados en este bloque: los cinco upstream de los BFF delegados.
#: El guard los exige de forma ESTRICTA. El resto del backend queda cubierto por
#: el trinquete de mas abajo, no por confianza.
ROUTERS_AUDITADOS = {
    "workflows.py",
    "workflow_engine.py",
    "os_store_builder.py",
    "funnel_builder.py",
}

#: Routers PLATFORM-SCOPED: consumen un recurso corporativo unico, sin dimension
#: de workspace. Aqui la autoridad de workspace no es "demasiado debil": es de la
#: CLASE equivocada. `ads_agent` opera la unica cuenta Google/Meta de NELVYON, asi
#: que un operator de cualquier workspace no debe alcanzarla ni para leer.
ROUTERS_PLATFORM_SCOPED = {"ads_agent.py"}

#: Autoridad valida para recursos de plataforma. Deriva del rol del JWT
#: verificado, nunca de `X-Workspace-Id` ni de `workspace_members`.
AUTORIDAD_DE_PLATAFORMA = {"get_super_admin_user", "require_super_admin"}

#: Deuda medida, NO ignorada. El barrido completo encontro endpoints mutantes
#: workspace-scoped que se conforman con pertenencia en routers aun sin auditar
#: (whatsapp, advisor_entitlements, affiliates, agents, ai...). Muchos usan POST
#: como lectura —streaming, analisis— y no son defectos; otros hay que mirarlos.
#: Triarlos exige leer cada uno, asi que quedan como bloque propio. Mientras
#: tanto este numero solo puede BAJAR: si sube, el trinquete falla y obliga a
#: revisar el endpoint nuevo antes de entrar.
DEUDA_SIN_AUDITAR_MAXIMA = 76

MUTANTES = _recolectar()
#: Solo las que se declaran workspace-scoped: las que no tocan workspace tienen
#: su propia frontera (cron, webhooks, publicas) y se auditan aparte.
WORKSPACE_SCOPED = [m for m in MUTANTES if SOLO_PERTENENCIA in m[2] or AUTORIDAD_SUFICIENTE & m[2]]
AUDITADOS = [m for m in WORKSPACE_SCOPED if m[0] in ROUTERS_AUDITADOS]
SIN_AUDITAR = [
    m for m in WORKSPACE_SCOPED
    if m[0] not in ROUTERS_AUDITADOS and m[0] not in ROUTERS_PLATFORM_SCOPED
]
#: Todos los endpoints —muten o no— de los routers platform-scoped: en ellos
#: incluso una lectura expone datos corporativos.
PLATFORM = [m for m in _recolectar_todos() if m[0] in ROUTERS_PLATFORM_SCOPED]


def test_el_barrido_encuentra_endpoints_de_verdad():
    """Sin esto, un fallo del AST dejaria el guard verde por vacio."""
    assert len(MUTANTES) > 50, f"solo {len(MUTANTES)} mutaciones halladas"
    assert len(WORKSPACE_SCOPED) > 20, f"solo {len(WORKSPACE_SCOPED)} workspace-scoped"
    ficheros = {m[0] for m in WORKSPACE_SCOPED}
    # Los routers upstream de los BFF delegados deben estar cubiertos.
    for esperado in ("workflows.py", "workflow_engine.py", "os_store_builder.py", "funnel_builder.py"):
        assert esperado in ficheros, f"{esperado} no aparece en el barrido"
    # `ads_agent.py` ya NO debe aparecer aqui: es platform-scoped y se cubre en
    # su propio bloque. Si reapareciera, alguien le habria devuelto autoridad de
    # workspace.
    assert "ads_agent.py" not in ficheros
    assert len(PLATFORM) >= 4, f"solo {len(PLATFORM)} endpoints platform-scoped"


@pytest.mark.parametrize(
    "fichero,funcion,deps",
    [pytest.param(f, fn, d, id=f"{f}::{fn}") for f, fn, d in AUDITADOS],
)
def test_mutacion_workspace_scoped_exige_autoridad(fichero, funcion, deps):
    clave = f"{fichero}::{funcion}"
    if clave in PERMITIDAS:
        assert PERMITIDAS[clave].get("motivo"), f"{clave} en allowlist sin motivo"
        assert PERMITIDAS[clave].get("autoridad_esperada"), f"{clave} sin autoridad declarada"
        return
    assert AUTORIDAD_SUFICIENTE & deps, (
        f"{clave} muta y es workspace-scoped, pero solo depende de "
        f"{sorted(deps)}. `require_workspace` acredita PERTENENCIA, no autoridad: "
        f"usa require_workspace_operator (o admin) como los demas, o justificalo "
        f"en PERMITIDAS con motivo y autoridad esperada."
    )


def test_la_allowlist_no_tiene_entradas_muertas():
    claves = {f"{f}::{fn}" for f, fn, _ in MUTANTES}
    for k in PERMITIDAS:
        assert k in claves, f"{k} ya no existe: limpia la allowlist"


def test_ads_briefing_exige_autoridad_de_plataforma():
    """
    Regresion explicita del hallazgo. Paso por dos estados: primero
    `require_workspace` (pertenencia), luego `require_workspace_operator`, y solo
    al trazar los servicios se vio que la cuenta Google/Meta es unica y
    corporativa. La autoridad correcta es de plataforma.
    """
    encontrado = [m for m in MUTANTES if m[0] == "ads_agent.py" and m[1] == "ads_agent_briefing"]
    assert encontrado, "el endpoint del hallazgo ya no existe: revisa el guard"
    deps = encontrado[0][2]
    assert "get_super_admin_user" in deps
    assert not any(x.startswith("require_workspace") for x in deps)


def test_trinquete_de_deuda_no_auditada():
    """
    La deuda de routers sin auditar solo puede decrecer.

    No convierte el hallazgo en verde por omision: fija el numero exacto. Un
    endpoint nuevo que se conforme con pertenencia hace fallar este test y
    obliga a justificarlo o corregirlo antes de entrar.
    """
    sin_autoridad = [m for m in SIN_AUDITAR if not (AUTORIDAD_SUFICIENTE & m[2])]
    assert len(sin_autoridad) <= DEUDA_SIN_AUDITAR_MAXIMA, (
        f"{len(sin_autoridad)} mutaciones workspace-scoped sin autoridad de rol "
        f"(techo {DEUDA_SIN_AUDITAR_MAXIMA}). Endpoints nuevos: revisa su autorizacion. "
        f"Muestra: {sorted(f'{f}::{fn}' for f, fn, _ in sin_autoridad)[:5]}"
    )
    # Si baja, baja tambien el techo: el trinquete no debe aflojarse solo.
    assert len(sin_autoridad) >= DEUDA_SIN_AUDITAR_MAXIMA - 5, (
        f"la deuda bajo a {len(sin_autoridad)}: actualiza DEUDA_SIN_AUDITAR_MAXIMA "
        f"para que el trinquete siga apretado"
    )


@pytest.mark.parametrize(
    "fichero,funcion,deps",
    [pytest.param(f, fn, d, id=f"{f}::{fn}") for f, fn, d in PLATFORM],
)
def test_recurso_de_plataforma_exige_autoridad_de_plataforma(fichero, funcion, deps):
    """
    El defecto de ads no fue una dependencia demasiado debil: fue la CLASE de
    autoridad equivocada. Autorizar por workspace un recurso que no tiene
    workspace protege correctamente el recurso equivocado.
    """
    assert AUTORIDAD_DE_PLATAFORMA & deps, (
        f"{fichero}::{funcion} consume un recurso corporativo unico pero depende de "
        f"{sorted(deps)}. Un rol de workspace no acredita autoridad sobre la cuenta "
        f"de NELVYON: usa get_super_admin_user."
    )


def test_ningun_endpoint_de_plataforma_usa_autoridad_de_workspace():
    contaminados = [
        f"{f}::{fn}" for f, fn, d in PLATFORM
        if any(x.startswith("require_workspace") for x in d)
    ]
    assert contaminados == [], (
        f"estos endpoints platform-scoped siguen autorizando por workspace: {contaminados}"
    )
