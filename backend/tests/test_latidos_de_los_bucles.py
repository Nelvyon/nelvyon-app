"""Ningun bucle de fondo puede ser invisible.

EL DEFECTO QUE ESTO CIERRA
--------------------------
NELVYON arranca seis bucles. Autopilot y el vigilante publicaban su estado —y por
eso el fallo del cerrojo del planner se pudo ver—. Los otros tres arrancaban y
desaparecian: si uno moria, se quedaba mudo o se atascaba, el API seguia
respondiendo 200 y el trabajo simplemente dejaba de hacerse.

Un sistema que no falla y tampoco funciona es el modo de fallo mas caro que
existe cuando no hay nadie mirando.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from core import latidos


@pytest.fixture(autouse=True)
def _limpio():
    latidos.olvidar_todo()
    yield
    latidos.olvidar_todo()


def test_un_bucle_registrado_que_nunca_late_acaba_delatandose():
    """Registrarse no basta: hay que dar vueltas."""
    latidos.registrar("prueba", intervalo_seg=10)
    ahora = datetime.now(timezone.utc)

    # Recien arrancado: se le da margen, casi todos esperan antes del primer tick.
    e = latidos.estado(ahora)
    assert e["bucles"]["prueba"]["frescura"] == "arrancando"
    assert e["status"] == "healthy"

    # Pasado el margen sin un solo latido, ya no hay excusa.
    e = latidos.estado(ahora + timedelta(seconds=10 * latidos.MARGEN + 1))
    assert e["bucles"]["prueba"]["frescura"] == "nunca_ha_latido"
    assert e["status"] == "degraded"
    assert "prueba" in e["rancios"]


def test_un_bucle_que_deja_de_latir_se_ve_rancio():
    """El caso del cerrojo: vivo, sin errores, y sin hacer nada."""
    latidos.registrar("prueba", intervalo_seg=60)
    latidos.latir("prueba")
    ahora = datetime.now(timezone.utc)

    assert latidos.estado(ahora)["status"] == "healthy"
    tarde = ahora + timedelta(seconds=60 * latidos.MARGEN + 1)
    e = latidos.estado(tarde)
    assert e["bucles"]["prueba"]["frescura"] == "rancio"
    assert e["status"] == "degraded"


def test_un_tick_lento_no_es_un_bucle_muerto():
    """Control negativo: sin margen, cada tick lento seria una falsa alarma."""
    latidos.registrar("prueba", intervalo_seg=60)
    latidos.latir("prueba")
    ahora = datetime.now(timezone.utc)
    assert latidos.estado(ahora + timedelta(seconds=90))["status"] == "healthy"


def test_un_bucle_que_revienta_late_igual_pero_con_su_error():
    """Reventar siempre y estar muerto son dos averias distintas.

    Si el tick fallido no latiera, las dos se verian identicas y llevarian a dos
    arreglos equivocados.
    """
    latidos.registrar("prueba", intervalo_seg=60)
    latidos.latir("prueba", error="RuntimeError: reventado")
    e = latidos.estado()
    assert e["bucles"]["prueba"]["frescura"] == "ok"
    assert e["bucles"]["prueba"]["ultimo_error"] == "RuntimeError: reventado"
    assert "prueba" in e["con_error"]


def test_sin_ningun_bucle_registrado_no_se_dice_healthy():
    """O el arranque fallo, o este proceso no es el que los corre.

    Las dos cosas hay que verlas; ninguna es «sano».
    """
    e = latidos.estado()
    assert e["status"] == "unknown"
    assert e["registrados"] == 0


def test_el_latido_cuenta_vueltas():
    latidos.registrar("prueba", intervalo_seg=60)
    for _ in range(5):
        latidos.latir("prueba", publicados=1)
    e = latidos.estado()
    assert e["bucles"]["prueba"]["vueltas"] == 5
    assert e["bucles"]["prueba"]["publicados"] == 1


# ═══════════════════════════════════════════════════════════════════════════
# El guard: un worker nuevo no puede nacer invisible
# ═══════════════════════════════════════════════════════════════════════════


def test_todo_worker_que_main_arranca_publica_su_latido():
    """LA PRUEBA QUE IMPIDE LA REGRESION.

    Si manana alguien anade un bucle de fondo al arranque sin registrarlo, esta
    prueba lo dice. Sin ella, la unica forma de enterarse seria que el trabajo
    dejara de hacerse y alguien lo notara semanas despues.
    """
    import pathlib
    import re

    fuente = pathlib.Path("main.py").read_text(encoding="utf-8")
    arranques = set(re.findall(r"from services\.(\w+) import (?:start_\w+|arrancar)",
                               fuente))
    # Autopilot y el vigilante publican su estado por su cuenta, con mas detalle
    # del que cabe en un latido generico (cerrojo, severidad, incidentes).
    propios = {"autopilot_loop", "vigilante_negocio"}

    sin_latido = []
    for modulo in arranques - propios:
        ruta = pathlib.Path("services") / f"{modulo}.py"
        if not ruta.exists():
            continue
        codigo = ruta.read_text(encoding="utf-8")
        if "latidos.registrar(" not in codigo or "latidos.latir(" not in codigo:
            sin_latido.append(modulo)

    assert not sin_latido, (
        f"bucles que main.py arranca y no publican latido: {sin_latido}. "
        "Un bucle invisible que se muere no se distingue de uno que no tiene "
        "trabajo, y nadie se entera hasta que alguien echa de menos el resultado.")


def test_la_ruta_de_salud_no_devuelve_5xx_aunque_falle():
    """Un bucle degradado no puede reiniciar el contenedor."""
    from fastapi.testclient import TestClient

    import main

    r = TestClient(main.app).get("/health/workers")
    assert r.status_code == 200
    assert r.json()["status"] in ("healthy", "degraded", "unknown")
