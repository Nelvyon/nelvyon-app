"""BLOQUE 5 · el contraste de los tokens se calcula, no se opina.

axe-core midio **819 violaciones de `color-contrast` en 64 rutas**, y la
combinacion mas repetida era el azul de marca: `#0084ff` da 3,66:1 sobre blanco
cuando WCAG AA pide 4,5:1 para texto normal. Fallaban las dos direcciones a la
vez —el azul como texto sobre blanco, y el texto blanco sobre los botones
azules— porque la razon de contraste es simetrica.

Ese barrido tarda minutos y necesita un servidor construido. Este fichero
comprueba lo mismo en milisegundos sobre los tokens, que es donde vive la causa,
y por eso puede correr en cada puerta.

Lo importante es que mira **los dos temas**. Bajar la luminosidad arregla el
claro y estropea el oscuro: sobre la tarjeta oscura `#0b1428` el azul nuevo cae
a 4,06:1, por debajo del minimo. Un guardian que solo mirase el tema claro
habria dado verde a medio arreglo, que es la forma mas comoda de romper la mitad
del producto sin enterarse.

La formula es la de WCAG 2.1 (relative luminance + ratio). No hay nada que
creerse: se calcula.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

CSS = (
    Path(__file__).resolve().parents[2]
    / "apps" / "web" / "src" / "app" / "globals.css"
)

MINIMO_AA = 4.5          # texto normal
MINIMO_AA_GRANDE = 3.0   # texto grande o elementos de interfaz


def _a_rgb(hexadecimal: str) -> tuple[int, int, int]:
    h = hexadecimal.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _canal(c: int) -> float:
    v = c / 255
    return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4


def luminancia(hexadecimal: str) -> float:
    r, g, b = (_canal(x) for x in _a_rgb(hexadecimal))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contraste(a: str, b: str) -> float:
    la, lb = luminancia(a), luminancia(b)
    alto, bajo = max(la, lb), min(la, lb)
    return (alto + 0.05) / (bajo + 0.05)


def _bloque(nombre: str) -> str:
    """Devuelve el cuerpo del selector pedido (`:root`, `.dark`...)."""
    texto = CSS.read_text(encoding="utf-8")
    i = texto.index(nombre + " {")
    j = texto.index("\n}", i)
    return texto[i:j]


def token(bloque: str, nombre: str) -> str:
    m = re.search(rf"{re.escape(nombre)}:\s*(#[0-9a-fA-F]{{3,8}})\s*;", bloque)
    assert m, f"no se encuentra {nombre} en el bloque"
    return m.group(1)


# ── control de la propia formula ─────────────────────────────────────────────


def test_la_formula_da_los_valores_conocidos():
    # Sin esto, una formula rota daria numeros altos para todo y el fichero
    # entero se volveria verde sin medir nada.
    assert contraste("#000000", "#ffffff") == pytest.approx(21.0, abs=0.01)
    assert contraste("#ffffff", "#ffffff") == pytest.approx(1.0, abs=0.01)
    # El valor que reporto axe para el azul original, reproducido aqui.
    assert contraste("#0084ff", "#ffffff") == pytest.approx(3.66, abs=0.02)


# ── tema claro ───────────────────────────────────────────────────────────────


@pytest.fixture(scope="module")
def claro() -> str:
    return _bloque(":root")


@pytest.fixture(scope="module")
def oscuro() -> str:
    return _bloque(".dark")


def test_el_texto_normal_sobre_el_fondo_claro_cumple(claro):
    fondo = token(claro, "--background")
    for nombre in ("--foreground", "--card-foreground", "--muted-foreground"):
        c = contraste(token(claro, nombre), fondo)
        assert c >= MINIMO_AA, f"{nombre}: {c:.2f}:1 sobre {fondo}, hace falta {MINIMO_AA}"


def test_el_texto_sobre_el_boton_primario_claro_cumple(claro):
    # Es el caso que mas violaciones producia: texto blanco sobre azul de marca.
    c = contraste(token(claro, "--primary-foreground"), token(claro, "--primary"))
    assert c >= MINIMO_AA, f"texto sobre primario: {c:.2f}:1"


def test_el_primario_claro_vale_tambien_como_texto_sobre_el_fondo(claro):
    # Un enlace en color de marca sobre fondo blanco es texto normal.
    c = contraste(token(claro, "--primary"), token(claro, "--background"))
    assert c >= MINIMO_AA, f"primario como texto: {c:.2f}:1"


# ── tema oscuro: la otra mitad que un arreglo a medias rompe ────────────────


def test_el_texto_normal_sobre_el_fondo_oscuro_cumple(oscuro):
    fondo = token(oscuro, "--background")
    for nombre in ("--foreground", "--card-foreground"):
        c = contraste(token(oscuro, nombre), fondo)
        assert c >= MINIMO_AA, f"{nombre}: {c:.2f}:1 sobre {fondo}"


def test_el_primario_oscuro_sigue_cumpliendo_sobre_la_tarjeta(oscuro):
    """El que impide arreglar el claro rompiendo el oscuro.

    Con el azul del tema claro (`#0075e2`) esta razon cae a 4,06:1 sobre
    `#0b1428` y esta prueba se pone roja. Es exactamente su trabajo.
    """
    tarjeta = token(oscuro, "--card")
    c = contraste(token(oscuro, "--primary"), tarjeta)
    assert c >= MINIMO_AA, f"primario oscuro sobre tarjeta: {c:.2f}:1 sobre {tarjeta}"


def test_el_texto_sobre_el_boton_primario_oscuro_cumple(oscuro):
    c = contraste(token(oscuro, "--primary-foreground"), token(oscuro, "--primary"))
    assert c >= MINIMO_AA_GRANDE, f"texto sobre primario oscuro: {c:.2f}:1"


def test_los_dos_temas_definen_su_propio_primario(claro, oscuro):
    # Si volvieran a ser el mismo valor, uno de los dos estaria incumpliendo:
    # ningun azul cumple a la vez sobre blanco y sobre `#0b1428`.
    assert token(claro, "--primary") != token(oscuro, "--primary"), (
        "los dos temas comparten `--primary`: uno de los dos incumple, porque "
        "no existe un azul que cumpla sobre blanco y sobre la tarjeta oscura"
    )
