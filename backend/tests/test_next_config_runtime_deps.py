"""`next.config.ts` se lee al ARRANCAR, no solo al construir.

EL FALLO QUE ESTO IMPIDE
------------------------
Staging compilo bien, aplico las 434 migraciones, y despues entro en bucle de
reinicio:

    Cannot find module './src/features/public-web/aiorNelvyonRoutes'
    Require stack:
      - /app/apps/web/next.config.compiled.js
    ⨯ Failed to load next.config.ts

`next.config.ts` importa ese modulo, pero la etapa `runner` del Dockerfile no lo
copiaba. El build no se entera —ahi el arbol esta completo— y la imagen final se
queda sin el fichero. `.next` no lo cubre: Next lee la configuracion antes de
servir nada.

No era la primera vez. El Dockerfile ya tenia un COPY suelto para
`src/lib/security`, con su comentario explicando lo mismo. Es decir: el patron
era «cuando falle, anade otro COPY». Este test lo cambia por «no puede fallar».

COMO
----
Se leen los imports relativos de `next.config.ts`, se siguen en cadena —lo que
importe un fichero copiado tambien tiene que estar—, y se exige que cada uno
quede cubierto por una linea `COPY --from=builder` de la etapa runner.

Los imports de paquete (`next`, `next-intl/plugin`) no se miran: vienen de
`node_modules`, que si se copia entero.
"""
from __future__ import annotations

import re
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent
DOCKERFILE = REPO / "Dockerfile"
WEB = REPO / "apps" / "web"
NEXT_CONFIG = WEB / "next.config.ts"

#: `import ... from "./x"` y `require("./x")`, comillas simples o dobles.
_IMPORT = re.compile(
    r"""(?:from\s*|require\s*\(\s*|import\s*\(\s*)['"](\.[^'"]+)['"]""",
    re.MULTILINE,
)

#: Extensiones que resuelve el cargador de Next, en orden.
_EXTENSIONES = (".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".json")


def _resolver(base: Path, especificador: str) -> Path | None:
    """La ruta real de un import relativo, probando extensiones e `index`."""
    destino = (base.parent / especificador).resolve()
    if destino.is_file():
        return destino
    for ext in _EXTENSIONES:
        if (candidato := destino.with_suffix(ext)).is_file():
            return candidato
    for ext in _EXTENSIONES:
        if (candidato := destino / f"index{ext}").is_file():
            return candidato
    return None


def _dependencias_en_arranque() -> tuple[set[Path], set[str]]:
    """Ficheros que `next.config.ts` necesita en la imagen, y los no resueltos."""
    vistos: set[Path] = set()
    sin_resolver: set[str] = set()
    pendientes = [NEXT_CONFIG]
    while pendientes:
        fichero = pendientes.pop()
        if fichero in vistos:
            continue
        vistos.add(fichero)
        texto = fichero.read_text(encoding="utf-8", errors="replace")
        for especificador in _IMPORT.findall(texto):
            destino = _resolver(fichero, especificador)
            if destino is None:
                sin_resolver.add(f"{fichero.name} -> {especificador}")
            elif destino not in vistos:
                pendientes.append(destino)
    return vistos - {NEXT_CONFIG}, sin_resolver


def _copias_del_runner() -> list[Path]:
    """Rutas de origen de los `COPY --from=builder` de la etapa runner."""
    texto = DOCKERFILE.read_text(encoding="utf-8")
    runner = texto[texto.index("AS runner"):]
    rutas = []
    for origen in re.findall(r"^COPY\s+--from=builder\s+(\S+)", runner, re.MULTILINE):
        if origen.startswith("/app/"):
            rutas.append(REPO / origen[len("/app/"):])
    return rutas


def _esta_cubierto(fichero: Path, copias: list[Path]) -> bool:
    return any(fichero == c or c in fichero.parents for c in copias)


def test_next_config_existe_y_es_legible():
    assert NEXT_CONFIG.is_file(), "falta apps/web/next.config.ts"
    assert DOCKERFILE.is_file(), "falta el Dockerfile"


def test_todos_los_imports_de_next_config_se_resuelven():
    """Un import que no resuelve ni en local ya es un despliegue roto."""
    _, sin_resolver = _dependencias_en_arranque()
    assert not sin_resolver, f"imports que no resuelven: {sorted(sin_resolver)}"


def test_la_imagen_final_copia_todo_lo_que_next_config_importa():
    """El fallo entero: compila, arranca, y no encuentra el modulo.

    Si alguien anade un import a `next.config.ts` sin su COPY, esto lo dice
    aqui en vez de en el bucle de reinicio de Railway.
    """
    dependencias, _ = _dependencias_en_arranque()
    copias = _copias_del_runner()
    huerfanos = sorted(
        d.relative_to(REPO).as_posix()
        for d in dependencias
        if not _esta_cubierto(d, copias)
    )
    assert not huerfanos, (
        "next.config.ts los necesita al arrancar y la imagen final no los copia:\n  "
        + "\n  ".join(huerfanos)
        + "\nAnade el COPY --from=builder correspondiente en la etapa runner."
    )


def test_el_detector_ve_los_imports_conocidos():
    """Control positivo: sin esto, un barrido vacio daria verde enganoso.

    Son los dos imports relativos que `next.config.ts` tiene hoy — y el segundo
    es exactamente el que tumbo staging.
    """
    dependencias, _ = _dependencias_en_arranque()
    nombres = {d.name for d in dependencias}
    assert "headers.ts" in nombres, "no se detecta ./src/lib/security/headers"
    assert "aiorNelvyonRoutes.ts" in nombres, (
        "no se detecta ./src/features/public-web/aiorNelvyonRoutes"
    )


def test_el_detector_ignora_los_paquetes():
    """Control negativo: `next`, `next-intl/plugin` y demas vienen de node_modules.

    Si el barrido los tratara como ficheros locales, exigiria COPYs imposibles y
    el test seria ruido en vez de senal.
    """
    texto = NEXT_CONFIG.read_text(encoding="utf-8")
    assert "next-intl/plugin" in texto, "cambio next.config.ts: revisa este control"
    especificadores = set(_IMPORT.findall(texto))
    assert all(e.startswith(".") for e in especificadores), (
        f"el detector recogio paquetes: {sorted(e for e in especificadores if not e.startswith('.'))}"
    )


def test_el_runner_copia_lo_indispensable_para_arrancar():
    """Control de que se esta leyendo la etapa correcta del Dockerfile."""
    copias = {c.relative_to(REPO).as_posix() for c in _copias_del_runner()}
    for imprescindible in ("apps/web/.next", "apps/web/next.config.ts", "apps/web/server.js"):
        assert imprescindible in copias, f"el runner no copia {imprescindible}"
