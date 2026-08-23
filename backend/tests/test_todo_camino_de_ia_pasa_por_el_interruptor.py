"""Ningun camino capaz de provocar inferencia esquiva el interruptor maestro.

`NELVYON_AI_ENABLED` se documenta como *master switch — when false, no provider
probes or external LLM calls*. Para que eso sea cierto tiene que consultarlo
**todo** camino que pueda gastar: UI/API, router, agentes, Memory/RAG, voz,
jobs/crons y automatizaciones.

Lo que se encontro al medirlo:

- 26 servicios Python tenian su propia copia de `_openai_client()` y ninguno
  consultaba el interruptor. Bastaba con que apareciera una clave en el entorno
  para que empezaran a gastar.
- El embudo `core/ai_provider.py` era estricto con la configuracion pero tampoco
  miraba el interruptor.
- En TypeScript: el motor de agentes, los cuatro generadores (imagen, video, 3D,
  voz), el adaptador autonomo, la transcripcion y hasta la SONDA DE SALUD salian
  a `api.openai.com` sin consultarlo.

Esta prueba existe para el siguiente. Un camino nuevo que llame directamente a un
proveedor no da ningun sintoma —funciona perfectamente— y la unica senal seria la
factura.
"""
import io
import pathlib
import re

import pytest

RAIZ = pathlib.Path(__file__).resolve().parents[2]
BACKEND = RAIZ / "backend"
WEB = RAIZ / "apps" / "web" / "src"

EXCLUIDOS = ("node_modules", "__tests__", ".test.", ".spec.",
             "\\tests\\", "/tests/", "\\scripts\\", "/scripts/")

#: Un proveedor que COBRA por uso, escrito como destino de una llamada.
PROVEEDOR_DE_PAGO = re.compile(
    r"https://(?:api\.openai\.com|api\.anthropic\.com"
    r"|generativelanguage\.googleapis\.com|api\.cohere\.ai|api\.mistral\.ai"
    r"|api\.deepseek\.com|api\.elevenlabs\.io|api\.groq\.com"
    r"|[a-z0-9-]+\.openai\.azure\.com)",
    re.I)

#: Consultar el interruptor, en cualquiera de sus dos formas.
INTERRUPTOR = re.compile(r"isNelvyonAiEnabled|interruptor_de_ia_encendido"
                         r"|NELVYON_AI_ENABLED")

#: Ficheros que NOMBRAN el proveedor sin llamarlo: constantes, documentacion de
#: configuracion y el propio interruptor. Se listan uno a uno, con su motivo, en
#: vez de excluirlos por patron: una exclusion ancha se traga tambien lo que
#: deberia detectar.
PERMITIDOS = {
    "backend/private-ai/config.ts": "es el interruptor",
    "backend/core/ai_provider.py": "es el embudo, y ya lo consulta",
    "backend/core/config.py": "declara variables, no llama",
}


def _sin_comentarios(texto: str, es_python: bool) -> str:
    """El texto sin comentarios de ninguna clase.

    Hace falta en las DOS direcciones, y ya ha fallado en las dos:

    - sin quitarlos, salian como culpables ficheros cuyos comentarios EXPLICAN
      que antes llamaban a OpenAI y ya no. Tres falsos positivos por leer prosa.
    - quitandolos con `//.*`, el `//` de `https://api.openai.com` se llevaba por
      delante la URL entera, y un fichero que SI gastaba salia limpio. Un guardia
      que se come justo la senal que busca da verde siempre.
    """
    fuera = []
    dentro_de_bloque = False
    for linea in texto.splitlines():
        pelada = linea.strip()
        if es_python:
            fuera.append(re.sub(r"(?<!:)#.*$", "", linea))
            continue
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


def _ficheros():
    for base in (BACKEND, WEB):
        for ext in ("*.ts", "*.tsx", "*.py"):
            for f in base.rglob(ext):
                if any(x in str(f) for x in EXCLUIDOS):
                    continue
                yield f


def _caminos_que_gastan():
    for f in _ficheros():
        rel = f.relative_to(RAIZ).as_posix()
        cuerpo = _sin_comentarios(
            io.open(f, encoding="utf-8", errors="replace").read(), f.suffix == ".py")
        if PROVEEDOR_DE_PAGO.search(cuerpo):
            yield rel, cuerpo


def test_el_extractor_distingue_codigo_de_comentario():
    """Control del extractor en las DOS direcciones.

    Sin el no habria forma de saber si el barrido mira el codigo o la prosa que
    lo rodea — y los dos errores posibles ya han ocurrido.
    """
    prosa = "\n".join([
        "// antes esto llamaba a api.openai.com y ya no",
        "/* tambien api.anthropic.com, en bloque */",
        "const x = 1;",
    ])
    assert not PROVEEDOR_DE_PAGO.search(_sin_comentarios(prosa, False))

    codigo = 'const u = "https://api.openai.com/v1/chat/completions";'
    assert PROVEEDOR_DE_PAGO.search(_sin_comentarios(codigo, False))

    prosa_py = "# llamaba a api.openai.com\nx = 1\n"
    assert not PROVEEDOR_DE_PAGO.search(_sin_comentarios(prosa_py, True))

    codigo_py = 'BASE = "https://api.openai.com/v1"\n'
    assert PROVEEDOR_DE_PAGO.search(_sin_comentarios(codigo_py, True))


def test_el_extractor_encuentra_caminos():
    """Control positivo: si esto se cae, lo de abajo aprueba por no mirar nada."""
    caminos = [r for r, _ in _caminos_que_gastan()]
    assert len(caminos) >= 5, caminos


def test_todo_camino_que_gasta_consulta_el_interruptor():
    culpables = [
        ruta for ruta, cuerpo in _caminos_que_gastan()
        if ruta not in PERMITIDOS and not INTERRUPTOR.search(cuerpo)
    ]
    assert not culpables, (
        f"caminos que llaman a un proveedor de pago sin consultar el interruptor "
        f"maestro: {culpables}. Que hoy no haya clave configurada es un hecho de "
        "hoy, no una propiedad del sistema.")


def test_los_permitidos_siguen_siendo_ciertos():
    """Una lista de excepciones que nadie revisa deja de ser una excepcion.

    Si uno de estos ficheros empieza a llamar de verdad, su motivo deja de valer
    y hay que enterarse.
    """
    for ruta, motivo in PERMITIDOS.items():
        f = RAIZ / ruta
        assert f.exists(), f"{ruta} ya no existe; sobra de la lista ({motivo})"
        cuerpo = _sin_comentarios(
            io.open(f, encoding="utf-8", errors="replace").read(), f.suffix == ".py")
        # Nombrar el proveedor vale; construir la peticion, no.
        assert not re.search(r"fetch\s*\(\s*[\"'`]https://api\.(?:openai|anthropic)", cuerpo), (
            f"{ruta} ya no solo NOMBRA el proveedor: lo llama ({motivo})")


def test_el_interruptor_esta_apagado_por_defecto_en_los_dos_lados():
    """Un solo interruptor, dos implementaciones, la misma respuesta.

    Si el lado Python y el TypeScript no coincidieran en el valor por defecto,
    apagar uno dejaria el otro encendido y nadie lo notaria hasta la factura.
    """
    ts = _sin_comentarios(
        io.open(RAIZ / "backend/private-ai/config.ts", encoding="utf-8").read(), False)
    assert 'process.env.NELVYON_AI_ENABLED ?? "0"' in ts, ts[:200]

    py = _sin_comentarios(
        io.open(RAIZ / "backend/core/ai_provider.py", encoding="utf-8").read(), True)
    assert 'os.environ.get("NELVYON_AI_ENABLED", "0")' in py


@pytest.mark.parametrize("modulo", [
    "backend/os-agents/LlmClient.ts",
    "backend/os-agents/generative/GenerativeClient.ts",
    "backend/os-agents/creative/CreativeService.ts",
    "backend/autonomous/llm/llmAdapter.ts",
    "backend/saas/TranscriptionService.ts",
    "backend/health/healthChecks.ts",
])
def test_los_motores_conocidos_siguen_conectados(modulo):
    """Los caminos que se encontraron apagados, uno por uno.

    En lista explicita y no solo por barrido: si manana alguien reescribe uno de
    estos ficheros y el barrido deja de reconocer su forma, esta prueba lo dice
    igual.
    """
    cuerpo = _sin_comentarios(
        io.open(RAIZ / modulo, encoding="utf-8", errors="replace").read(), False)
    assert INTERRUPTOR.search(cuerpo), f"{modulo} dejo de consultar el interruptor"
