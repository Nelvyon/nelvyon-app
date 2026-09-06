"""Lo que entra en el build tiene que disparar un despliegue.

LA AVERIA, QUE HA PASADO DOS VECES
-----------------------------------
Railway solo despliega si el commit toca alguno de los `watchPatterns`. Si algo
que SI entra en el build no esta en esa lista, su commit se marca **SKIPPED** y
produccion se queda atras. En verde. Sin una sola senal roja.

  · Con la migracion 564, un commit que solo anadia un fichero en
    `backend/db/migrations/` quedo SKIPPED mientras el backend desplegaba en
    SUCCESS: dos despliegues verdes y ninguna migracion aplicada.

  · Con `95897a55` —una sonda de salud en `backend/health/`— volvio a pasar.
    `origin/main` y produccion divergieron y solo se noto al comprobar el SHA
    del runtime a mano.

POR QUE SE REPITIO
------------------
La correccion de la primera vez fue anadir el directorio concreto que dolio:
`backend/db/migrations/**`. Es decir, la lista paso a describir SITIOS
RECORDADOS en lugar del criterio. El criterio es «todo lo que entra en el
build», y `apps/web` importa de `backend/` en cientos de sitios.

Es el mismo defecto que este arbol persigue en otras formas: verificar los N
casos de hoy en vez del invariante.

QUE VIGILA ESTA PRUEBA
----------------------
Que TODA raiz de la que el producto importa —y la propia configuracion del
despliegue— este cubierta por algun patron. Un paquete nuevo del que `apps/web`
empiece a importar rompe esto el dia que se importe, no el dia que alguien
compruebe el SHA a mano.

COSTE EXTERNO: 0 EUR. Se lee el arbol.
"""
from __future__ import annotations

import io
import os
import pathlib
import re
import tomllib

RAIZ = pathlib.Path(__file__).resolve().parents[2]
TOML = RAIZ / "railway.toml"
WEB = RAIZ / "apps" / "web" / "src"

#: Ficheros que definen COMO se construye: cambiarlos cambia el artefacto.
CONFIG_DEL_BUILD = ("Dockerfile", "railway.toml", "package.json")


def _patrones() -> list[str]:
    datos = tomllib.loads(TOML.read_text(encoding="utf-8"))
    return list(datos.get("build", {}).get("watchPatterns") or [])


def _cubre(patrones: list[str], ruta: str) -> bool:
    """¿Algun patron cubre esta ruta?

    Se implementa el subconjunto de glob que Railway usa aqui: `x/**` cubre todo
    lo que cuelga de `x/`, y un nombre exacto se cubre a si mismo.
    """
    for p in patrones:
        if p.endswith("/**"):
            if ruta == p[:-3] or ruta.startswith(p[:-3] + "/"):
                return True
        elif p == ruta:
            return True
    return False


def _raices_importadas() -> set[str]:
    """De que directorios de primer nivel importa `apps/web`."""
    fuera: set[str] = set()
    patron = re.compile(r"""from\s+["'](?:\.\./)+([a-zA-Z0-9_-]+)/""")
    for base, dirs, ficheros in os.walk(WEB):
        dirs[:] = [d for d in dirs if d != "node_modules"]
        for f in ficheros:
            if not f.endswith((".ts", ".tsx", ".mjs")):
                continue
            texto = io.open(pathlib.Path(base) / f, encoding="utf-8", errors="replace").read()
            for m in patron.finditer(texto):
                candidato = m.group(1)
                if (RAIZ / candidato).is_dir():
                    fuera.add(candidato)
    return fuera


def test_el_barrido_encuentra_los_patrones():
    """CONTROL POSITIVO. Sin patrones, todo lo de abajo pasaria vacio."""
    patrones = _patrones()
    assert patrones, "no hay watchPatterns en railway.toml; el barrido mira mal"
    assert any(p.startswith("apps/web") for p in patrones), "ni siquiera se vigila apps/web"


def test_el_barrido_ve_de_donde_importa_el_producto():
    """CONTROL POSITIVO. Si dejara de encontrar importaciones, la regla de abajo
    compararia contra un conjunto vacio y pasaria siempre."""
    raices = _raices_importadas()
    assert "backend" in raices, (
        f"no se detecta que apps/web importe de backend/; el barrido mira mal ({raices})"
    )


def test_toda_raiz_que_entra_en_el_build_dispara_despliegue():
    """LA REGLA.

    Una raiz de la que el producto importa y que no dispara despliegue produce
    commits SKIPPED: produccion se queda atras y no hay ninguna senal roja.
    """
    patrones = _patrones()
    sin_vigilar = sorted(r for r in _raices_importadas() if not _cubre(patrones, r))
    assert not sin_vigilar, (
        "el producto importa de estas raices y ningun watchPattern las cubre, asi "
        "que un commit que solo las toque quedara SKIPPED y produccion se quedara "
        f"atras EN VERDE: {sin_vigilar}"
    )


def test_la_configuracion_del_build_tambien_dispara_despliegue():
    """Cambiar el Dockerfile o la configuracion cambia el artefacto.

    Que no dispare despliegue significa construir con una receta y servir otra.
    """
    patrones = _patrones()
    sin_vigilar = [f for f in CONFIG_DEL_BUILD if not _cubre(patrones, f)]
    assert not sin_vigilar, (
        f"estos ficheros definen como se construye y no disparan despliegue: {sin_vigilar}"
    )


def test_el_control_negativo_detecta_una_raiz_descubierta():
    """Sin esto, un `_cubre` demasiado generoso convertiria esta bateria en un
    guardian que no mira — que es peor que ninguno, porque ademas tranquiliza."""
    assert not _cubre(["apps/web/**"], "backend")
    assert not _cubre(["apps/web/**"], "packages")
    assert _cubre(["backend/**"], "backend")
    assert _cubre(["backend/db/migrations/**"], "backend/db/migrations")
    # Un patron de subcarpeta NO cubre la raiz: es exactamente el fallo que dejo
    # `backend/health/` fuera teniendo `backend/db/migrations/**` en la lista.
    assert not _cubre(["backend/db/migrations/**"], "backend")
