"""Ningun motor importante se queda sin camino desde una entrada real.

LA CLASE DE FALLO, Y POR QUE NINGUN GUARDIAN ANTERIOR LA VEIA
--------------------------------------------------------------
Ya habia un guardian de capacidades huerfanas. Comprobaba que cada capacidad
tuviera ALGUN consumidor. `MotorDeCalidad` lo tenia: `PuenteDeEjecucion`.

Y `PuenteDeEjecucion` no tenia ninguno.

Un motor con 82 comprobaciones, 18 disciplinas y seis baterias propias estaba
completamente muerto detras de un consumidor que tampoco vivia. Mirar un salto
no basta: un huerfano de dos saltos parece conectado desde cualquier grep.

Lo mismo pasaba con `MotorDeResultados` —cero referencias en todo el
repositorio— y con `MotorDeOptimizacion`, al que solo importaba su propia vecina
de carpeta.

Es decir: el motor que juzga la calidad, el que mide si servimos de algo y el
que decide que cambiar estaban los tres desconectados a la vez, y ninguna prueba
se ponia roja por ello. No fallaba nada. Simplemente no se ejecutaba.

QUE COMPRUEBA
-------------
ALCANZABILIDAD, no «tiene consumidor». Se parte de las entradas de verdad —las
rutas de los dos routers de Next, el proceso trabajador y los scripts— y se
sigue el grafo de importaciones. Lo que no se alcanza desde ahi no se ejecuta
jamas, por muchos ficheros que lo mencionen.

QUE NO COMPRUEBA
----------------
Que todo backend sea alcanzable. Hay tipos, utilidades y ayudas que viven
legitimamente sin alcanzar por si mismas, y exigirlo seria ruido. Se mira solo
lo que tiene pinta de HACER algo —motores, puentes, servicios, orquestadores—,
que es donde estar desconectado significa una capacidad entera apagada.

Y no dice que estar en la lista sea un delito. Un backfill que se ejecuta a mano
esta bien desconectado. Lo que no vale es que la lista CREZCA en silencio, ni que
alguien de por operativa en un inventario una capacidad que no se alcanza.

COSTE EXTERNO: 0 EUR. Se leen ficheros.
"""
from __future__ import annotations

import os
import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parents[2]

_IMPORT = re.compile(r"""(?:from|import)\s*\(?\s*["']([^"']+)["']""")
_COMENTARIO = re.compile(r"//[^\n]*|/\*.*?\*/", re.S)

#: Lo que tiene pinta de HACER algo. Un tipo suelto no enciende ni apaga nada.
_HACE_ALGO = re.compile(
    r"(Motor|Puente|Engine|Gate|Guard|Orchestr|Pipeline|Service|Manager|Registry)", re.I
)

#: Entradas que este analisis NO puede ver solo, y por que.
#:
#: LIMITE REAL DEL METODO, escrito para que se sepa. El recorrido sigue
#: importaciones con la ruta escrita como literal. Un `await import(path.join(
#: ROOT, "backend/queue/manejadorDeServicioOs.ts"))` —que es exactamente como el
#: proceso trabajador carga su manejador— es invisible: la ruta se compone en
#: tiempo de ejecucion.
#:
#: Sin esta declaracion el guardian daria por muerto el manejador de la cola y,
#: detras de el, TODO lo que hoy si esta conectado: la puerta de calidad, el
#: bucle de aprendizaje y el registro de resultados. Un guardian que se equivoca
#: en la direccion contraria —dar por huerfano lo vivo— es peor que no tenerlo:
#: obliga a declarar excepciones falsas hasta que la lista deja de significar
#: nada.
ENTRADAS_POR_RUTA_CALCULADA = [
    # `scripts/trabajador-de-cola.mjs` lo importa componiendo la ruta.
    "backend/queue/manejadorDeServicioOs.ts",
]

#: Modulos con pinta de motor que HOY no se alcanzan. Medido el 2026-09-04.
#:
#: Cada uno con su motivo. Un inventario sin motivos es una lista que nadie lee,
#: y entonces vuelve a colarse un motor apagado sin que salte nada.
SIN_ALCANCE_DECLARADO: dict[str, str] = {
    "backend/agency/NelvyonOsOrchestratorContract.ts":
        "contrato declarativo: describe la forma que deben cumplir otros, no se ejecuta",
    "backend/agency/VisualEliteStrategyPipeline.ts":
        "pipeline de estrategia visual construido y sin departamento que lo reclame",
    "backend/autonomous/learning/runLearningEngine.ts":
        "arrancador suelto del motor de aprendizaje; el bucle real se cierra en "
        "`manejadorDeServicioOs`",
    "backend/ejecucion/PuenteDeEjecucion.ts":
        "las siete puertas de ejecucion, construidas y sin nadie que las cruce; la via "
        "real pasa hoy por el manejador de la cola",
    "backend/labs/NelvyonLabsCapabilityRegistry.ts":
        "registro de capacidades de laboratorio, sin superficie que lo consulte",
    "backend/local-ai/LocalAiBackupService.ts":
        "copia de seguridad del modelo local; se invoca a mano cuando toca",
    "backend/local-ai/externalKnowledgeRegistry.ts":
        "registro de fuentes externas de conocimiento, todavia sin ingesta conectada",
    "backend/local-ai/specialization/PlanningEngine.ts":
        "planificacion de la especializacion del modelo local, sin llamador",
    "backend/local-ai/specialization/QualityGates.ts":
        "puertas de calidad del modelo local; la calidad de entregables la juzga "
        "`MotorDeCalidad`, que si esta conectado",
    "backend/os-agents/upsell/OsUpsellEngine.ts":
        "ya declarado huerfano en el guardian de capacidades: construido, ningun "
        "servicio lo invoca",
    "backend/os-core/OsClientsBackfillService.ts":
        "backfill de una migracion de datos; se ejecuta a mano una vez",
    "backend/os-core/OsProjectsBackfillService.ts":
        "backfill de proyectos; mismo caso que el de clientes, se ejecuta a mano",
    "backend/private-ai/context/AgentContextEngine.ts":
        "motor de contexto de la IA privada; el contexto que llega hoy a los agentes "
        "viene de `contextEnricher` y `contextoDeNegocio`",
    "backend/saas/SaasResultsService.ts":
        "resultados del lado saas; los resultados de entregables los lleva "
        "`MotorDeResultados`, que si esta conectado",
}


def _imports_de(ruta: str) -> list[str]:
    try:
        s = (RAIZ / ruta).read_text(encoding="utf-8", errors="replace")
    except OSError:
        return []
    return [m.group(1) for m in _IMPORT.finditer(_COMENTARIO.sub(" ", s))]


def _resolver(desde: str, spec: str) -> str | None:
    if spec.startswith("@nelvyon/"):
        sub = spec.split("/", 1)[1]
        cand = [f"backend/{sub}/index.ts", f"backend/{sub}.ts"]
    elif spec.startswith("."):
        base = os.path.normpath(os.path.join(os.path.dirname(desde), spec))
        cand = [base + ".ts", base + ".tsx", os.path.join(base, "index.ts"), base + ".mjs"]
    elif spec.startswith("@/"):
        base = os.path.normpath(os.path.join("apps/web/src", spec[2:]))
        cand = [base + ".ts", base + ".tsx", os.path.join(base, "index.ts")]
    else:
        return None
    for c in cand:
        c = c.replace("\\", "/")
        if (RAIZ / c).is_file():
            return c
    return None


def _entradas() -> list[str]:
    """Por donde entra de verdad una peticion o un proceso.

    Los DOS routers de Next. Mirar solo uno da por huerfano medio producto: la
    primera pasada de este analisis perdio los servicios que entran por
    `pages/api` y acuso de muertos a cinco que estaban vivos.
    """
    fuera: list[str] = []
    for carpeta, validos in (
        ("apps/web/src/app", {"route.ts", "route.tsx", "page.tsx", "layout.tsx"}),
        ("apps/web/src/pages", None),
    ):
        for base, _, ficheros in os.walk(RAIZ / carpeta):
            for f in ficheros:
                if validos is None:
                    if not f.endswith((".ts", ".tsx")):
                        continue
                elif f not in validos:
                    continue
                fuera.append(
                    os.path.relpath(os.path.join(base, f), RAIZ).replace("\\", "/")
                )
    # El proceso trabajador y los scripts sueltos.
    for base, _, ficheros in os.walk(RAIZ / "scripts"):
        for f in ficheros:
            if f.endswith((".mjs", ".ts")):
                fuera.append(os.path.relpath(os.path.join(base, f), RAIZ).replace("\\", "/"))
    fuera.extend(ENTRADAS_POR_RUTA_CALCULADA)
    return fuera


def _alcanzables() -> set[str]:
    visto: set[str] = set()
    pila = _entradas()
    while pila:
        n = pila.pop()
        if n in visto:
            continue
        visto.add(n)
        for spec in _imports_de(n):
            r = _resolver(n, spec)
            if r and r not in visto:
                pila.append(r)
    return visto


def _motores() -> list[str]:
    fuera: list[str] = []
    for base, dirs, ficheros in os.walk(RAIZ / "backend"):
        dirs[:] = [d for d in dirs if d not in ("__tests__", "node_modules", ".pytest_cache")]
        for f in ficheros:
            if f.endswith(".ts") and not f.endswith(".d.ts") and _HACE_ALGO.search(f):
                fuera.append(os.path.relpath(os.path.join(base, f), RAIZ).replace("\\", "/"))
    return sorted(fuera)


def test_el_analisis_alcanza_algo():
    """CONTROL POSITIVO. Si el resolvedor se rompiera, no alcanzaria nada y todo
    saldria huerfano — o al reves, y no detectaria nada."""
    a = _alcanzables()
    assert len(a) > 2000, f"solo {len(a)} ficheros alcanzables: el grafo no se esta recorriendo"


def test_el_analisis_reconoce_una_via_real_conocida():
    """CONTROL. La cadena que se acaba de conectar tiene que verse entera.

    `scripts/trabajador-de-cola.mjs` → `manejadorDeServicioOs` → `MotorDeCalidad`.
    Si este camino no se viera, el guardian estaria midiendo otra cosa.
    """
    a = _alcanzables()
    for eslabon in (
        "backend/queue/manejadorDeServicioOs.ts",
        "backend/calidad/MotorDeCalidad.ts",
        "backend/resultados/MotorDeResultados.ts",
    ):
        assert eslabon in a, f"no se alcanza {eslabon}, que si esta conectado"

    # Y que la entrada declarada a mano siga correspondiendo a algo real: si el
    # trabajador dejara de cargar ese fichero, la declaracion mantendria viva
    # una cadena entera que ya no lo esta.
    arranque = (RAIZ / "scripts/trabajador-de-cola.mjs").read_text(encoding="utf-8")
    for entrada in ENTRADAS_POR_RUTA_CALCULADA:
        assert entrada in arranque, (
            f"{entrada} se declara como entrada por ruta calculada y el trabajador "
            f"ya no lo carga: la declaracion esta dando por viva una cadena muerta"
        )


def test_ningun_motor_nuevo_se_queda_sin_puerta():
    """LA REGLA.

    Un motor desconectado no falla: no se ejecuta. Ninguna prueba se pone roja,
    ningun error aparece en los registros, y el inventario sigue diciendo que la
    capacidad existe. Es la unica forma de fallo que se puede tener durante
    meses sin enterarse.
    """
    alcanzables = _alcanzables()
    huerfanos = [m for m in _motores() if m not in alcanzables]
    nuevos = sorted(set(huerfanos) - set(SIN_ALCANCE_DECLARADO))
    assert not nuevos, (
        "estos modulos tienen pinta de hacer algo y NO se alcanzan desde ninguna "
        "entrada real. O se conectan, o se declaran con su motivo:\n  "
        + "\n  ".join(nuevos)
    )


def test_lo_declarado_sin_alcance_sigue_sin_alcance():
    """EL TRINQUETE HACIA ABAJO.

    Si uno de los declarados se conecta, hay que sacarlo de la lista — porque si
    no, el dia que alguien lo desconecte otra vez nadie se enterara.
    """
    alcanzables = _alcanzables()
    ya_conectados = sorted(m for m in SIN_ALCANCE_DECLARADO if m in alcanzables)
    assert not ya_conectados, (
        "estos ya SE ALCANZAN y siguen declarados como huerfanos. Sacalos de la "
        "lista para que el guardian vuelva a vigilarlos: " + str(ya_conectados)
    )


def test_las_declaraciones_existen_y_explican_por_que():
    """Una lista de excepciones con entradas muertas o sin motivo deja de leerse."""
    fantasmas = sorted(m for m in SIN_ALCANCE_DECLARADO if not (RAIZ / m).is_file())
    assert not fantasmas, f"estas declaraciones ya no corresponden a ningun fichero: {fantasmas}"

    sin_motivo = sorted(m for m, p in SIN_ALCANCE_DECLARADO.items() if len(p) < 40)
    assert not sin_motivo, f"estos no explican por que estan desconectados: {sin_motivo}"


def test_el_detector_mira_los_dos_routers_de_next():
    """CONTROL, y esta prueba existe por un error propio.

    La primera version solo recorria `app/`. Dio por huerfanos cinco servicios
    que entran por `pages/api` —entre ellos `ClosedLoopRoiService` y
    `OsReportingService`— y estuvo a punto de hacerme declarar muerto medio
    producto. Mirar un solo router es una forma silenciosa de mentir.
    """
    entradas = _entradas()
    assert any("/src/app/" in e for e in entradas), "no se miran las rutas del App Router"
    assert any("/src/pages/" in e for e in entradas), "no se miran las rutas del Pages Router"

    alcanzables = _alcanzables()
    assert "backend/os-agents/ClosedLoopRoiService.ts" in alcanzables, (
        "se perdio un servicio que entra por `pages/api`: el barrido volvio a mirar "
        "un solo router"
    )
