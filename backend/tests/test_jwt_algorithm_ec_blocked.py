"""Firmar JWT con curva eliptica esta prohibido por configuracion.

DE DONDE SALE
-------------
`pip-audit` sobre `requirements.txt` devolvio una sola vulnerabilidad:
`ecdsa 0.19.2`, PYSEC-2026-1325 — ataque de temporizacion Minerva sobre P-256.
Midiendo el tiempo de firma se filtra el nonce interno y de ahi la clave privada.
Afecta a firmar, generar claves y ECDH; verificar no.

NO SE PUEDE ARREGLAR ACTUALIZANDO
---------------------------------
El aviso no trae version corregida y su rango empieza en 0: el proyecto
`python-ecdsa` considera los canales laterales fuera de su alcance. La
dependencia entra sola, como requisito de `python-jose`.

POR QUE ESTO CIERRA EL HALLAZGO
-------------------------------
NELVYON firma con HS256 —HMAC, sin curvas— asi que hoy ese codigo no se ejecuta.
Pero el algoritmo se lee de `JWT_ALGORITHM`, y «no alcanzable» por configuracion
deja de serlo en cuanto alguien cambia la variable. El guard convierte la
circunstancia en invariante: con un algoritmo EC el sistema no arranca a firmar,
falla y dice por que.

Es el cambio minimo: no se sustituye la libreria de JWT ni se actualiza nada a
latest. Solo se cierra el unico camino por el que el codigo vulnerable podria
llegar a ejecutarse.
"""
from __future__ import annotations

import pytest

from core.auth import _ALGORITMOS_EC_PROHIBIDOS, _fastapi_jwt_algorithm


@pytest.mark.parametrize("alg", sorted(_ALGORITMOS_EC_PROHIBIDOS))
def test_un_algoritmo_de_curva_eliptica_no_se_acepta(monkeypatch, alg):
    monkeypatch.setenv("JWT_ALGORITHM", alg)
    with pytest.raises(RuntimeError) as exc:
        _fastapi_jwt_algorithm()
    assert "PYSEC-2026-1325" in str(exc.value), (
        "el error debe decir de donde viene la prohibicion; si no, el siguiente "
        "que lo lea la quitara por parecer arbitraria"
    )


@pytest.mark.parametrize("alg", ["es256", "Es384", "eS512"])
def test_la_prohibicion_no_se_esquiva_con_minusculas(monkeypatch, alg):
    """`ES256` y `es256` son el mismo algoritmo para la libreria."""
    monkeypatch.setenv("JWT_ALGORITHM", alg)
    with pytest.raises(RuntimeError):
        _fastapi_jwt_algorithm()


@pytest.mark.parametrize("alg", ["HS256", "HS384", "HS512", "RS256", "RS512"])
def test_los_algoritmos_seguros_siguen_funcionando(monkeypatch, alg):
    """Control negativo: prohibir de mas seria romper el producto.

    Sin esto, la forma trivial de pasar los tests de arriba seria rechazar todo,
    y nadie podria firmar nada.
    """
    monkeypatch.setenv("JWT_ALGORITHM", alg)
    assert _fastapi_jwt_algorithm() == alg


def test_sin_variable_el_algoritmo_es_hmac(monkeypatch):
    """El valor por defecto no debe depender de que el entorno este puesto."""
    monkeypatch.delenv("JWT_ALGORITHM", raising=False)
    assert _fastapi_jwt_algorithm() == "HS256"


def test_la_lista_cubre_los_algoritmos_ec_del_estandar():
    """Si aparece un ES* nuevo y no esta aqui, el guard tendria un hueco."""
    assert _ALGORITMOS_EC_PROHIBIDOS >= {"ES256", "ES384", "ES512"}
