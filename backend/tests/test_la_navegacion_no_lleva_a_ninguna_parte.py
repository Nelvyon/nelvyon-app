"""BLOQUE 5 · ningun enlace interno lleva a un 404.

`href="#"` es un enlace que **confiesa** que no va a ninguna parte, y el auditor
de pantallas lo caza. El caso peor es el que **parece** correcto:
`href="/dashboard"` se lee bien, sobrevive a cualquier revision por encima, y le
da un 404 al cliente porque la ruta se llama `/saas/dashboard`. Habia seis asi
en el arbol, dos de ellos en la cabecera de la aplicacion y en el formulario de
acceso, que son de los sitios mas transitados que hay.

Este fichero cuida las dos mitades del auditor, porque las dos se pueden romper
en direcciones opuestas:

  - Si la **tabla de rutas** se queda corta, el auditor acusa enlaces sanos. Ya
    paso al escribirlo: `(marketing)/page.tsx` sirve `/`, la derivacion no
    emitia la ruta base al entrar en un grupo, y salieron diecinueve enlaces al
    inicio marcados como rotos. Corregirlos habria sido romper diecinueve
    enlaces que funcionaban.
  - Si la tabla se pasa de ancha —o el barrido salta casos «dificiles»— el
    auditor da cero y no mira nada. Tambien paso: al saltar las plantillas con
    interpolacion se escondio un `/os/entregables${filtro}` que habia que
    resolver por prefijo.

De ahi que aqui haya control positivo y negativo para cada regla del App Router.
"""

from __future__ import annotations

import pytest

from backend.db.certificacion import auditoria_de_rutas as aud


@pytest.fixture(scope="module")
def rutas() -> list[str]:
    return aud.rutas()


def test_la_tabla_de_rutas_tiene_suelo(rutas):
    # Cero enlaces rotos sobre cero rutas es el verde mas vacio posible, y ya
    # paso una vez en el Bloque 3 con la raiz mal apuntada.
    assert len(rutas) >= 400, f"solo {len(rutas)} rutas: la raiz apunta mal"


def test_la_portada_existe(rutas):
    # Vive en `(marketing)/page.tsx`. El grupo no aparece en la URL, asi que la
    # pagina del grupo sirve la ruta base. Sin esto el auditor daba diecinueve
    # falsos positivos contra el inicio.
    assert "/" in rutas


def test_los_grupos_de_ruta_no_aparecen_en_la_url(rutas):
    con_parentesis = [r for r in rutas if "(" in r or ")" in r]
    assert not con_parentesis, f"grupos filtrados a la URL: {con_parentesis[:5]}"


def test_las_rutas_de_api_cuentan(rutas):
    # Una carpeta con `route.ts` sirve aunque no tenga pagina. Ignorarlas
    # marcaria como roto cualquier enlace a la API.
    assert any(r.startswith("/api/") for r in rutas)


@pytest.mark.parametrize(
    "destino",
    [
        "/",
        "/saas/dashboard",
        "/auth/forgot-password",
        "/saas/partner",
        "/saas/white-label",
        "/app/projects/new",
    ],
)
def test_los_destinos_corregidos_existen_de_verdad(rutas, destino):
    # Los seis enlaces rotos se redirigieron AQUI. Si alguno de estos destinos
    # desaparece, los enlaces vuelven a estar rotos y hay que enterarse.
    patrones = [aud._a_expresion(r) for r in rutas]
    assert any(p.match(destino) for p in patrones), f"{destino} ya no se sirve"


def test_un_segmento_dinamico_casa_con_cualquier_valor():
    # Sin esto, cada enlace a una ficha concreta saldria roto.
    patron = aud._a_expresion("/saas/clientes/[id]")
    assert patron.match("/saas/clientes/42")
    assert patron.match("/saas/clientes/lo-que-sea")
    assert not patron.match("/saas/clientes")
    assert not patron.match("/saas/clientes/42/editar")


def test_un_catch_all_se_traga_el_resto():
    patron = aud._a_expresion("/docs/[...slug]")
    assert patron.match("/docs/a")
    assert patron.match("/docs/a/b/c")
    assert not patron.match("/docs")


def test_un_catch_all_opcional_casa_tambien_con_nada():
    patron = aud._a_expresion("/docs/[[...slug]]")
    assert patron.match("/docs")
    assert patron.match("/docs/a/b")


def test_no_hay_ni_un_enlace_interno_roto():
    roto = aud.barrido()
    detalle = [
        f"{f}:{l} -> {d}" for f, hs in sorted(roto.items()) for l, d in hs
    ]
    assert not detalle, f"{len(detalle)} enlaces internos a 404: {detalle[:10]}"


def test_el_barrido_mira_ficheros_de_verdad():
    # El control positivo del barrido: si dejara de leer el arbol daria cero
    # rotos, que es identico a «todo perfecto» mirando solo el numero.
    assert len(aud._fuentes()) >= 500
