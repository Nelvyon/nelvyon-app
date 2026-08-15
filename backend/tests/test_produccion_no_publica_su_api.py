"""Produccion no publica su propia documentacion, y el entorno se declara bien.

EL FALLO QUE ESTO IMPIDE
------------------------
En produccion respondian 200 las tres rutas:

    GET /docs          200
    GET /redoc         200
    GET /openapi.json  200

Dos causas encadenadas.

La primera, de configuracion: el servicio corria con `ENVIRONMENT=staging`, asi
que `IS_PRODUCTION` era falso y el cierre no llegaba a activarse. Eso apagaba
ademas el saneado de los errores 5xx, que devolvian detalle interno.

La segunda, de codigo, y la que este test cubre: aunque `IS_PRODUCTION` hubiera
sido verdadero, solo se anulaban `docs_url` y `redoc_url`. `openapi_url`
conservaba su valor por defecto, de modo que el esquema completo del API —cada
ruta, cada parametro, cada modelo— se seguia sirviendo en `/openapi.json`. Las
paginas quedaban cerradas y el inventario abierto.

Por eso el test comprueba las TRES rutas: la version anterior pasaba con dos.

QUE MAS SE VIGILA AQUI
----------------------
Que `STAGING_CONFIG` no vuelva a declarar garantias que nadie implementa.
Declaraba `email_sandbox`, `stripe_mode` y `rate_limit_multiplier: 3` y las
imprimia al arrancar sin que ningun consumidor las leyera; ese `3x` inexistente
llego a falsear el calculo de margen durante una certificacion.

Y que la lista de puntos donde `ENVIRONMENT` cambia el comportamiento se
mantenga declarada: si aparece uno nuevo sin revisar, este test lo dice, porque
cambiar de entorno debe ser una decision con consecuencias conocidas.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parent.parent
REPO = RAIZ.parent

#: Las tres rutas que publican la superficie del API. Cerrar dos no es cerrar.
RUTAS_DE_DOCUMENTACION = ("/docs", "/redoc", "/openapi.json")


def _arranca_con(entorno: str) -> dict:
    """Importa la app con `ENVIRONMENT=<entorno>` y devuelve lo observable.

    En subproceso a proposito: `main` resuelve el entorno al importarse, asi que
    releerlo en el mismo proceso dejaria el modulo contaminado para los demas
    tests. Esa clase de fuga entre ficheros ya costo una intermitencia en la
    suite de TypeScript; no se repite aqui.
    """
    guion = (
        "import json\n"
        "from fastapi.testclient import TestClient\n"
        "from fastapi import HTTPException\n"
        "import main\n"
        "cliente = TestClient(main.app, raise_server_exceptions=False)\n"
        "@main.app.get('/__revienta_para_el_test')\n"
        "def _revienta():\n"
        "    raise HTTPException(status_code=500, detail='sqlalchemy: File \"/app/x.py\", line 3')\n"
        "codigos = {r: cliente.get(r).status_code for r in %r}\n"
        "r500 = cliente.get('/__revienta_para_el_test')\n"
        "print('__RESULTADO__' + json.dumps({\n"
        "    'es_produccion': main.IS_PRODUCTION,\n"
        "    'entorno': main.ENVIRONMENT,\n"
        "    'openapi_url': main.app.openapi_url,\n"
        "    'docs_url': main.app.docs_url,\n"
        "    'redoc_url': main.app.redoc_url,\n"
        "    'codigos': codigos,\n"
        "    'detalle_500': r500.json().get('detail'),\n"
        "}))\n"
    ) % (RUTAS_DE_DOCUMENTACION,)

    env = dict(os.environ)
    env["ENVIRONMENT"] = entorno
    env.setdefault("PYTHONPATH", str(RAIZ))
    proc = subprocess.run(
        [sys.executable, "-c", guion],
        cwd=str(RAIZ),
        env=env,
        capture_output=True,
        text=True,
        timeout=300,
    )
    marca = "__RESULTADO__"
    if marca not in proc.stdout:
        pytest.fail(f"la app no arranco con ENVIRONMENT={entorno}:\n{proc.stdout[-2000:]}\n{proc.stderr[-2000:]}")
    return json.loads(proc.stdout.split(marca, 1)[1].splitlines()[0])


@pytest.fixture(scope="module")
def en_produccion() -> dict:
    return _arranca_con("production")


@pytest.fixture(scope="module")
def en_staging() -> dict:
    return _arranca_con("staging")


def test_produccion_se_reconoce_como_produccion(en_produccion):
    """Sin esto, todo lo demas de este fichero es vacio."""
    assert en_produccion["es_produccion"] is True
    assert en_produccion["entorno"] == "production"


@pytest.mark.parametrize("ruta", RUTAS_DE_DOCUMENTACION)
def test_produccion_no_sirve_ninguna_ruta_de_documentacion(en_produccion, ruta):
    """El fallo exacto: `/openapi.json` seguia publicando el esquema entero."""
    codigo = en_produccion["codigos"][ruta]
    assert codigo == 404, (
        f"{ruta} responde {codigo} en produccion; debe estar cerrada. "
        "Cerrar /docs y /redoc no basta: el esquema se sirve igual por openapi_url."
    )


def test_produccion_no_deja_montado_el_esquema(en_produccion):
    """La causa, no solo el sintoma: sin `openapi_url` no hay que publicar."""
    assert en_produccion["openapi_url"] is None
    assert en_produccion["docs_url"] is None
    assert en_produccion["redoc_url"] is None


def test_staging_conserva_la_documentacion(en_staging):
    """Control negativo. Si esto fallara, el guard estaria cerrando de mas.

    Staging existe para poder mirar el API; cerrarle la documentacion seria una
    regresion, no una mejora de seguridad.
    """
    assert en_staging["es_produccion"] is False
    assert en_staging["openapi_url"] == "/openapi.json"
    for ruta in RUTAS_DE_DOCUMENTACION:
        assert en_staging["codigos"][ruta] == 200, f"{ruta} deberia servirse en staging"


def test_produccion_sanea_el_detalle_de_los_500(en_produccion):
    """Un 500 no puede devolver rastro interno: ni SQL, ni rutas, ni modulos."""
    detalle = en_produccion["detalle_500"]
    assert detalle == "An error occurred", f"detalle sin sanear en produccion: {detalle!r}"
    for rastro in ("sqlalchemy", "/app/", "line ", ".py"):
        assert rastro not in str(detalle).lower()


def test_staging_conserva_el_detalle(en_staging):
    """Control negativo del saneado: en staging el detalle sirve para depurar."""
    assert "sqlalchemy" in str(en_staging["detalle_500"]).lower()


# ── garantias que nadie implementa ───────────────────────────────────────────

def test_staging_config_no_declara_lo_que_no_aplica():
    """`STAGING_CONFIG` solo puede prometer lo que algun consumidor lee.

    Declaraba `email_sandbox`, `stripe_mode`, `rate_limit_multiplier` y otras
    seis, las imprimia al arrancar y no las leia nadie.
    """
    sys.path.insert(0, str(RAIZ))
    try:
        from core.staging import STAGING_CONFIG
    finally:
        sys.path.pop(0)

    fuentes = "\n".join(
        f.read_text(encoding="utf-8", errors="replace")
        for f in RAIZ.rglob("*.py")
        if "tests" not in f.parts and "staging.py" != f.name and "node_modules" not in f.parts
    )
    sin_consumidor = [k for k in STAGING_CONFIG if k not in fuentes]
    assert not sin_consumidor, (
        f"claves de STAGING_CONFIG que nadie consume: {sin_consumidor}. "
        "Una garantia declarada y no implementada es peor que no declararla."
    )


#: Ficheros donde `ENVIRONMENT` decide algo. Cada uno se reviso al pasar
#: produccion de `staging` a `production`; solo dos cambian comportamiento
#: observable (documentacion y saneado de 5xx, ambos en `main.py`). El resto
#: trata `staging` y `production` igual, o solo distingue `test`.
CONSUMIDORES_DECLARADOS = {
    "core/config.py",
    "core/health_monitor.py",
    "core/job_queue.py",
    "core/observability.py",
    "core/rate_limiter.py",
    "core/staging.py",
    "lambda_handler.py",
    "main.py",
    "middleware/anti_scraping.py",
    "middleware/rate_limit.py",
    "middlewares/error_handler.py",
    "middlewares/rate_limiter.py",
    "middlewares/security.py",
    "routers/monitoring.py",
    "routers/system_readiness.py",
    "scripts/seed_demo_abcd.py",
    "services/conversation_realtime.py",
    "services/mock_data.py",
}

_USO = re.compile(r"""["']ENVIRONMENT["']""")


def test_el_inventario_de_consumidores_de_environment_esta_declarado():
    """Un punto de conmutacion nuevo y sin revisar es como se cuela el proximo.

    Cambiar de entorno solo es seguro si se sabe TODO lo que cambia. Este test
    obliga a que aparecer en la lista sea un acto consciente.
    """
    encontrados = set()
    for f in RAIZ.rglob("*.py"):
        if "tests" in f.parts or "node_modules" in f.parts or "alembic" in f.parts:
            continue
        if _USO.search(f.read_text(encoding="utf-8", errors="replace")):
            encontrados.add(f.relative_to(RAIZ).as_posix())

    nuevos = sorted(encontrados - CONSUMIDORES_DECLARADOS)
    desaparecidos = sorted(CONSUMIDORES_DECLARADOS - encontrados)
    assert not nuevos and not desaparecidos, (
        (f"consumidores NUEVOS de ENVIRONMENT sin revisar: {nuevos}\n" if nuevos else "")
        + (f"declarados que ya no existen: {desaparecidos}\n" if desaparecidos else "")
        + "Revisa que el cambio staging->production no altere pagos, correo, "
          "webhooks, jobs ni integraciones, y actualiza la lista."
    )


def test_el_barrido_de_consumidores_no_esta_vacio():
    """Control positivo: un glob roto daria verde con cero ficheros."""
    assert len(CONSUMIDORES_DECLARADOS) > 10
    assert (RAIZ / "main.py").exists()
