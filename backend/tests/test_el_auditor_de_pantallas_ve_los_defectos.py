"""BLOQUE 5 · el auditor de pantallas tiene que seguir viendo.

Este fichero existe por lo que paso al escribir el auditor. La primera pasada
dio 192 hallazgos y **tres de las siete reglas tenian falsos positivos**: una
casaba dentro de un comentario, otra miraba solo la etiqueta `<table>` cuando el
contenedor con scroll esta en el `div` padre, y la tercera miraba solo la linea
del `href` cuando el `onClick` cae tres lineas mas abajo. Afinandolas, 192 → 125.

Afilar una regla para que deje de dar falsos positivos es exactamente el mismo
gesto que cegarla. La diferencia no se ve leyendo el codigo: se ve pasandole un
defecto de verdad y comprobando que lo sigue cazando.

Por eso cada regla tiene aqui las dos mitades:

  - **control positivo**: un defecto real. Si el auditor deja de verlo, la regla
    murio y este fichero lo dice.
  - **control negativo**: el patron legitimo que la motivo. Si vuelve a marcarse,
    el ruido ha vuelto.

Sin la mitad positiva, un auditor que no encontrara nada nunca daria verde
perfecto — que es el resultado mas facil de conseguir y el que menos vale.
"""

from __future__ import annotations

import io

import pytest

from backend.db.certificacion.auditoria_de_pantallas import REGLAS, auditar, pantallas
from backend.db.certificacion.texto_fuente import sin_comentarios


def _codigos(tmp_path, fuente: str) -> set[str]:
    f = tmp_path / "page.tsx"
    io.open(f, "w", encoding="utf-8", newline="\n").write(fuente)
    return {c for c, _g, _l, _frag in auditar(f)}


# ── controles POSITIVOS: el defecto real que cada regla debe seguir viendo ────

POSITIVOS: list[tuple[str, str]] = [
    ("RELLENO", '<p>lorem ipsum dolor sit amet</p>'),
    ("ENLACE_MUERTO", '<a href="#">Ver informe</a>'),
    ("SIN_ALT", '<img src="/logo.png" width={200} height={80} />'),
    ("ALT_INUTIL", '<img src="/a.png" alt="imagen" />'),
    ("COLOR_SUELTO", '<div style={{ color: "#ff0000" }}>x</div>'),
    ("TABLA_SIN_SCROLL", '<div className="rounded"><table className="min-w-full" /></div>'),
    ("ANCHO_FIJO", '<div style={{ minWidth: "1200px" }}>x</div>'),
]


@pytest.mark.parametrize("codigo,fuente", POSITIVOS, ids=[c for c, _ in POSITIVOS])
def test_el_auditor_ve_el_defecto_real(tmp_path, codigo, fuente):
    # Si esto falla, la regla se afilo hasta quedarse ciega.
    assert codigo in _codigos(tmp_path, f"export default function P() {{ return ({fuente}); }}")


def test_todas_las_reglas_tienen_control_positivo():
    # Una regla sin control positivo puede estar muerta y nadie se entera.
    # Anadir una regla obliga a demostrar que caza algo.
    assert {c for c, _ in POSITIVOS} == {c for c, _g, _p, _q in REGLAS}


# ── controles NEGATIVOS: lo legitimo que motivo cada afilado ──────────────────

NEGATIVOS: list[tuple[str, str, str]] = [
    (
        "SIN_ALT",
        "un comentario que habla de <img> no es un <img>",
        '{/* <img src="x" /> aqui explicariamos por que */}<p>hola</p>',
    ),
    (
        "ENLACE_MUERTO",
        "el manejador esta en otra linea del mismo elemento",
        '<Link\n  className="dropdown-item"\n  href="#"\n  onClick={(e) => { e.preventDefault(); ver(); }}\n>Ver</Link>',
    ),
    (
        "ENLACE_MUERTO",
        "un ancla de salto al contenido",
        '<a href="#" className="skip-link">Saltar al contenido</a>',
    ),
    (
        "TABLA_SIN_SCROLL",
        "estilo en linea de JSX: overflowX va en camelCase",
        '<div style={{ overflowX: "auto" }}>\n  <table style={{ minWidth: "760px" }} />\n</div>',
    ),
    (
        "TABLA_SIN_SCROLL",
        "overflow-y-auto tambien desplaza en X por especificacion CSS",
        '<div className="overflow-y-auto">\n  <table className="w-full" />\n</div>',
    ),
    (
        "TABLA_SIN_SCROLL",
        "envoltorio de Bootstrap: el arbol usa las dos convenciones",
        '<div className="table-responsive">\n  <table className="table table-responsive-lg" />\n</div>',
    ),
    (
        "TABLA_SIN_SCROLL",
        "el contenedor con scroll esta en el div padre",
        '<div className="overflow-x-auto rounded-xl border">\n  <table className="min-w-full text-sm" />\n</div>',
    ),
]


@pytest.mark.parametrize(
    "codigo,por_que,fuente", NEGATIVOS, ids=[f"{c}:{p}" for c, p, _ in NEGATIVOS]
)
def test_el_auditor_no_marca_lo_legitimo(tmp_path, codigo, por_que, fuente):
    assert codigo not in _codigos(
        tmp_path, f"export default function P() {{ return (<>{fuente}</>); }}"
    ), por_que


# ── el escaner de comentarios ────────────────────────────────────────────────


def test_una_url_no_es_un_comentario():
    # `//` dentro de una cadena abre un comentario para una regex ingenua, y
    # borrarlo se lleva por delante la mitad de los `href` del arbol.
    assert 'href="https://ejemplo.test/a"' in sin_comentarios('href="https://ejemplo.test/a" // nota')


def test_blanquear_no_mueve_las_lineas():
    # Los numeros de linea que reporta el auditor tienen que seguir apuntando a
    # la linea real del fichero.
    fuente = 'const a = 1;\n{/*\n  prosa\n*/}\nconst b = 2;\n'
    limpio = sin_comentarios(fuente)
    assert len(limpio) == len(fuente)
    assert limpio.count("\n") == fuente.count("\n")
    assert "prosa" not in limpio


def test_el_barrido_tiene_suelo():
    # Cero hallazgos sobre cero pantallas es el verde mas vacio posible. Ya paso
    # una vez en el Bloque 3 y no vuelve a pasar en silencio.
    assert len(pantallas()) >= 900


def test_el_sufijo_de_bootstrap_no_cuenta_como_contenedor(tmp_path):
    """`table-responsive-lg` en el propio `<table>` NO crea scroll.

    El tema w3crm la redefine como `min-width: 60.9375rem !important`. Puesta
    en la tabla le fija 975px de ancho y nada mas, asi que a 375px la pagina se
    desborda. Aceptarla como contenedor convertiria la regla en una firma que
    da verde justo en el caso que deberia cazar.
    """
    fuente = (
        "export default function P() { return ("
        '<div className="card"><table className="table table-responsive-lg" /></div>'
        "); }"
    )
    assert "TABLA_SIN_SCROLL" in _codigos(tmp_path, fuente)
