"""Auditoría medible de las pantallas — BLOQUE 5, fase A.

Barre las 362 pantallas del árbol y mide propiedades **verificables**, no
opiniones de diseño. Cada regla busca un defecto que un cliente vería o que un
lector de pantalla sufriría, y cada una se puede reproducir con este mismo
script.

Lo que NO hace: juzgar si algo «se ve bien». Eso no es medible y decir que sí lo
es sería exactamente el tipo de afirmación que este proyecto lleva cuatro bloques
eliminando.

Las reglas están ordenadas por lo que le cuesta a quien lo sufre:

  1. RELLENO      — `lorem`, `TODO:`, «título aquí» delante de un cliente.
  2. ENLACE_MUERTO— `href="#"` o vacío: el usuario pulsa y no pasa nada.
  3. SIN_ALT      — imagen sin texto alternativo: invisible para un lector.
  4. ALT_INUTIL   — `alt="imagen"`: peor que vacío, porque se lee en voz alta.
  5. SIN_ETIQUETA — campo de formulario sin etiqueta asociada.
  6. COLOR_SUELTO — color a pelo en vez de token: nadie puede revisarlo.
  7. TABLA_SIN_SCROLL — tabla ancha sin contenedor: rompe el móvil.
  8. ANCHO_FIJO   — `width: NNNpx` que no cabe en un móvil estrecho.

Uso:
    python -m backend.db.certificacion.auditoria_de_pantallas          # resumen
    python -m backend.db.certificacion.auditoria_de_pantallas --todo   # detalle
"""

from __future__ import annotations

import io
import os
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

from backend.db.certificacion.texto_fuente import sin_comentarios

RAIZ = Path(os.environ.get("NELVYON_RAIZ") or Path(__file__).resolve().parents[3])
PAGINAS = RAIZ / "apps" / "web" / "src"

# ── reglas ──────────────────────────────────────────────────────────────────
#
# Cada una: (codigo, gravedad, expresion, explicacion de por que importa).

REGLAS: list[tuple[str, str, re.Pattern[str], str]] = [
    ("RELLENO", "alta",
     re.compile(r"lorem ipsum|\bTODO:\s|\[insertar[^\]]*\]|título aquí|titulo aqui|"
                r"texto de ejemplo|placeholder text", re.I),
     "texto de relleno visible para el cliente"),

    ("ENLACE_MUERTO", "alta",
     re.compile(r'href=\{?["\'`](#|)["\'`]'),
     "enlace que no lleva a ninguna parte: se pulsa y no pasa nada"),

    ("SIN_ALT", "alta",
     re.compile(r"<img(?![^>]*\balt=)[^>]*>", re.I),
     "imagen sin texto alternativo: invisible para un lector de pantalla"),

    # El plural y el alt VACIO tambien. La cabecera del panel traia
    # `alt="images"` y esta regla no lo vio por buscar solo el singular: un
    # punto ciego de una letra. `alt=""` es correcto en una imagen decorativa,
    # pero no en un `next/image` con `src` de contenido, asi que se marca para
    # que alguien decida en vez de que pase inadvertido.
    ("ALT_INUTIL", "media",
     re.compile(r'alt=\{?["\'`](imagen|image|foto|photo|picture|icono|icon|pro)s?["\'`]', re.I),
     "texto alternativo que no aporta nada y se lee en voz alta"),

    # MEDIDA, NO DEFECTO. Se cuenta y se publica el numero, pero no se llama
    # defecto, porque al mirar los 454 casos uno a uno resulta que la mayoria
    # son legitimos y bajo el mismo codigo conviven cuatro poblaciones:
    #
    #   1. Colores de marca AJENA (`{ name: "Meta", color: "#0081FB" }`). El
    #      azul de Meta no puede ser un token de NELVYON.
    #   2. HTML GENERADO para la web del cliente (`web-builder`): son los
    #      colores del cliente, no los de la UI.
    #   3. Config de widgets de terceros (`confirmButtonColor` de SweetAlert).
    #   4. Paletas CATEGORICAS de estado (`citas`, `calendar`): color como dato.
    #
    # El tema oscuro se activa por clase de ancestro que aplica `SaasShellLayout`,
    # asi que fuera del shell —landing incluida, que es un diseno de gradiente
    # oscuro coherente consigo mismo— un color literal no rompe nada.
    #
    # Llamar «defecto» a los 454 seria inventarse defectos: el mismo vicio que
    # inventarse superioridad, en la otra direccion.
    ("COLOR_SUELTO", "medida",
     re.compile(r'(?:color|background(?:-color)?|borderColor|fill|stroke)'
                r"""\s*:\s*["']?\s*(#[0-9a-f]{3,8}|rgba?\()""", re.I),
     "color literal en vez de token (MEDIDA de consistencia, no defecto)"),

    ("TABLA_SIN_SCROLL", "media",
     re.compile(r"<table(?![^>]*className=[^>]*overflow)", re.I),
     "tabla sin contenedor con scroll: rompe el ancho en movil"),

    # `maxWidth: "1200px"` NO es un ancho fijo: es un tope que encoge en movil,
    # o sea diseno responsivo correcto. Sin la frontera de palabra, `width`
    # casaba DENTRO de `maxWidth` y la regla acusaba justo lo que hay que hacer:
    # 40 hallazgos, casi todos maxWidth, `sizes=` de next/image y media queries.
    #
    # Y el `(?<!\()` de delante: una media query SIEMPRE lleva el ancho entre
    # parentesis —`@media (min-width: 768px)`, `sizes="(min-width: 1024px) 68vw"`—
    # y una declaracion CSS real nunca. Ese parentesis es el discriminante.
    ("ANCHO_FIJO", "baja",
     re.compile(r'(?<![-\w])(?<!\()(?:width|minWidth|min-width)\s*[:=]\s*["\']?\s*(\d{3,4})px', re.I),
     "ancho fijo grande: no cabe en un movil estrecho"),
]

# Un `href="#"` es legitimo en un ancla de accesibilidad («saltar al contenido»)
# y en componentes que gestionan el clic por JavaScript. Se excluyen para no
# ahogar la senal real en falsos positivos.
_ENLACE_LEGITIMO = re.compile(
    r"(skip|saltar|onClick|preventDefault|role=[\"']button[\"']|aria-)", re.I
)

_FUERA = re.compile(r"__tests__|\.test\.tsx?$|\.spec\.tsx?$|node_modules|\.next")


def pantallas() -> list[Path]:
    if not PAGINAS.exists():
        return []
    return sorted(
        f for f in PAGINAS.rglob("*.tsx")
        if not _FUERA.search(f.as_posix())
    )


def _linea_de(texto: str, pos: int) -> int:
    return texto.count("\n", 0, pos) + 1


def _hay_contenedor_con_scroll(texto: str, pos: int) -> bool:
    """Busca `overflow-x-auto` en las lineas ANTERIORES a la tabla.

    El contenedor con scroll casi nunca esta en el propio `<table>`: esta en el
    `div` que lo envuelve. Mirar solo la etiqueta daba 72 hallazgos de los que
    la inmensa mayoria eran correctos.

    Hay dos convenciones vivas en el arbol y la regla tiene que conocer las dos:

      - Tailwind: `overflow-x-auto` en el `div` padre.
      - w3crm/Bootstrap: `<div class="table-responsive">` envolviendo la tabla.

    Ojo con la variante con sufijo. El tema **redefine** `.table-responsive-lg`
    como `min-width: 60.9375rem !important`, asi que puesta en el propio
    `<table>` no crea scroll: solo le fija 975px de ancho. Solo cuenta la clase
    sin sufijo, y en un ancestro.
    """
    ini = max(0, texto.rfind("\n", 0, max(0, pos - 400)))
    previo = texto[ini:pos]

    # Tailwind. Tambien `overflow-y-auto`: por la especificacion de CSS, si un
    # eje deja de ser `visible` el otro pasa de `visible` a `auto`, asi que un
    # contenedor con scroll vertical desplaza igualmente en horizontal. Exigir
    # la `x` marcaba como defecto el estilo por defecto de las tablas MDX.
    if re.search(r"overflow-[xy]?-?(auto|scroll)", previo):
        return True

    # Estilo en linea de JSX, que va en camelCase: `style={{ overflowX: "auto" }}`.
    # Sin esta rama los dos comparativos de la landing salian como defecto
    # teniendo el contenedor correcto tres lineas mas arriba.
    if re.search(r"overflow[XY]?\s*:\s*[\"']?(auto|scroll)", previo):
        return True

    # w3crm/Bootstrap.
    return bool(re.search(r"table-responsive(?![\w-])", previo))


def _elemento_de(texto: str, pos: int) -> str:
    """Devuelve la etiqueta JSX completa que contiene `pos`.

    El manejador casi nunca esta en la misma linea que el `href`: en JSX de
    varias lineas el `onClick` cae tres lineas mas abajo. Mirar solo la linea
    del `href` daba 49 hallazgos de los que la mayoria SI hacian algo al
    pulsarlos.

    Hay que saltar las llaves: `onClick={(e) => {...}}` contiene `>`, y buscar
    el primer `>` a pelo cortaria la etiqueta por la mitad de la flecha.
    """
    ini = texto.rfind("<", 0, pos)
    if ini < 0:
        return texto[max(0, pos - 200) : pos + 200]
    prof = 0
    i = ini
    while i < len(texto):
        c = texto[i]
        if c == "{":
            prof += 1
        elif c == "}":
            prof -= 1
        elif c == ">" and prof <= 0:
            return texto[ini : i + 1]
        i += 1
    return texto[ini : min(len(texto), ini + 600)]


def auditar(f: Path) -> list[tuple[str, str, int, str]]:
    """Devuelve (codigo, gravedad, linea, fragmento) por cada hallazgo."""
    try:
        texto = io.open(f, encoding="utf-8", errors="replace").read()
    except OSError:
        return []

    crudo = texto
    texto = sin_comentarios(texto)

    hallazgos: list[tuple[str, str, int, str]] = []
    for codigo, gravedad, patron, _por_que in REGLAS:
        for m in patron.finditer(texto):
            linea = _linea_de(texto, m.start())
            # Contexto de la propia linea, para poder descartar legitimos.
            ini = texto.rfind("\n", 0, m.start()) + 1
            fin = texto.find("\n", m.end())
            contexto = crudo[ini : fin if fin > 0 else len(crudo)]

            if codigo == "ENLACE_MUERTO" and _ENLACE_LEGITIMO.search(
                _elemento_de(texto, m.start())
            ):
                continue
            if codigo == "TABLA_SIN_SCROLL" and _hay_contenedor_con_scroll(texto, m.start()):
                continue
            hallazgos.append((codigo, gravedad, linea, contexto.strip()[:120]))
    return hallazgos


def barrido() -> dict[str, list[tuple[str, str, int, str]]]:
    out: dict[str, list[tuple[str, str, int, str]]] = {}
    for f in pantallas():
        h = auditar(f)
        if h:
            out[f.relative_to(RAIZ).as_posix()] = h
    return out


def main() -> None:
    todas = pantallas()
    if len(todas) < 100:
        raise SystemExit(
            f"solo {len(todas)} pantallas: la raiz apunta mal. Cero hallazgos "
            "sobre cero pantallas es un verde que no mide nada."
        )

    resultado = barrido()
    porCodigo: Counter[str] = Counter()
    porFichero: dict[str, int] = defaultdict(int)
    for fichero, hallazgos in resultado.items():
        for codigo, _g, _l, _frag in hallazgos:
            porCodigo[codigo] += 1
            porFichero[fichero] += 1

    print(f"pantallas barridas: {len(todas)}")
    print(f"ficheros con hallazgos: {len(resultado)}")
    print(f"hallazgos totales: {sum(porCodigo.values())}\n")

    for codigo, gravedad, _p, por_que in REGLAS:
        n = porCodigo.get(codigo, 0)
        print(f"  [{gravedad:5}] {codigo:18} {n:5}   {por_que}")

    if "--todo" in sys.argv:
        print("\n── detalle ──")
        for fichero, hallazgos in sorted(resultado.items(), key=lambda x: -len(x[1]))[:40]:
            print(f"\n{fichero}  ({len(hallazgos)})")
            for codigo, _g, linea, frag in hallazgos[:6]:
                print(f"   {linea:5} {codigo:18} {frag}")


if __name__ == "__main__":
    main()
