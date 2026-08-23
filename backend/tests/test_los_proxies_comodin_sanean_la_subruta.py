"""Un proxy comodin no puede pegar segmentos de URL sin mirarlos.

Las rutas `[[...path]]` / `[...path]` reciben los segmentos ya DECODIFICADOS por
Next, los unen con `/` y los pegan detras de una base fija:

    const target = `${platformApiBase()}/api/dialer-advanced/${subpath}`;

El host no se puede cambiar —es concatenacion, no `new URL(subpath, base)`— asi
que no hay SSRF. Lo que si se puede es RECORRER: un `%2e%2e` llega aqui como
`..`, sobrevive hasta el `fetch`, que normaliza la ruta, y la llamada acaba en
otra familia de endpoints con la cabecera `X-Workspace-Id` que el propio proxy
firma.

Hoy los que unen segmentos pasan por `subrutaDeProxy`. Esta prueba existe para el
proximo: un proxy comodin nuevo que se olvide no da ningun sintoma —funciona
perfectamente para quien lo llame— y no hay forma de enterarse mirando la
aplicacion en marcha.
"""
import io
import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parents[2]
API = RAIZ / "apps" / "web" / "src" / "app" / "api"

#: Une los segmentos de la ruta para construir una URL.
UNE_SEGMENTOS = re.compile(r"\.join\(\s*[\"']/[\"']\s*\)")
#: Pasa por el guardia.
SANEA = re.compile(r"\bsubrutaDeProxy\s*\(")


def _sin_comentarios(texto: str) -> str:
    """El texto sin comentarios, para que el guardia no se lea a si mismo.

    El `//` de `https://` no abre comentario: borrar desde ahi se comeria URLs
    enteras y con ellas la senal buscada.
    """
    fuera = []
    for linea in texto.splitlines():
        if linea.strip().startswith(("//", "*", "/*")):
            continue
        fuera.append(re.sub(r"(?<!:)//.*$", "", linea))
    return "\n".join(fuera)


def _proxies_comodin():
    """Las rutas cuyo camino incluye un segmento comodin `[...x]` o `[[...x]]`."""
    for f in sorted(API.rglob("route.ts")):
        rel = f.parent.relative_to(API).as_posix()
        if "[..." in rel or "[[..." in rel:
            yield "/api/" + rel, f


def test_el_extractor_encuentra_los_proxies_comodin():
    """Control positivo: si esto se cae, lo de abajo aprueba por no mirar nada."""
    rutas = [r for r, _ in _proxies_comodin()]
    assert rutas, "el extractor no encontro ningun proxy comodin"


def test_todo_proxy_que_une_segmentos_los_sanea_antes():
    """Unir sin sanear es lo que abre el recorrido de ruta."""
    culpables = []
    for ruta, f in _proxies_comodin():
        cuerpo = _sin_comentarios(io.open(f, encoding="utf-8", errors="replace").read())
        if UNE_SEGMENTOS.search(cuerpo) and not SANEA.search(cuerpo):
            culpables.append(ruta)
    assert not culpables, (
        f"proxies comodin que unen segmentos sin sanearlos: {culpables}. "
        "Un `..` decodificado sale de la familia de endpoints que sirven.")


def test_el_guardia_rechaza_en_vez_de_reescribir():
    """Sanear en silencio esconderia el intento; aqui interesa que se vea.

    Si el guardia reescribiera la ruta, un recorrido quedaria registrado como una
    peticion normal y nadie sabria que alguien lo intento.
    """
    fuente = _sin_comentarios(io.open(
        RAIZ / "apps" / "web" / "src" / "lib" / "security" / "subrutaDeProxy.ts",
        encoding="utf-8").read())
    assert "throw new SubrutaNoPermitida" in fuente
    for sospechoso in (".replace(", ".replaceAll(", ".filter("):
        assert sospechoso not in fuente, (
            f"el guardia parece REESCRIBIR la subruta ({sospechoso}) en vez de rechazarla")
