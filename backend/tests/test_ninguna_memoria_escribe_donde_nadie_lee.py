"""Cada almacen de memoria tiene quien escriba, quien lea y de quien es.

POR QUE UNA MEMORIA ES DISTINTA DE OTRA TABLA
----------------------------------------------
Una tabla de facturas vacia se nota: alguien echa de menos su factura. Una
MEMORIA vacia no se nota: el agente contesta igual, solo que peor, y nadie sabe
si es que no habia nada guardado o que no habia coincidencias. Por eso los fallos
de memoria son silenciosos por naturaleza y hay que buscarlos a proposito.

LAS TRES PREGUNTAS
------------------
Para cada almacen:

  1 · ¿QUIEN ESCRIBE?   Un lector sin escritor devuelve vacio para siempre, y
                        ese vacio se parece demasiado a «no hay coincidencias».
  2 · ¿QUIEN LEE?       Un escritor sin lector guarda datos —a veces personales—
                        que no sirven a nadie. Es coste y es riesgo sin
                        contrapartida.
  3 · ¿DE QUIEN ES?     Sin inquilino, dos clientes comparten memoria. Es la
                        forma mas directa de que un cliente vea algo del otro.

LO QUE SE ENCONTRO AL PREGUNTARLO
----------------------------------
    os_client_brain              escribe y lee  `CerebroDeNegocioService`   OK
    saas_shared_memory_entries   escribe y lee                              OK
    saas_tenant_memory_chunks    escribe y lee                              OK
    client_memory                lo usa el backend Python, hoy con 0 filas
    nelvyon_rag_chunks           LECTOR SIN ESCRITOR
    knowledge_base_articles      SIN NINGUN CONSUMIDOR

`nelvyon_rag_chunks` es el caso que importa: `UnifiedRagStore` CAE a el cuando el
recuperador local certificado no esta disponible. Como nada escribe ahi —ni
siquiera hay permiso de INSERT en los roles del web— ese camino de respaldo
devuelve cero conocimiento en silencio. El sistema no falla: responde peor.

LO QUE SE DECIDIO DESPUES, CON EL PLAN DELANTE
-----------------------------------------------
No es un componente muerto por descuido: `docs/PHASE2_RAG_UNIFIED.md` lo declara
espejo de LECTURA hasta el cutover al vector local, y dice explicitamente que no
se tire hasta que el soak de Private AI este verde. El equivalente canonico
existe y si tiene escritor: `KnowledgeIngestService` → `LocalVectorStore`, que es
a quien `UnifiedRagStore` prefiere.

O sea: infraestructura transitoria deliberada, no olvido. Lo que SI era un
defecto —y ya no lo es— era que su vacio no llegaba a nadie. Ahora la fachada lo
propaga y la herramienta MCP lo dice, para que un agente pueda contestar «no lo
se» en vez de improvisar sin conocimiento. Su retirada depende de un soak en
PRODUCCION y por eso no se cierra aqui.

QUE VIGILA ESTA PRUEBA
----------------------
El INVENTARIO, no los seis de hoy. Un almacen nuevo tiene que declarar sus tres
respuestas o romper esto. Y las excepciones solo pueden encoger: el dia que
alguien escriba en `nelvyon_rag_chunks`, la excepcion deja de valer y hay que
quitarla.

COSTE EXTERNO: 0 EUR. Se lee el arbol.
"""
from __future__ import annotations

import io
import os
import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parents[2]
MIGRACIONES = RAIZ / "backend" / "db" / "migrations"

# El `(?<!:)` importa: sin el, el `//` de una URL se toma por comentario.
_COMENTARIO_TS = re.compile(r"(?<!:)//[^\n]*|/\*.*?\*/", re.S)

#: Los almacenes que guardan algo que un agente recuerda o consulta.
MEMORIAS: tuple[str, ...] = (
    "client_memory",
    "os_client_brain",
    "os_client_brain_history",
    "saas_shared_memory_entries",
    "saas_tenant_memory_chunks",
    "nelvyon_rag_chunks",
    "knowledge_base_articles",
)

#: Almacenes sin inquilino a proposito, con su motivo.
SIN_INQUILINO_A_PROPOSITO: dict[str, str] = {
    "nelvyon_rag_chunks":
        "conocimiento de la PLATAFORMA, igual para todos los clientes; lo de "
        "cada inquilino vive en `saas_tenant_memory_chunks`, que si lo lleva",
}

#: Almacenes sin escritor en el arbol, con su motivo. Solo puede ENCOGER.
SIN_ESCRITOR_DECLARADO: dict[str, str] = {
    "nelvyon_rag_chunks":
        "TRANSITORIA DECLARADA: espejo de LECTURA hasta el cutover al vector "
        "local (docs/PHASE2_RAG_UNIFIED.md). Su escritor canonico es "
        "`KnowledgeIngestService` sobre `LocalVectorStore`, que es a quien "
        "`UnifiedRagStore` prefiere. Ya NO devuelve cero conocimiento en "
        "silencio: el vacio se propaga hasta la herramienta MCP. Se retira "
        "cuando el soak de Private AI pase en produccion",
    "knowledge_base_articles":
        "DEUDA VIVA, PENDIENTE DE DECISION: ningun consumidor, ni en TypeScript "
        "ni en Python, y vacia en produccion (medido en la migracion 567). No se "
        "le fabrica un lector para poner esto verde: o alguien la adopta o se "
        "retira, y las dos cosas son decision de quien manda, no de una prueba",
}

#: Almacenes sin lector en TypeScript, con su motivo.
SIN_LECTOR_DECLARADO: dict[str, str] = {
    "client_memory":
        "lo consume el backend Python (`backend/routers/memory.py`), no el de "
        "TypeScript; hoy con cero filas, y el propio codigo lo documenta",
    "os_client_brain_history":
        "historico: se escribe para poder mirarlo, no para que lo lea el "
        "producto en cada ejecucion",
    "knowledge_base_articles":
        "DEUDA: ningun consumidor. Misma tabla que arriba",
}


def _columnas(tabla: str) -> set[str]:
    for p in sorted(MIGRACIONES.glob("*.sql")):
        s = io.open(p, encoding="utf-8", errors="replace").read()
        m = re.search(rf"CREATE TABLE IF NOT EXISTS {tabla}\s*\((.*?)\n\);", s, re.S)
        if m:
            return set(re.findall(r"^\s+([a-z_]+)\s+\w", m.group(1), re.M))
    return set()


def _fuentes() -> dict[str, str]:
    fuera: dict[str, str] = {}
    for raiz in (RAIZ / "backend", RAIZ / "apps" / "web" / "src"):
        for base, dirs, ficheros in os.walk(raiz):
            dirs[:] = [d for d in dirs if d not in ("node_modules", "__tests__", ".pytest_cache")]
            for f in ficheros:
                if not f.endswith((".ts", ".tsx")) or ".test." in f:
                    continue
                p = pathlib.Path(base) / f
                rel = os.path.relpath(p, RAIZ).replace("\\", "/")
                fuera[rel] = _COMENTARIO_TS.sub(
                    " ", p.read_text(encoding="utf-8", errors="replace")
                )
    return fuera


_FUENTES: dict[str, str] | None = None


def _textos() -> dict[str, str]:
    global _FUENTES
    if _FUENTES is None:
        _FUENTES = _fuentes()
    return _FUENTES


def _escritores(tabla: str) -> list[str]:
    pat = re.compile(
        rf"\b(INSERT\s+INTO\s+{tabla}|UPDATE\s+{tabla}|DELETE\s+FROM\s+{tabla})\b", re.I
    )
    return sorted(rel for rel, s in _textos().items() if pat.search(s))


def _lectores(tabla: str) -> list[str]:
    pat = re.compile(rf"\bFROM\s+{tabla}\b", re.I)
    return sorted(rel for rel, s in _textos().items() if pat.search(s))


def test_el_barrido_ve_las_memorias_y_sus_columnas():
    """CONTROL POSITIVO.

    Si dejara de encontrar las tablas —renombradas, migracion movida— todo lo de
    abajo pasaria en verde sin comprobar nada.
    """
    for t in MEMORIAS:
        assert _columnas(t), f"no se encuentra el esquema de {t}; el barrido mira mal"
    assert _escritores("os_client_brain"), (
        "no se ve ni un escritor del Business Brain; el detector esta roto"
    )


def test_ninguna_memoria_es_de_todos_a_la_vez():
    """LA REGLA QUE MAS IMPORTA.

    Sin inquilino, dos clientes comparten memoria, y eso es la forma mas directa
    de que uno vea algo del otro.
    """
    culpables = []
    for t in MEMORIAS:
        cols = _columnas(t)
        if {"tenant_id", "workspace_id"} & cols:
            continue
        if t in SIN_INQUILINO_A_PROPOSITO:
            continue
        culpables.append(t)
    assert not culpables, (
        "estas memorias no dicen de quien son, asi que las comparten todos los "
        f"clientes: {culpables}"
    )


def test_ninguna_memoria_se_lee_sin_que_nadie_la_escriba():
    """Un lector sin escritor devuelve vacio para siempre, y ese vacio se parece
    demasiado a «no hay coincidencias»."""
    culpables = [
        t for t in MEMORIAS
        if _lectores(t) and not _escritores(t) and t not in SIN_ESCRITOR_DECLARADO
    ]
    assert not culpables, (
        "estas memorias tienen quien las lea y nadie que las llene, asi que "
        f"devolveran vacio siempre: {culpables}"
    )


def test_ninguna_memoria_se_escribe_sin_que_nadie_la_lea():
    """Un escritor sin lector guarda datos —a veces personales— que no sirven a
    nadie. Es coste y riesgo sin contrapartida."""
    culpables = [
        t for t in MEMORIAS
        if _escritores(t) and not _lectores(t) and t not in SIN_LECTOR_DECLARADO
    ]
    assert not culpables, (
        "estas memorias se llenan y no las lee nadie; o se conectan o se dejan "
        f"de escribir: {culpables}"
    )


def test_las_deudas_declaradas_siguen_siendo_deuda():
    """EL TRINQUETE.

    El dia que alguien escriba en `nelvyon_rag_chunks`, la excepcion deja de
    valer y hay que quitarla. Una lista que no encoge deja de vigilar.
    """
    ya_tienen = sorted(t for t in SIN_ESCRITOR_DECLARADO if _escritores(t))
    assert not ya_tienen, (
        "estas memorias YA tienen escritor; sacalas de la lista para que el "
        f"guardian vuelva a vigilarlas: {ya_tienen}"
    )
    ya_leidas = sorted(t for t in SIN_LECTOR_DECLARADO if _lectores(t))
    assert not ya_leidas, (
        f"estas memorias YA tienen lector en TypeScript; sacalas de la lista: {ya_leidas}"
    )


def test_las_excepciones_nombran_una_memoria_real():
    """Una excepcion sobre una tabla que ya no existe es ruido heredado."""
    inventadas = sorted(
        t for t in (set(SIN_ESCRITOR_DECLARADO) | set(SIN_LECTOR_DECLARADO)
                    | set(SIN_INQUILINO_A_PROPOSITO))
        if t not in MEMORIAS
    )
    assert not inventadas, f"estas excepciones no son memorias del inventario: {inventadas}"
