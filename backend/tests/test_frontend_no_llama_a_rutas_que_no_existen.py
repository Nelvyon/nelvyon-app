"""Ningun boton del producto llama a un endpoint que no existe.

QUE ES UN BOTON MUERTO
----------------------
Una pantalla con un boton que, al pulsarlo, hace una peticion a una ruta que
nadie sirve. El usuario ve un error generico o un spinner que no termina. No hay
traza en el backend —la peticion nunca llega a ningun sitio— y no hay despliegue
rojo. Es indistinguible de un fallo de red.

QUE ENCONTRO ESTA COMPROBACION
-------------------------------
`dashboardApi.storage.upload()` hace `POST /api/v1/storage/upload` con
multipart. El backend expone ocho endpoints de almacenamiento y ninguno se llama
`upload`: el flujo real es `upload-url`, que devuelve una URL prefirmada. La
subida de ficheros desde el panel no podia funcionar.

TRES VECES ME EQUIVOQUE ANTES DE ACERTAR
-----------------------------------------
La primera version dio 483 huerfanas, la segunda 96 y la tercera 3. Los errores:

  1. Contar como «llamada» los prefijos que el codigo concatena con una
     variable —`/api/crm/contacts/` mas el id—.
  2. Mirar solo `app/api` e ignorar `pages/api`, que sirve otras 396 rutas.
  3. Extraer «llamadas del frontend» de TODO `apps/web/src`, incluidas las
     propias implementaciones de API. Las rutas se contaban a si mismas.

Se documenta porque el numero grande daba miedo y era falso: un inventario mal
construido produce panico, y despues desconfianza cuando resulta que no era nada.
"""
from __future__ import annotations

import pathlib
import re

import pytest

RAIZ = pathlib.Path(__file__).resolve().parents[2]
WEB = RAIZ / "apps" / "web" / "src"

#: Llamadas que hoy NO tienen ruta detras, con su motivo. Cada una es un boton
#: muerto o una capacidad anunciada sin implementar, y se declara para que el
#: numero no crezca en silencio.
HUERFANAS_CONOCIDAS: dict[str, str] = {
    # Vacia, y por ahora es lo correcto. Las tres que hubo se resolvieron en vez
    # de heredarse:
    #
    #   `/api/v1/storage/upload`   ayudante muerto que nadie llamaba, retirado.
    #                              El backend expone `upload-url` (prefirmada);
    #                              son dos flujos distintos, no dos nombres.
    #   `/api/integrations/google-analytics`
    #   `/api/integrations/google-search-console`
    #                              NO faltaban: las carpetas reales se llaman
    #                              `ga4/` y `search-console/`, con doce endpoints
    #                              entre las dos. Lo que fallaba era el
    #                              `apiRoutePrefix` del registro de conectores.
    #
    # Se deja el diccionario en vez de borrarlo: la deuda futura se declara aqui,
    # con su motivo, para que el numero no crezca en silencio.
}


def _rutas_servidas() -> set[str]:
    """Todo lo que responde: FastAPI, Next App Router y Next Pages Router."""
    import os
    import sys

    os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test.db")
    sys.path.insert(0, str(RAIZ / "backend"))
    from main import app

    servidas = set(app.openapi().get("paths", {}))
    for sufijo in ("app", "pages"):
        # La ruta publica se cuenta SIEMPRE desde la carpeta del router, nunca
        # desde `src`. La primera version restaba `src` para `pages`, asi que sus
        # 396 rutas quedaban registradas como `/pages/api/...` y no casaban con
        # ninguna llamada: aparecian nueve huerfanas que si estaban servidas.
        base = WEB / sufijo / "api"
        if not base.exists():
            continue
        for f in base.rglob("*.ts*"):
            if sufijo == "app" and f.stem != "route":
                continue
            rel = f.relative_to(WEB / sufijo)
            ruta = "/" + str(rel.parent if sufijo == "app" else
                             rel.with_suffix("")).replace("\\", "/")
            servidas.add(ruta.replace("/index", "") or "/")
    return servidas


def _sin_comentarios(texto: str) -> str:
    """Quita comentarios de linea y de bloque, y NADA mas.

    Hizo falta en cuanto se retiro un ayudante muerto dejando escrito por que:
    el comentario nombraba `/api/v1/storage/upload` entre acentos graves y el
    extractor lo contaba como una llamada. La ruta seguia «rota» eternamente
    porque su propia lapida la mantenia viva.

    Solo se borran las lineas que EMPIEZAN por `//` o `*`, no cualquier `//`
    suelto: hacerlo a lo bruto se comeria el resto de una linea con
    `"https://host/api/x"` dentro y dejaria de ver llamadas reales. Un extractor
    que pierde llamadas es peor que uno que sobra: aprueba sin mirar.
    """
    texto = re.sub(r"/\*.*?\*/", " ", texto, flags=re.S)
    return chr(10).join(l for l in texto.splitlines()
                     if not l.lstrip().startswith(("//", "*")))


def _llamadas_del_cliente() -> set[str]:
    """Solo codigo de cliente: se excluyen las carpetas que IMPLEMENTAN rutas."""
    patron = re.compile(r"""["'`](/api/[A-Za-z0-9/_.\-]+)""")
    fuera = set()
    for f in WEB.rglob("*.ts*"):
        partes = f.relative_to(WEB).parts
        if "api" in partes or "__tests__" in partes:
            continue
        fuera.update(patron.findall(
            _sin_comentarios(f.read_text(encoding="utf-8", errors="replace"))))
    return fuera


def _a_regex(p: str) -> re.Pattern:
    e = re.escape(p)
    e = re.sub(r"\\\{[^}]+\\\}", "[^/]+", e)                       # {param} FastAPI
    e = re.sub(r"\\\[\\\[?\\\.\\\.\\\.[^\]]*\\\]\\\]?", ".+", e)   # [...path] Next
    e = re.sub(r"\\\[[^\]]+\\\]", "[^/]+", e)                      # [param] Next
    return re.compile("^" + e + "$")


def _huerfanas() -> set[str]:
    servidas = _rutas_servidas()
    patrones = [_a_regex(p) for p in servidas]
    bases = {p.rstrip("/") for p in servidas}

    def existe(u: str) -> bool:
        if u in servidas or any(rx.match(u) for rx in patrones):
            return True
        b = u.rstrip("/")
        # Un prefijo cuenta si alguna ruta cuelga de el: el codigo concatena ids.
        return any(x == b or x.startswith(b + "/") for x in bases)

    return {u for u in _llamadas_del_cliente()
            if not existe(u) and not u.startswith(("/api/auth/", "/api/trpc"))}


def test_el_inventario_encuentra_algo_que_mirar():
    """Sin esto, un fallo de extraccion daria cero huerfanas y pareceria bueno."""
    assert len(_llamadas_del_cliente()) >= 300, (
        "se extrajeron muy pocas llamadas del cliente: la comprobacion estaria "
        "pasando sin mirar el producto")
    assert len(_rutas_servidas()) >= 1000, (
        "se encontraron muy pocas rutas servidas: faltaria una de las tres "
        "fuentes (FastAPI, app/api, pages/api) y saldrian huerfanas falsas")


def test_no_aparecen_botones_muertos_nuevos():
    """LA PRUEBA. Cualquier llamada sin ruta que no este declarada, se reporta."""
    nuevas = sorted(_huerfanas() - set(HUERFANAS_CONOCIDAS))
    assert not nuevas, (
        f"el producto llama a rutas que nadie sirve: {nuevas}. El usuario ve un "
        f"error generico o un spinner eterno, y en el backend no queda ninguna "
        f"traza porque la peticion no llega a ningun sitio.")


@pytest.mark.parametrize("ruta,motivo", sorted(HUERFANAS_CONOCIDAS.items()))
def test_las_huerfanas_declaradas_siguen_sin_ruta(ruta, motivo):
    """Si alguien la arregla, esta prueba obliga a quitarla de la lista.

    Una lista de deuda que conserva entradas ya resueltas deja de creerse, y
    entonces tampoco se cree cuando senala algo real.
    """
    assert ruta in _huerfanas(), (
        f"`{ruta}` ya tiene ruta detras: quitala de HUERFANAS_CONOCIDAS "
        f"(motivo registrado: {motivo})")
