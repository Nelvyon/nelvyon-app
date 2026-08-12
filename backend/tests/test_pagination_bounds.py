"""
Ningun endpoint puede servir un conjunto sin tope.

HALLAZGO, reproducido antes de corregir nada:

    GET /api/cdp/profiles?limit=100000000   -> 500 (la consulta revienta)
    GET /api/push/subscribers?limit=100000000 -> 200 (sirve el conjunto entero)

Doce endpoints declaraban `limit: int = N` como parametro pelado, sin cota
superior, frente a 120 que ya usaban `Query(N, ge=1, le=MAX)`. Es decir, la
convencion existia y estos eran la excepcion, no una decision.

Un `limit` sin techo es a la vez un problema de disponibilidad —una peticion
puede pedir la tabla entera— y de coste: memoria, tiempo de consulta y ancho de
banda los elige quien llama.

Los topes usados (200 y 500) son valores que YA aparecian en el repositorio; no
se invento ninguno.
"""
from __future__ import annotations

import ast
import os
from pathlib import Path

import pytest
from httpx import AsyncClient

ROUTERS = Path(__file__).resolve().parent.parent / "routers"

#: Nombres de parametro que acotan el tamano de una pagina.
PARAMS_DE_PAGINA = {"limit", "per_page", "page_size", "size", "top"}


def _parametros_de_pagina():
    """(fichero, funcion, parametro, expresion por defecto) de cada endpoint."""
    for f in sorted(ROUTERS.rglob("*.py")):
        if "__pycache__" in str(f):
            continue
        try:
            arbol = ast.parse(f.read_text(encoding="utf-8"))
        except SyntaxError:  # pragma: no cover
            pytest.fail(f"{f.name} no parsea")
        for n in ast.walk(arbol):
            if not isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            es_endpoint = any(
                isinstance((d.func if isinstance(d, ast.Call) else d), ast.Attribute)
                and (d.func if isinstance(d, ast.Call) else d).attr.lower()
                in ("get", "post", "put", "patch", "delete")
                for d in n.decorator_list
            )
            if not es_endpoint:
                continue
            args = n.args
            nombres = [a.arg for a in args.args[-len(args.defaults):]] if args.defaults else []
            defaults = list(args.defaults)
            nombres += [a.arg for a in args.kwonlyargs]
            defaults += [d for d in args.kw_defaults if d is not None]
            for nombre, d in zip(nombres, defaults):
                if nombre in PARAMS_DE_PAGINA:
                    yield (
                        str(f.relative_to(ROUTERS.parent)).replace(os.sep, "/"),
                        n.name,
                        nombre,
                        ast.unparse(d),
                    )


def test_el_barrido_encuentra_endpoints_paginados():
    """Sin esto, un barrido roto daria cero hallazgos y pareceria limpio."""
    hallados = list(_parametros_de_pagina())
    assert len(hallados) > 100, f"solo {len(hallados)} parametros de pagina hallados"


@pytest.mark.parametrize(
    "fichero,funcion,param,defecto",
    [pytest.param(f, fn, p, d, id=f"{f}::{fn}::{p}") for f, fn, p, d in _parametros_de_pagina()],
)
def test_todo_parametro_de_pagina_tiene_techo(fichero, funcion, param, defecto):
    """
    `le=` es lo que impide que el llamante elija cuanto trabajo hace el servidor.
    `ge=` evita ademas negativos y ceros, que en algunos motores significan
    "sin limite".
    """
    assert "le=" in defecto or "lt=" in defecto, (
        f"{fichero}::{funcion} · {param}={defecto} no tiene cota superior"
    )
    assert "ge=" in defecto or "gt=" in defecto, (
        f"{fichero}::{funcion} · {param}={defecto} no tiene cota inferior"
    )


# ─────────────────────────────────────────── comprobacion sobre HTTP real

@pytest.mark.asyncio
@pytest.mark.parametrize("ruta", ["/api/push/subscribers", "/api/cdp/profiles"])
async def test_un_limite_desmesurado_se_rechaza(client: AsyncClient, auth_headers: dict, ruta):
    """El caso exacto del hallazgo, sobre HTTP."""
    r = await client.get(f"{ruta}?limit=100000000", headers=auth_headers)
    assert r.status_code == 422, f"{ruta}: {r.status_code} {r.text[:150]}"


@pytest.mark.asyncio
@pytest.mark.parametrize("valor", ["0", "-1", "-100"])
async def test_un_limite_no_positivo_se_rechaza(client: AsyncClient, auth_headers: dict, valor):
    """En varios motores `LIMIT 0` o negativo significa "todo" o revienta."""
    r = await client.get(f"/api/push/subscribers?limit={valor}", headers=auth_headers)
    assert r.status_code == 422, f"limit={valor}: {r.status_code} {r.text[:150]}"


@pytest.mark.asyncio
async def test_un_limite_razonable_sigue_funcionando(client: AsyncClient, auth_headers: dict):
    """
    Contraprueba imprescindible: los 422 anteriores no pueden venir de haber
    roto el endpoint.
    """
    r = await client.get("/api/push/subscribers?limit=10", headers=auth_headers)
    assert r.status_code == 200, r.text[:150]


@pytest.mark.asyncio
async def test_el_valor_por_defecto_sigue_siendo_valido(client: AsyncClient, auth_headers: dict):
    """
    Si el techo quedase por debajo del valor por defecto, el endpoint fallaria
    sin que nadie pasara parametro alguno.
    """
    r = await client.get("/api/push/subscribers", headers=auth_headers)
    assert r.status_code == 200, r.text[:150]


def test_ningun_techo_queda_por_debajo_de_su_valor_por_defecto():
    """La misma propiedad, comprobada estaticamente en TODOS los endpoints."""
    import re

    malos = []
    for fichero, funcion, param, defecto in _parametros_de_pagina():
        m_def = re.search(r"Query\(\s*(\d+)", defecto)
        m_le = re.search(r"le=(\d+)", defecto)
        if m_def and m_le and int(m_def.group(1)) > int(m_le.group(1)):
            malos.append(f"{fichero}::{funcion} {param}={defecto}")
    assert malos == [], f"techo por debajo del valor por defecto: {malos}"
