"""
Dos handlers no pueden responder a la misma ruta.

Una ruta duplicada es un defecto silencioso de los peores: FastAPI registra los
dos y sirve el PRIMERO, asi que el segundo —con su autorizacion, su filtro de
workspace y sus validaciones— queda muerto sin que nada falle. Es la forma en
que un endpoint endurecido puede acabar sin efecto.

Este guard compara la ruta COMPLETA: prefijo del router mas ruta del decorador.
Compararlas sin el prefijo da 73 falsos positivos, porque `GET /all` existe en
casi todos los routers de entidad y resuelve a rutas distintas. Ese error lo
cometio la primera version de este detector.
"""
from __future__ import annotations

import ast
import os
from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parent.parent
METODOS = ("get", "post", "put", "patch", "delete")


def _rutas_completas() -> dict[str, list[str]]:
    rutas: dict[str, list[str]] = {}
    for f in sorted((RAIZ / "routers").rglob("*.py")):
        if "__pycache__" in str(f):
            continue
        try:
            arbol = ast.parse(f.read_text(encoding="utf-8"))
        except SyntaxError:  # pragma: no cover
            pytest.fail(f"{f.name} no parsea")

        # Prefijo por nombre de variable de router: un fichero puede declarar
        # varios (`router`, `scheduler_router`...) con prefijos distintos.
        prefijos: dict[str, str] = {}
        for n in ast.walk(arbol):
            if not (isinstance(n, ast.Assign) and isinstance(n.value, ast.Call)):
                continue
            fn = n.value.func
            if not (isinstance(fn, ast.Name) and fn.id == "APIRouter"):
                continue
            pre = ""
            for k in n.value.keywords:
                if k.arg == "prefix" and isinstance(k.value, ast.Constant):
                    pre = str(k.value.value)
            for t in n.targets:
                if isinstance(t, ast.Name):
                    prefijos[t.id] = pre

        rel = str(f.relative_to(RAIZ)).replace(os.sep, "/")
        for n in ast.walk(arbol):
            if not isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            for d in n.decorator_list:
                fn = d.func if isinstance(d, ast.Call) else d
                if not (isinstance(fn, ast.Attribute) and fn.attr.lower() in METODOS):
                    continue
                var = fn.value.id if isinstance(fn.value, ast.Name) else "?"
                ruta = ""
                if isinstance(d, ast.Call) and d.args and isinstance(d.args[0], ast.Constant):
                    ruta = str(d.args[0].value)
                completa = f"{fn.attr.upper()} {prefijos.get(var, '')}{ruta}"
                rutas.setdefault(completa, []).append(f"{rel}::{n.name}")
                break
    return rutas


def test_el_barrido_encuentra_rutas():
    """Sin esto, un barrido roto daria cero duplicados y pareceria limpio."""
    rutas = _rutas_completas()
    assert len(rutas) > 500, f"solo {len(rutas)} rutas halladas"


def test_ninguna_ruta_esta_declarada_dos_veces():
    duplicadas = {k: v for k, v in _rutas_completas().items() if len(v) > 1}
    assert duplicadas == {}, f"rutas servidas por mas de un handler: {duplicadas}"


def test_el_detector_usa_el_prefijo_del_router():
    """
    Sin prefijo, `GET /all` aparece en casi todos los routers de entidad y el
    detector reporta decenas de duplicados que no existen. Se comprueba que las
    claves llevan la ruta completa.
    """
    rutas = _rutas_completas()
    con_prefijo = [k for k in rutas if k.startswith("GET /api/")]
    assert len(con_prefijo) > 100, "las claves no llevan el prefijo del router"
    assert "GET /all" not in rutas, "una clave sin prefijo: el detector perdio el prefijo"
