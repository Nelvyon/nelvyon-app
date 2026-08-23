"""Nada caro ni anonimo puede esconderse bajo la exencion de health.

`apps/web/src/middleware.ts` empieza asi:

    if (pathname.startsWith("/api/health/") || pathname === "/api/os/health") {
      return NextResponse.next();
    }

Ese `return` es ANTES del limitador, del registro y de las cabeceras de
seguridad, y tiene que serlo: si el sondeo de Railway recibe un 429 marca la
instancia como caida y la reinicia. La infraestructura debe poder llamarlo
siempre.

El problema no es lo que hay hoy, es que `startsWith` deja el prefijo ABIERTO.
Hoy debajo cuelgan cuatro rutas y las cuatro son legitimas: tres triviales y una
—`/api/health/deep`— protegida con `CRON_SECRET`. El dia que alguien anada
`/api/health/reindex`, esa ruta nacera sin limite y sin registro, y nada lo
diria. Esto lo dice.
"""
import io
import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parents[2]
API = RAIZ / "apps" / "web" / "src" / "app" / "api"
MIDDLEWARE = RAIZ / "apps" / "web" / "src" / "middleware.ts"

#: Senales de que una ruta hace algo mas que responder «estoy viva».
CARO = re.compile(
    r"\b(?:INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\b"      # escribe
    r"|\bfetch\s*\(\s*[\"'`]https?://"                      # sale a la red
    r"|openai|anthropic|embedding|completion"               # cuesta dinero
    r"|\bfor\s*\(|\.map\s*\(\s*async",                      # itera
    re.I)

#: Formas de exigir credencial que valen para una ruta exenta.
AUTENTICA = re.compile(
    r"verifyCron|CRON_SECRET|requireSaasContext|requirePlatform|authenticate", re.I)


def _sin_comentarios(texto: str) -> str:
    """El texto sin comentarios.

    Se hace porque ya ha pasado tres veces: un guardia que busca sus propias
    palabras encuentra el comentario que las explica y se declara satisfecho.
    Aqui, sin esto, la frase «no hagas INSERT en una ruta de health» de un
    comentario contaria como un INSERT.
    """
    fuera = []
    for linea in texto.splitlines():
        pelada = linea.strip()
        if pelada.startswith(("//", "*", "/*", "#")):
            continue
        # El `//` de `https://` NO abre un comentario. Borrar desde ahi se comia
        # la URL entera —y con ella la senal que se venia a buscar—, asi que este
        # guardia daba verde ante una ruta que llamaba a la API de OpenAI. Lo
        # encontro la mutacion; sin ella habria pasado por bueno.
        fuera.append(re.sub(r"(?<!:)//.*$", "", linea))
    return "\n".join(fuera)


def _bloque_de_exencion():
    """Los prefijos y rutas exactas que el middleware deja pasar SIN TOCAR.

    Solo cuenta el primer `if` de `middleware()`, el que hace `return
    NextResponse.next()` antes de nada. La primera version de esto cortaba desde
    el principio del fichero y se tragaba `isPublicLmsPath` y `SAAS_PUBLIC_API`,
    que estan encima y dicen algo COMPLETAMENTE distinto: «esta ruta no exige
    sesion». Eso no es estar exento del middleware —esas rutas si pasan por el
    limitador y por el registro— y confundir las dos cosas daba nueve falsos
    positivos.
    """
    fuente = _sin_comentarios(io.open(MIDDLEWARE, encoding="utf-8").read())
    cuerpo = fuente[fuente.index("export async function middleware"):]
    # El bloque de exencion termina en su `return NextResponse.next();`.
    fin = cuerpo.index("NextResponse.next()")
    bloque = cuerpo[:fin]
    return (re.findall(r'pathname\.startsWith\("(/api/[^"]+)"\)', bloque),
            re.findall(r'pathname === "(/api/[^"]+)"', bloque))


def _rutas_exentas():
    """Las rutas que el middleware deja pasar sin tocar, leidas del middleware."""
    prefijos, exactas = _bloque_de_exencion()

    for f in API.rglob("route.ts"):
        ruta = "/api/" + f.parent.relative_to(API).as_posix()
        if ruta in exactas or any(ruta.startswith(p) for p in prefijos):
            yield ruta, f


def test_el_middleware_sigue_eximiendo_health():
    """Control positivo: si esto se cae, el extractor dejo de encontrar nada.

    Sin el, vaciar la lista de exentas aprobaria las pruebas de abajo por no
    tener nada que revisar — el falso verde clasico de un guardia inerte.
    """
    rutas = [r for r, _ in _rutas_exentas()]
    assert rutas, "el extractor no encontro ninguna ruta exenta"
    assert any("health" in r for r in rutas), rutas


def test_la_infraestructura_puede_sondear_sin_limite():
    """El sondeo de Railway tiene que seguir exento. Es el motivo de la exencion."""
    rutas = [r for r, _ in _rutas_exentas()]
    assert "/api/health/ready" in rutas, rutas
    assert "/api/health/live" in rutas, rutas


def test_ninguna_ruta_exenta_hace_algo_caro_sin_credencial():
    """Lo exento puede ser trivial, o puede exigir credencial. Las dos no fallan."""
    culpables = []
    for ruta, f in _rutas_exentas():
        cuerpo = _sin_comentarios(io.open(f, encoding="utf-8", errors="replace").read())
        if CARO.search(cuerpo) and not AUTENTICA.search(cuerpo):
            culpables.append(ruta)
    assert not culpables, (
        "rutas exentas del limitador que hacen trabajo caro sin pedir credencial: "
        f"{culpables}. Una ruta bajo /api/health/ nace sin limite y sin registro.")


def test_la_exencion_no_se_ha_ensanchado_a_prefijos_que_no_son_health():
    """`startsWith` con un prefijo generoso apagaria el limitador entero."""
    prefijos, _ = _bloque_de_exencion()
    for p in prefijos:
        assert "health" in p, f"prefijo exento que no es de health: {p}"
