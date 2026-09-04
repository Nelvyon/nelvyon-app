"""Nada que ejecute contra un proveedor real lo hace sin cruzar sus puertas.

QUE SE PROTEGE AQUI
-------------------
`PuenteDeEjecucion` describe siete puertas entre un agente que PROPONE una
accion y el ejecutor que la hace:

  1 · el contrato del agente permite ESTA accion
  2 · si hace falta, una persona dice que si
  3 · lo que sale ha pasado por calidad
  4 · el ejecutor existe
  5 · hay autorizacion de gasto, y la solicitud se registra (idempotente)
  6 · se ejecuta
  7 · se cierra el rastro

El puente en si no lo llama nadie —esta declarado como tal en el guardian de
alcanzabilidad—, pero las puertas 1, 5, 6 y 7 SI se cumplen en la via viva: las
rutas de lanzamiento las implementan.

Lo que esta bateria impide es que la SIGUIENTE ruta se las salte. Hoy hay dos
que gastan dinero de un cliente; el dia que haya una tercera, o alguien quite una
comprobacion de las que hay, esto se pone rojo.

LA DISTINCION QUE LA HACE UTIL
-------------------------------
LEER NO ES GASTAR. `accounts` lista las cuentas publicitarias a las que el
usuario tiene acceso: es un GET autenticado y no abre gasto ninguno. Exigirle
autorizacion de presupuesto e idempotencia seria ruido, y una puerta que salta
siempre es una puerta que se ignora.

Solo se exige el juego completo a lo que MUTA.

COSTE EXTERNO: 0 EUR. Se leen ficheros.
"""
from __future__ import annotations

import os
import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parents[2]
RUTAS = RAIZ / "apps" / "web" / "src" / "app" / "api"

_COMENTARIO = re.compile(r"//[^\n]*|/\*.*?\*/", re.S)

#: Modulos que hablan con un proveedor que cobra por lo que hace.
_EJECUTOR = re.compile(r"GoogleAdsExecutor|MetaAdsExecutor|TikTokAdsExecutor|LinkedInAdsExecutor")

#: Un manejador que cambia algo al otro lado.
_MUTA = re.compile(r"export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b")

#: Las puertas, tal y como se llaman en el codigo.
_PUERTAS = {
    "autorizacion": re.compile(r"requireSaasContext|requirePlatformAdmin"),
    "gasto": re.compile(r"comprobarPuertaDeGasto|exigirPuertaDeGasto"),
    "idempotencia": re.compile(r"idempotency-key|idempotencyKey"),
    "registro": re.compile(r"registrarSolicitud|apuntar\("),
}


def _codigo(ruta: pathlib.Path) -> str:
    return _COMENTARIO.sub(" ", ruta.read_text(encoding="utf-8", errors="replace"))


def _rutas_que_ejecutan() -> list[tuple[str, str, bool]]:
    """(ruta relativa, codigo, muta) de cada ruta que alcanza un ejecutor."""
    fuera: list[tuple[str, str, bool]] = []
    for base, _, ficheros in os.walk(RUTAS):
        for f in ficheros:
            if f not in ("route.ts", "route.tsx"):
                continue
            p = pathlib.Path(base) / f
            codigo = _codigo(p)
            if not _EJECUTOR.search(codigo):
                continue
            rel = os.path.relpath(p, RUTAS).replace("\\", "/")
            fuera.append((rel, codigo, bool(_MUTA.search(codigo))))
    return sorted(fuera)


def test_el_barrido_encuentra_rutas_que_ejecutan():
    """CONTROL POSITIVO. Cero rutas seria un verde vacio."""
    r = _rutas_que_ejecutan()
    assert len(r) >= 2, f"solo {len(r)} rutas alcanzan un ejecutor; el barrido no mira nada"


def test_hay_rutas_de_las_dos_clases():
    """CONTROL. Si TODAS mutaran o ninguna lo hiciera, la distincion que sostiene
    esta bateria no se estaria ejerciendo y el detector podria estar roto."""
    r = _rutas_que_ejecutan()
    assert any(m for _, _, m in r), "ninguna ruta muta: el detector de mutacion no ve nada"
    assert any(not m for _, _, m in r), "todas mutan: el detector de mutacion ve de mas"


def test_toda_ejecucion_que_gasta_cruza_sus_puertas():
    """LA REGLA.

    Al otro lado hay dinero de un cliente y publicaciones con su cara. Una ruta
    que lo alcance sin cruzar las puertas no falla en ninguna prueba: funciona
    perfectamente, y el fallo llega por una factura.
    """
    fallos: list[str] = []
    for rel, codigo, muta in _rutas_que_ejecutan():
        if not muta:
            continue
        faltan = [nombre for nombre, pat in _PUERTAS.items() if not pat.search(codigo)]
        if faltan:
            fallos.append(f"{rel}: le faltan {faltan}")
    assert not fallos, (
        "estas rutas ejecutan contra un proveedor de pago sin cruzar todas sus "
        "puertas:\n  " + "\n  ".join(fallos)
    )


def test_lo_que_solo_LEE_no_carga_con_puertas_que_no_le_tocan():
    """CONTROL NEGATIVO, y es lo que evita que esto sea ruido.

    `accounts` lista las cuentas a las que el usuario tiene acceso. Exigirle
    autorizacion de presupuesto seria pedir permiso para gastar cero, y una
    puerta que salta siempre se acaba ignorando.

    Lo que SI se le exige es estar autenticado.
    """
    for rel, codigo, muta in _rutas_que_ejecutan():
        if muta:
            continue
        assert re.search(r"authenticate|requireSaasContext|requirePlatformAdmin", codigo), (
            f"{rel} habla con un proveedor sin comprobar quien llama"
        )


def test_las_puertas_del_puente_siguen_declaradas():
    """El puente no se ejecuta, pero es donde estan escritas las siete puertas y
    POR QUE ninguna es opcional. Si desapareciera, la proxima ruta se escribiria
    sin saber contra que se estaba protegiendo.
    """
    puente = RAIZ / "backend" / "ejecucion" / "PuenteDeEjecucion.ts"
    assert puente.exists(), "desaparecio el fichero donde estan descritas las siete puertas"
    texto = puente.read_text(encoding="utf-8", errors="replace")
    assert "NINGUNA PUERTA ES OPCIONAL" in texto
    # El orden importa y esta razonado: una pieza que suspende no debe llegar a
    # reservar presupuesto.
    assert "LA 3 VA ANTES QUE LA 5" in texto
