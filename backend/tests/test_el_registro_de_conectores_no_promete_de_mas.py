"""Un conector declarado «live» tiene servicio, y su ruta declarada existe.

QUE ENCONTRO
------------
`connectorRegistry.ts` declaraba dos rutas que no existen:

    google-analytics-4      apiRoutePrefix: /api/integrations/google-analytics
    google-search-console   apiRoutePrefix: /api/integrations/google-search-console

Las carpetas reales se llaman `ga4/` y `search-console/`, con SEIS endpoints cada
una. Es decir: los conectores funcionan y el registro apuntaba al sitio
equivocado.

POR QUE IMPORTA SI NADIE LLAMA A ESE PREFIJO
---------------------------------------------
No rompia ninguna pantalla —el campo es metadato, no una llamada— y por eso
llevaba ahi sin que nadie lo notara. Pero el registro es el inventario con el que
se razona sobre el sistema: es lo que se mira para saber que hay conectado. Un
inventario que manda al sitio equivocado hace perder el tiempo a quien confia en
el, y peor, hace concluir «esto no esta implementado» de algo que si lo esta.

La deuda de documentacion se paga en decisiones equivocadas, no en errores.

LAS DOS DIRECCIONES DE LA MENTIRA
----------------------------------
Un registro puede fallar prometiendo de mas (una ruta o un servicio que no
existen) o quedandose corto. Aqui se vigila lo primero, que es lo que engaña:
`status: "live"` sin servicio detras es una capacidad anunciada y no operativa.
"""
from __future__ import annotations

import pathlib
import re

import pytest

RAIZ = pathlib.Path(__file__).resolve().parents[2]
REGISTRO = RAIZ / "apps" / "web" / "src" / "lib" / "os-core" / "connectorRegistry.ts"


def _conectores() -> list[dict[str, str]]:
    """Cada bloque `{ id: ..., }` del registro, con los campos que se vigilan."""
    texto = REGISTRO.read_text(encoding="utf-8")
    fuera = []
    for bloque in re.findall(r"\{\s*\n\s*id:\s*\"([^\"]+)\".*?\n  \}", texto, re.S):
        pass
    # El regex de arriba pierde el cuerpo; se recorre por bloques delimitados.
    for m in re.finditer(r"\{\s*id:\s*\"(?P<id>[^\"]+)\",(?P<cuerpo>.*?)\n  \}", texto, re.S):
        c = {"id": m.group("id")}
        for campo in ("status", "servicePath", "apiRoutePrefix", "name"):
            v = re.search(rf'{campo}:\s*"([^"]+)"', m.group("cuerpo"))
            if v:
                c[campo] = v.group(1)
        fuera.append(c)
    return fuera


def _rutas_de_integraciones() -> set[str]:
    """Los prefijos de integracion que de verdad tienen ficheros detras."""
    fuera = set()
    for router in ("pages", "app"):
        base = RAIZ / "apps" / "web" / "src" / router / "api" / "integrations"
        if base.exists():
            fuera |= {f"/api/integrations/{d.name}" for d in base.iterdir() if d.is_dir()}
    return fuera


def test_el_registro_se_deja_leer():
    """Sin esto, un cambio de formato daria cero conectores y todo pasaria.

    Es el mismo fallo que ya me comi tres veces en el inventario de botones
    muertos: un extractor roto no da error, da una lista vacia, y una lista vacia
    aprueba todas las comprobaciones de golpe.
    """
    conectores = _conectores()
    assert len(conectores) >= 10, (
        f"solo se extrajeron {len(conectores)} conectores del registro: el "
        f"formato cambio y estas pruebas estarian pasando sin mirar nada")
    assert all(c.get("status") for c in conectores), (
        "hay conectores sin `status` extraido: el patron dejo de casar")
    assert len(_rutas_de_integraciones()) >= 5, (
        "no se encontraron las carpetas de rutas de integracion: la prueba de "
        "abajo daria huerfanas falsas")


@pytest.mark.parametrize("conector", _conectores(), ids=lambda c: c["id"])
def test_la_ruta_declarada_por_un_conector_existe(conector):
    """LA PRUEBA. Un `apiRoutePrefix` sin carpeta detras manda al sitio equivocado."""
    prefijo = conector.get("apiRoutePrefix")
    if not prefijo:
        pytest.skip("este conector no declara ruta")
    assert prefijo in _rutas_de_integraciones(), (
        f"`{conector['id']}` declara `{prefijo}` y no existe esa carpeta de "
        f"rutas. O la integracion no esta, o esta con otro nombre y el "
        f"inventario manda al sitio equivocado. Rutas reales: "
        f"{sorted(_rutas_de_integraciones())}")


@pytest.mark.parametrize("conector", [c for c in _conectores() if c.get("status") == "live"],
                         ids=lambda c: c["id"])
def test_un_conector_live_dice_donde_esta_su_servicio(conector):
    """`live` es la afirmacion mas fuerte del registro: no puede callar el fichero."""
    assert conector.get("servicePath"), (
        f"`{conector['id']}` se declara `live` y no dice donde esta su servicio: "
        f"no hay forma de comprobar la afirmacion")


@pytest.mark.parametrize("conector", [c for c in _conectores() if c.get("servicePath")],
                         ids=lambda c: c["id"])
def test_el_servicio_declarado_por_un_conector_existe(conector):
    """LA SEGUNDA PRUEBA, y se aplica a TODOS, no solo a los `live`.

    Empezo mirando solo los `live` y encontro `amazon-ses`, que apuntaba a
    `apps/web/src/lib/email/sesMailer.ts` —inexistente— cuando el cliente real
    es `backend/email/sesClient.ts`. SES funciona: lo que estaba mal era el
    inventario.

    Se amplio a todos los que declaran ruta porque un `stub` que apunta a un
    fichero inexistente miente igual; simplemente miente sobre algo que nadie
    esperaba que funcionara todavia, y por eso duraria mas sin que se note.
    """
    ruta = conector["servicePath"]
    assert (RAIZ / ruta).exists(), (
        f"`{conector['id']}` declara su servicio en `{ruta}` y ese fichero no "
        f"existe: quien busque la implementacion no la encontrara y concluira "
        f"que la integracion no esta hecha")


def test_hay_conectores_que_no_se_declaran_live():
    """EL CONTROL. Si todo fuera `live`, la prueba de arriba no distinguiria nada.

    Un registro donde todo esta `live` no es un registro honesto, es una lista de
    deseos. Que existan `stub` y `planned` es lo que hace creible el `live`.
    """
    estados = {c.get("status") for c in _conectores()}
    assert estados - {"live"}, (
        "todos los conectores se declaran `live`: o es cierto y hay que "
        "comprobarlo de otra forma, o el registro dejo de distinguir")
