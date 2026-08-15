"""
Una subida no puede materializarse entera antes de mirar su tamano.

`social.upload_media` hacia `await file.read()` sin limite: el fichero completo
entraba en memoria y solo despues se decidia que hacer con el. Sus hermanos del
mismo backend —`voice_commands`, `voice_pilot_v2`, `os_deliverables_rest`— ya
leian por bloques con tope, asi que era la excepcion, no el patron.

El guard es de CLASE: cualquier endpoint que reciba `UploadFile` y lea sin
acotar falla, no solo el que se corrigio.
"""
from __future__ import annotations

import ast
from pathlib import Path

import pytest

ROUTERS = Path(__file__).resolve().parent.parent / "routers"


def _endpoints_con_subida():
    for p in sorted(ROUTERS.glob("*.py")):
        src = p.read_text(encoding="utf-8")
        if "UploadFile" not in src:
            continue
        arbol = ast.parse(src)
        for n in ast.walk(arbol):
            if not isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            cuerpo = ast.unparse(n)
            if "UploadFile" in cuerpo and ".read(" in cuerpo:
                yield p.name, n.name, cuerpo


def test_el_barrido_encuentra_endpoints_de_subida():
    """Sin esto, un fallo del barrido dejaria el guard verde por vacio."""
    hallados = list(_endpoints_con_subida())
    assert len(hallados) >= 3, f"solo {len(hallados)} endpoints con subida"


@pytest.mark.parametrize(
    "fichero,funcion,cuerpo",
    [pytest.param(f, fn, c, id=f"{f}::{fn}") for f, fn, c in _endpoints_con_subida()],
)
def test_ninguna_subida_se_lee_sin_acotar(fichero, funcion, cuerpo):
    """
    `read()` sin argumento lee el fichero ENTERO. Con argumento lee un bloque,
    que es lo que permite parar al pasarse del tope.
    """
    assert ".read()" not in cuerpo, (
        f"{fichero}::{funcion} lee la subida entera antes de comprobar su tamano"
    )


def test_el_tope_de_media_social_existe_y_es_finito():
    from routers.social import MAX_MEDIA_BYTES

    assert 0 < MAX_MEDIA_BYTES <= 100 * 1024 * 1024


@pytest.mark.asyncio
async def test_pasarse_del_tope_corta_antes_de_terminar_de_leer():
    """
    La propiedad real: no basta con rechazar al final. Se corta durante la
    lectura, asi que un fichero enorme nunca llega a materializarse.
    """
    from fastapi import HTTPException

    from routers.social import _leer_subida_acotada

    leidos = {"bloques": 0}

    class _SubidaEnorme:
        async def read(self, n: int = -1) -> bytes:
            leidos["bloques"] += 1
            return b"x" * n if n > 0 else b"x" * 1024

    with pytest.raises(HTTPException) as exc:
        await _leer_subida_acotada(_SubidaEnorme(), limite=200_000)
    assert exc.value.status_code == 413
    # Si hubiese leido todo antes de comprobar, el numero de bloques seria
    # ilimitado; con corte, son los justos para pasarse del tope.
    assert leidos["bloques"] <= (200_000 // 65536) + 2


@pytest.mark.asyncio
async def test_un_fichero_dentro_del_tope_se_lee_entero():
    """Contraprueba: el lector no esta simplemente rechazando todo."""
    from routers.social import _leer_subida_acotada

    class _SubidaPequena:
        def __init__(self):
            self._resto = b"a" * 1000

        async def read(self, n: int = -1) -> bytes:
            trozo, self._resto = self._resto[:n], self._resto[n:]
            return trozo

    datos = await _leer_subida_acotada(_SubidaPequena(), limite=200_000)
    assert datos == b"a" * 1000
