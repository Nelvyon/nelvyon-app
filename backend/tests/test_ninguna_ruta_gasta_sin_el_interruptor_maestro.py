"""Ninguna ruta puede llamar a un proveedor de pago sin consultar el interruptor.

`private-ai/config.ts::isNelvyonAiEnabled()` se documenta como *master switch —
when false, no provider probes or external LLM calls*, y por defecto vale `0`.

Pero `/api/nelvyon-site/chat` llamaba a `api.openai.com` sin consultarlo: lo unico
que evitaba el gasto era que no hubiera clave puesta en el entorno. Eso convierte
una garantia en una casualidad — el dia que alguien defina `OPENAI_API_KEY` para
otra cosa, esa ruta, que atiende al publico, empieza a gastar por cada mensaje.
Su limite es por IP, asi que con suficientes IPs el gasto no tiene techo.

La prueba mira el CODIGO y no el entorno a proposito: «hoy no hay clave» es un
hecho de hoy, no una propiedad del sistema. Lo que tiene que ser cierto siempre
es que la decision de gastar pase por el interruptor.
"""
import io
import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parents[2]
API = RAIZ / "apps" / "web" / "src" / "app" / "api"
CONFIG = RAIZ / "backend" / "private-ai" / "config.ts"

#: Construir una llamada a un proveedor que cobra por uso.
PROVEEDOR_DE_PAGO = re.compile(
    r"api\.openai\.com|api\.anthropic\.com|OPENAI_BASE_URL"
    r"|api\.cohere\.ai|generativelanguage\.googleapis\.com",
    re.I)

#: Consultar el interruptor maestro.
INTERRUPTOR = re.compile(r"isNelvyonAiEnabled|NELVYON_AI_ENABLED")


def _sin_comentarios(texto: str) -> str:
    """El texto sin comentarios de ninguna clase.

    Hace falta en las DOS direcciones y ya ha fallado en las dos:

    - sin quitarlos, las rutas `saas/chat` y `saas/agentes/execute` salian como
      culpables por unos comentarios que EXPLICAN que antes llamaban a OpenAI y
      ya no. Tres falsos positivos por leer prosa.
    - quitandolos con `//.*`, el `//` de `https://api.openai.com` se llevaba por
      delante la URL entera y una ruta que si gastaba salia limpia.
    """
    fuera = []
    dentro_de_bloque = False
    for linea in texto.splitlines():
        pelada = linea.strip()
        if pelada.startswith("/*"):
            dentro_de_bloque = True
        if dentro_de_bloque:
            if "*/" in pelada:
                dentro_de_bloque = False
            continue
        if pelada.startswith(("//", "*")):
            continue
        fuera.append(re.sub(r"(?<!:)//.*$", "", linea))
    return "\n".join(fuera)


def _rutas_que_gastan():
    for f in sorted(API.rglob("route.ts")):
        cuerpo = _sin_comentarios(io.open(f, encoding="utf-8", errors="replace").read())
        if PROVEEDOR_DE_PAGO.search(cuerpo):
            yield "/api/" + f.parent.relative_to(API).as_posix(), cuerpo


def test_el_extractor_distingue_codigo_de_comentario():
    """Control del extractor, en las dos direcciones.

    Sin este control no habria forma de saber si el barrido de abajo mira el
    codigo o la prosa que lo rodea.
    """
    con_prosa = '\n'.join([
        "// antes esto llamaba a api.openai.com y ya no",
        "/* tambien api.anthropic.com, en un bloque */",
        "const x = 1;",
    ])
    assert not PROVEEDOR_DE_PAGO.search(_sin_comentarios(con_prosa))

    con_codigo = 'const u = "https://api.openai.com/v1/chat/completions";'
    assert PROVEEDOR_DE_PAGO.search(_sin_comentarios(con_codigo))


def test_el_interruptor_maestro_existe_y_esta_apagado_por_defecto():
    """Control positivo: si el interruptor desaparece, lo de abajo no vale nada."""
    fuente = _sin_comentarios(io.open(CONFIG, encoding="utf-8").read())
    assert "export function isNelvyonAiEnabled" in fuente
    # Por defecto `0`: sin la variable, no se gasta.
    assert 'process.env.NELVYON_AI_ENABLED ?? "0"' in fuente, (
        "el interruptor maestro dejo de estar apagado por defecto")


def test_toda_ruta_que_gasta_consulta_el_interruptor():
    culpables = [
        ruta for ruta, cuerpo in _rutas_que_gastan()
        if not INTERRUPTOR.search(cuerpo)
    ]
    assert not culpables, (
        f"rutas que llaman a un proveedor de pago sin consultar el interruptor "
        f"maestro: {culpables}. Que hoy no haya clave configurada es un hecho de "
        "hoy, no una propiedad del sistema.")
