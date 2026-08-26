"""BLOQUE 7 · lo que entra de fuera no construye codigo, ni rutas, ni destinos.

Guardian de ENTRADAS HOSTILES sobre TODO el arbol.

Las suites ofensivas del bloque prueban una superficie cada vez. Esto mide la
propiedad de golpe, porque la pregunta «hay inyeccion SQL en NELVYON» no se
responde mirando cinco rutas: se responde acotando TODOS los sitios donde una
cadena podria acabar dentro de una consulta, de una ruta de fichero o de una
peticion saliente, y resolviendo uno por uno los que quedan.

Tres reglas. Las tres derivan su lista del arbol y ninguna se escribe a ojo.
Cada una lleva SUELO MINIMO —cero hallazgos sobre cero sitios examinados es el
verde mas vacio posible— y la que espera cero lleva ademas CONTROL POSITIVO,
porque una regla rota tambien devuelve cero y en verde las dos se ven igual.
"""

from __future__ import annotations

import io
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "db" / "certificacion"))

from texto_fuente import sin_comentarios  # noqa: E402

RAIZ = Path(os.environ.get("NELVYON_RAIZ") or Path(__file__).resolve().parents[2])
API = RAIZ / "apps" / "web" / "src" / "app" / "api"

BT = chr(96)      # backtick, para no pelearse con las plantillas de TypeScript
COMILLA = chr(34)
APOS = chr(39)


def _es_prueba(f: Path) -> bool:
    p = f.as_posix()
    return (
        "__tests__" in p
        or "/.next/" in p
        or "node_modules" in p
        or f.name.endswith(".test.ts")
        or f.name.endswith(".spec.ts")
    )


def _fuentes() -> list[Path]:
    """Todo el TypeScript de produccion. Sin pruebas y sin artefactos de build."""
    out: list[Path] = []
    for base in (RAIZ / "backend", RAIZ / "apps" / "web" / "src"):
        if not base.exists():
            continue
        out.extend(f for f in base.rglob("*.ts") if not _es_prueba(f))
    return sorted(out)


def _texto(f: Path) -> str:
    """Codigo SIN comentarios.

    Una regla que casa dentro de un comentario mide el comentario. Se reutiliza
    el escaner del Bloque 5, que conserva las posiciones y distingue `//` de
    `"https://"`.
    """
    try:
        return sin_comentarios(io.open(f, encoding="utf-8", errors="replace").read())
    except OSError:
        return ""


def _rel(f: Path) -> str:
    return f.relative_to(RAIZ).as_posix()


def _rel_api(f: Path) -> str:
    if f.name == "route.ts":
        return f.parent.relative_to(API).as_posix() + "/route.ts"
    return f.relative_to(API).as_posix()


# ═════════════════════════════════════════════════════════════════════════════
# Regla 1 · SQL que se construye pegando cadenas
# ═════════════════════════════════════════════════════════════════════════════
#
# El primer intento de esta regla midio mal, y merece quedar escrito porque el
# error es facil de repetir: se busco con un `grep` por LINEAS y encontro CINCO
# sitios en todo el arbol. Cinco se leen en diez minutos y se justifican uno a
# uno, y por un momento parecio que el arbol estaba limpio. Pero el SQL de este
# repositorio es multilinea, y un patron por lineas no ve una interpolacion que
# esta tres renglones mas abajo dentro de la misma plantilla. Los sitios reales
# son ~180 en 58 ficheros.
#
# Un denominador equivocado por un factor de treinta y seis no es un detalle de
# precision: es la diferencia entre «lo he leido todo» y «he leido el 3%».
#
# Con el numero correcto, sellar 58 ficheros a mano daria una lista que nadie
# vuelve a leer — y una lista que nadie relee es un sello de goma. Asi que la
# regla se parte en dos mitades que significan algo por separado:
#
#   1a. NINGUNA plantilla de SQL puede interpolar una expresion que mencione
#       datos de la peticion. Cero tolerancia, sin lista de excusas.
#
#   1b. Cada interpolacion tiene que ser reconociblemente inofensiva POR SU
#       FORMA —constante en mayusculas, marcador $N, fragmento compuesto solo de
#       literales del propio fichero— o estar leida a mano y escrita abajo. La
#       comprobacion por forma baja UN nivel: sigue `${where}` hasta las
#       asignaciones de `where`, y `${x.join(...)}` hasta los `x.push(...)`. Un
#       nivel y no mas, porque con dos se acaba aceptando medio arbol por
#       transitividad, que es el otro modo de que la regla deje de servir.

_PLANTILLA_SQL = re.compile(
    r"query(?:<[^>]*>)?\(\s*" + BT + r"([^" + BT + r"]*)" + BT,
    re.S,
)
_INTERPOLACION = re.compile(r"\$\{([^}]*)\}")

# Datos que vienen de fuera. La aritmetica de marcadores (`params.length + 1`)
# se excluye a proposito: eso es el NUMERO del marcador, no el contenido.
_DE_LA_PETICION = re.compile(
    r"\b(body|payload|input|req|request|searchParams|filters?|opts|options)\b"
)
_ARITMETICA = re.compile(r"^[\w.\[\]]*\.length\s*(?:[-+]\s*\d+)?$")

# Formas que no pueden llevar texto de fuera al cuerpo de la consulta.
_FORMA_SEGURA = (
    re.compile(r"^[A-Z][A-Z0-9_]*$"),                 # constante de modulo
    re.compile(r"^\w*([iI]dx|i)\+*$"),                # contador de marcador
    re.compile(r"^\d+$"),
    re.compile(r"^[\w.]*\.length(\s*[-+]\s*\d+)?$"),
    re.compile(r"^\w+\s*\?\s*\d+\s*:\s*\d+$"),        # ternario de numeros
)

# Que separa un FRAGMENTO de SQL de un NOMBRE DE COLUMNA.
#
# El primer criterio fue una lista de palabras clave (AND, WHERE, ORDER BY...).
# Era una mala idea por el motivo de siempre: una lista de palabras siempre esta
# incompleta. Se dejaba fuera `p.active = true` y `d.stage NOT IN ('won','lost')`
# —fragmentos perfectamente normales— y la regla pedia justificarlos.
#
# El criterio bueno es mas simple y no tiene lista: un fragmento de SQL lleva
# ESPACIOS o un marcador; un nombre de columna, no. `'helpful'` no es un
# fragmento, `AND a = $1` si. Eso es exactamente la distincion que la regla
# necesita: los identificadores sueltos vuelven a la lectura a mano, que es donde
# tienen que estar.
_PARECE_FRAGMENTO = re.compile(r"(\s|\$\d|\$\$\{)")
_ES_LITERAL = re.compile(r"^\s*[" + COMILLA + APOS + BT + r"]")

# Se captura hasta el `;`, ATRAVESANDO saltos de linea: un ternario de tres
# renglones (`const topWhere = cond\n ? "..." \n : "..."`) quedaba cortado por la
# primera linea y la regla pedia justificarlo como si fuera opaco.
_ASIGNACION = r"(?:const\s+|let\s+|var\s+)?{n}\s*(?:\+?=|\.push\()([^;]{{0,400}})"

_LITERAL_TEXTO = (
    COMILLA + "[^" + COMILLA + "]*" + COMILLA + "|" + APOS + "[^" + APOS + "]*" + APOS
)


def _ternario_de_literales(expr: str) -> bool:
    """`x ? "AND a = $1" : ""` — las dos ramas son literales de texto.

    Las comillas se reconocen explicitamente en vez de partir por el primer
    `:`, porque el `:` puede ir DENTRO del literal: un molde de PostgreSQL
    (`"scheduled_at::text AS scheduled_at"`) partia la expresion por la mitad y
    la regla pedia justificar un ternario perfectamente literal.
    """
    patron = (
        r"[^?]+\?\s*(" + _LITERAL_TEXTO + r")\s*:\s*(" + _LITERAL_TEXTO + r")\s*"
    )
    m = re.fullmatch(patron, expr, re.S)
    if not m:
        return False
    # Y las dos ramas tienen que parecer SQL, no nombres de columna: un
    # `vote === 'helpful' ? 'helpful' : 'not_helpful'` es literal y aun asi
    # interpola un IDENTIFICADOR, que es justo lo que hay que leer a mano.
    return all(_PARECE_FRAGMENTO.search(r) or r in ('""', "''") for r in m.groups())


def _menciona_la_peticion(expr: str) -> bool:
    if _ARITMETICA.match(expr):
        return False
    return bool(_DE_LA_PETICION.search(expr))


def _tiene_forma_segura(expr: str) -> bool:
    return any(p.search(expr) for p in _FORMA_SEGURA)


def _trozo_seguro(v: str) -> bool:
    """Un trozo suelto: literal, con pinta de SQL y sin datos de fuera."""
    return bool(
        _ES_LITERAL.match(v) and _PARECE_FRAGMENTO.search(v) and not _DE_LA_PETICION.search(v)
    )


def _lista_de_fragmentos_segura(texto: str, nombre: str) -> bool:
    """`conditions`, `clauses`: arrays a los que se empujan trozos de SQL que
    luego se unen con `.join(" AND ")`.

    Bajar hasta aqui es lo que evita sellar a mano las veintiuna apariciones de
    la forma `X.length ? WHERE ${X.join(" AND ")} : ""`, que son todas iguales.
    """
    pat = re.compile(re.escape(nombre) + r"\.push\(([^;]{0,400})")
    empujes = [v.strip() for v in pat.findall(texto)]
    return bool(empujes) and all(_trozo_seguro(v) for v in empujes)


def _rhs_seguro(texto: str, rhs: str, profundidad: int = 1) -> bool:
    """¿Es seguro el lado derecho de una asignacion a un fragmento de SQL?"""
    if _DE_LA_PETICION.search(rhs):
        return False
    interpoladas = [m.group(1).strip() for m in _INTERPOLACION.finditer(rhs)]
    if not interpoladas:
        return bool(_trozo_seguro(rhs) or _ternario_de_literales(rhs))
    for e in interpoladas:
        if re.match(r"^[A-Z][A-Z0-9_]*", e):
            continue  # cadena de metodos sobre una constante de modulo
        j = re.match(r"^([\w$]+(?:\.[\w$]+)*)\.join\(", e)
        if j:
            if profundidad > 0 and _lista_de_fragmentos_segura(texto, j.group(1)):
                continue
            return False
        if _tiene_forma_segura(e):
            continue
        if profundidad > 0 and _fragmento_local_seguro(texto, e, profundidad - 1):
            continue
        return False
    return True


def _fragmento_local_seguro(texto: str, nombre: str, profundidad: int = 1) -> bool:
    """¿Este nombre es un fragmento de SQL compuesto con literales del fichero?

    Condiciones, y todas hacen falta:
      1. Se encuentra de donde sale. Si no, se lee a mano.
      2. Toda asignacion es un literal, un ternario de literales, o una plantilla
         que solo interpola cosas que a su vez pasan esta prueba.
      3. Toda asignacion PARECE SQL: marcador $N o palabra clave. Esto es lo que
         separa un `where` de un `col`.
      4. Ninguna menciona datos de la peticion, lo que cierra el caso transitivo:

             const where = `AND col = ${body.col}`;   <- lo caza aqui
             query(`SELECT ... ${where}`)             <- y no alli, donde parece inocente

    La condicion 3 llego despues de un fallo de la regla: sin ella, un
    `const col = STEP_COLUMNS[step]` pasaba limpio, cuando `step` viene del
    cuerpo de la peticion. Que ese sitio concreto sea seguro —lo es, por el mapa
    de claves fijas— no lo decide una regla por forma: lo decide una lectura, y
    por eso vive abajo en la lista de la mano.
    """
    if not re.fullmatch(r"[A-Za-z_$][\w$]*", nombre):
        return False
    pat = re.compile(_ASIGNACION.format(n=re.escape(nombre)))
    vistas = [v.strip() for v in pat.findall(texto)]
    if not vistas:
        return False
    return all(_rhs_seguro(texto, v, profundidad) for v in vistas)


# Lo que la comprobacion por forma NO puede aclarar, leido hasta su origen.
IDENTIFICADORES_JUSTIFICADOS: dict[str, str] = {
    'backend/onboarding/onboardingService.ts::col': (
        "col = STEP_COLUMNS[step], un Record de cuatro claves fijas: solo puede salir uno de cuatro literales del propio fichero. Una clave desconocida da undefined y ROMPE la consulta, no la reescribe. La ruta que llama valida ademas contra VALID_STEPS antes de entrar."
    ),
    'backend/saas/SaasAutopilotService.ts::col': (
        "col = last_<service>_run_at. `_markLastRun` es PRIVADO y en el fichero entero solo se llama con los literales 'seo', 'social', 'reputation' y 'ads'. Comprobado llamador por llamador, no por el tipo: un `as` de TypeScript no comprueba nada en ejecucion."
    ),
    'backend/saas/SaasKnowledgeBaseService.ts::col': (
        "col = vote === 'helpful' ? 'helpful' : 'not_helpful'. Dos literales."
    ),
    'backend/saas/SaasUsageMeterService.ts::col': (
        "col = colMap[field], mapa de claves fijas del propio fichero."
    ),
    'backend/os-agents/ab-testing/AbTestingService.ts::field': (
        "ternario anidado entre tres literales: impressions / clicks / conversions."
    ),
    'backend/saas/SaasWorkflowService.ts::field': (
        "`action.config.field as AllowedField` viene de la configuracion del inquilino y el `as` NO comprueba nada en ejecucion — pero hay comprobacion real justo antes: ALLOWED_FIELDS.includes(field), y si no esta, la consulta no se ejecuta. Es el sitio donde este arbol lo hace bien."
    ),
    'backend/saas/BlockBFinalAudit.ts::table': (
        "recorre una lista literal de nombres de tabla declarada en el fichero; se ejecuta como auditoria interna de arranque, sin entrada de usuario."
    ),
    'backend/saas/BlockBFinalAudit.ts::where': (
        "fragmento literal de la misma auditoria interna."
    ),
    'backend/saas/OsTruthGuardService.ts::filtro': (
        "`propio.where` sale de `filtroTruth(alcance, indice)`, que devuelve un fragmento LITERAL (`workspace_id = $N`) y deja el valor aparte en `params`. Ademas FALLA EN CERRADO: si no se dice de que inquilino, lanza; para operar entre inquilinos hay que pedir TODOS_LOS_INQUILINOS_TRUTH por su nombre. La misma forma se repite en los cuatro servicios de abajo."
    ),
    'backend/saas/OsAgentDataService.ts::filtro': (
        "misma forma que OsTruthGuardService::filtro."
    ),
    'backend/saas/OsDeliveryCertificateService.ts::filtro': (
        "misma forma que OsTruthGuardService::filtro."
    ),
    'backend/saas/OsRegulatedSectorShieldService.ts::filtro': (
        "misma forma que OsTruthGuardService::filtro."
    ),
    'backend/saas/OsAgentAuditTrailService.ts::where': (
        "misma forma que OsTruthGuardService::filtro."
    ),
    'backend/saas/OsCompetitorGapService.ts::topWhere': (
        "ternario de tres renglones entre dos fragmentos literales; el workspace va por $1."
    ),
    'backend/saas/OsCompetitorGapService.ts::where': (
        "ternario entre `WHERE workspace_id = $N` y cadena vacia."
    ),
    'backend/saas/OsCompetitorGapService.ts::tenantClause': (
        "fragmento literal con marcador $N."
    ),
    'backend/saas/OsBriefDiffRerunService.ts::where': (
        "dos formas, las dos literales: el join de `clauses` y el ternario de `WHERE workspace_id = $1`."
    ),
    'backend/os-agents/ClosedLoopRoiService.ts::whereDate': (
        "fragmento literal condicional de rango de fechas; los limites van por marcador."
    ),
    'backend/saas/OsAgentAuditTrailService.ts::agentWhere': (
        "fragmento literal con marcador $N."
    ),
    'backend/saas/OsAgentAuditTrailService.ts::extra': (
        "fragmento literal con marcador $N."
    ),
    'backend/saas/SaasMembershipService.ts::cond': (
        "fragmento literal con marcador $N."
    ),
    'backend/saas/SaasSequencesService.ts::sets.join(",")': (
        "`sets` se llena con `sets.push(`col=$${i++}`)` y los valores van a `vals`. Sin espacio alrededor del `=`, que es lo unico que lo distingue de los demas de su familia."
    ),
    'apps/web/src/lib/portal/portalDeliverablesStore.ts::statusPlaceholders': (
        "`PORTAL_VISIBLE_STATUSES.map((_, i) => `$${i+3}`).join(', ')` — genera SOLO marcadores a partir de una constante del modulo; los estados van como valores."
    ),
    'apps/web/src/lib/portal/portalDeliverablesStore.ts::qaGate': (
        "`productionQaGateSql()` devuelve un fragmento literal sin argumentos, o cadena vacia. Nada del cliente entra ahi."
    ),
    'apps/web/src/lib/portal/portalDeliverablesStore.ts::searchFilter': (
        "fragmento literal con marcador $N; el texto buscado va como valor."
    ),
    'apps/web/src/lib/portal/portalDeliverablesStore.ts::statusFilter': (
        "fragmento literal con marcador $N."
    ),
    'apps/web/src/lib/portal/portalDeliverablesStore.ts::projectFilter': (
        "fragmento literal con marcador $N."
    ),
    'apps/web/src/lib/portal/portalProjectsStore.ts::statusPlaceholders': (
        "misma forma que en portalDeliverablesStore."
    ),
    'apps/web/src/lib/portal/portalProjectsStore.ts::searchFilter': (
        "misma forma que en portalDeliverablesStore."
    ),
    'backend/saas/SaasWebBuilderService.ts::SELECT_PAGE.split(",").map(c => "p." + c.trim()).join(",")': (
        "reescribe la lista de columnas de la constante SELECT_PAGE poniendole el alias `p.`. Todo sale de una constante del modulo; no hay entrada."
    ),
}


def interpolaciones() -> list[tuple[str, str]]:
    """(fichero, expresion) de todo lo que se mete en una plantilla de SQL."""
    out: list[tuple[str, str]] = []
    for f in _fuentes():
        for m in _PLANTILLA_SQL.finditer(_texto(f)):
            for e in _INTERPOLACION.finditer(m.group(1)):
                out.append((_rel(f), e.group(1).strip()))
    return out


def _pendiente_de_lectura(fichero: str, expr: str) -> bool:
    """¿Esta interpolacion necesita que alguien la lea y la explique?"""
    if _tiene_forma_segura(expr) or _ternario_de_literales(expr):
        return False
    texto = _texto(RAIZ / fichero)
    if re.match(r"^[A-Z][A-Z0-9_]*", expr):
        return False  # cadena de metodos sobre una constante de modulo
    j = re.match(r"^([\w$]+(?:\.[\w$]+)*)\.join\(", expr)
    if j and _lista_de_fragmentos_segura(texto, j.group(1)):
        return False
    return not _fragmento_local_seguro(texto, expr)


def test_el_suelo_de_la_regla_de_sql() -> None:
    """Si el patron dejara de casar, la regla se volveria verde por vacia.

    El suelo es alto a proposito: la primera version encontraba CINCO sitios y
    parecia perfectamente sana. Un suelo de 100 habria gritado.
    """
    n = len(interpolaciones())
    assert n >= 100, (
        f"solo {n} interpolaciones de SQL en todo el arbol. La version por lineas de "
        "esta regla encontraba 5 y parecia sana: si este numero se desploma, lo que "
        "ha pasado es que el patron ha dejado de ver el SQL multilinea."
    )
    assert len(_fuentes()) > 500, f"solo {len(_fuentes())} ficheros: la raiz apunta mal."


def test_ninguna_consulta_interpola_datos_de_la_peticion() -> None:
    """1a — cero tolerancia. Esto es la inyeccion SQL propiamente dicha."""
    malas = sorted({f"{f}::{e}" for f, e in interpolaciones() if _menciona_la_peticion(e)})
    assert not malas, (
        f"{len(malas)} consultas interpolan datos de la peticion en el TEXTO del SQL: "
        f"{malas}. Los valores van por $1, $2...; el texto no se construye con ellos."
    )


def test_la_regla_de_inyeccion_sabe_decir_que_si_y_que_no() -> None:
    """CONTROL POSITIVO Y NEGATIVO de 1a.

    La prueba de arriba espera cero. Una regla rota tambien da cero, y en verde
    las dos se ven igual. Aqui se le ponen delante muestras hostiles escritas a
    mano —no del arbol— y se exige que las senale; y muestras inocentes, y se
    exige que las deje pasar. Afilar una regla y cegarla son el mismo gesto: sin
    las dos mitades no se sabe cual de los dos se ha hecho.
    """
    for hostil in [
        "body.orderBy",
        "req.query.sort",
        "filters.column",
        "options.table",
        "input.field",
        "searchParams.get('col')",
    ]:
        assert _menciona_la_peticion(hostil), (
            f"la regla NO detecta {hostil!r}: seria incapaz de encontrar una inyeccion real."
        )
    for inocente in ["params.length", "params.length + 1", "args.length", "idx", "SELECT_COLS"]:
        assert not _menciona_la_peticion(inocente), (
            f"la regla grita por {inocente!r}, que es el NUMERO de marcador y no el dato. "
            "Una regla que grita por todo se acaba silenciando entera."
        )


def test_la_comprobacion_por_forma_no_aclara_de_mas() -> None:
    """CONTROL de 1b: la forma tiene que seguir distinguiendo.

    Muestras sinteticas, no del arbol. Si `_fragmento_local_seguro` aclarara un
    fragmento compuesto con datos de la peticion, toda la regla 1b seria un
    adorno: bastaria una variable intermedia para esconder cualquier inyeccion.
    """
    malo = 'const where = `AND col = ${body.col}`;\nquery(`SELECT 1 ${where}`)'
    assert not _fragmento_local_seguro(malo, "where"), (
        "un fragmento compuesto con `body.col` se aclaro por forma: una variable "
        "intermedia bastaria para esconder una inyeccion."
    )
    malo2 = 'const cols = []; cols.push(body.sort); query(`SELECT ${cols.join(",")}`)'
    assert not _lista_de_fragmentos_segura(malo2, "cols"), (
        "una lista con `body.sort` empujado dentro se aclaro por forma."
    )
    bueno = 'const where = `WHERE tenant_id = $1`;'
    assert _fragmento_local_seguro(bueno, "where"), (
        "un fragmento literal perfectamente normal NO se aclara: la regla pediria "
        "justificar todo el arbol y acabaria siendo un sello de goma."
    )


def test_toda_interpolacion_esta_aclarada_por_forma_o_leida_a_mano() -> None:
    """1b — lo que podria traer un nombre de columna o de tabla desde fuera."""
    sin_leer = sorted(
        {
            f"{f}::{e}"
            for f, e in interpolaciones()
            if _pendiente_de_lectura(f, e) and f"{f}::{e}" not in IDENTIFICADORES_JUSTIFICADOS
        }
    )
    assert not sin_leer, (
        f"{len(sin_leer)} interpolaciones de SQL sin aclarar: {sin_leer}. Sigue la "
        "variable hasta su origen —llamador por llamador, no por el tipo, porque un "
        "`as` de TypeScript no comprueba nada en ejecucion— y escribe aqui de donde sale."
    )


def test_no_sobran_justificaciones_de_sql() -> None:
    """Una justificacion sin sitio es una excusa muerta que nadie relee."""
    vivos = {f"{f}::{e}" for f, e in interpolaciones() if _pendiente_de_lectura(f, e)}
    sobran = sorted(set(IDENTIFICADORES_JUSTIFICADOS) - vivos)
    assert not sobran, (
        f"estas justificaciones ya no corresponden a ninguna interpolacion: {sobran}."
    )


# ═════════════════════════════════════════════════════════════════════════════
# Regla 2 · peticiones salientes con destino variable
# ═════════════════════════════════════════════════════════════════════════════

_FETCH_VARIABLE = re.compile(r"(?<![.\w])fetch\(\s*[A-Za-z_$][\w.$]*")

EGRESO_JUSTIFICADO: dict[str, str] = {
    "auth/sso/callback/route.ts": (
        "`tokenUrl` sale de la configuracion SSO del inquilino, que se valida con "
        "assertSafeEgressUrl al guardarse (SaasSsoService)."
    ),
    "dialer-advanced/[[...path]]/route.ts": (
        "`target` se compone contra NELVYON_BACKEND_URL, de entorno, no de la peticion."
    ),
    "webhooks/ses/route.ts": (
        "DOS fetch, los dos anclados a URL_DE_SNS: el del certificado y el de "
        "SubscribeURL. El segundo se anclo en el Bloque 7 — antes se visitaba tal "
        "cual y llegaba a 169.254.169.254."
    ),
    "webhooks/slack/interactions/route.ts": (
        "`payload.response_url` viene dentro del cuerpo firmado y se ancla a "
        "URL_DE_SLACK. Se anclo en el Bloque 7."
    ),
}


def sitios_egreso() -> dict[str, int]:
    out: dict[str, int] = {}
    if not API.exists():
        return out
    for f in sorted(API.rglob("route.ts")):
        if _es_prueba(f):
            continue
        n = len(_FETCH_VARIABLE.findall(_texto(f)))
        if n:
            out[_rel_api(f)] = n
    return out


def test_el_suelo_de_la_regla_de_egreso() -> None:
    assert sitios_egreso(), (
        "cero peticiones salientes con destino variable en todas las rutas de API. "
        "Es mas probable que el patron haya dejado de casar."
    )


def test_toda_peticion_saliente_con_destino_variable_esta_acotada() -> None:
    """El destino de una peticion saliente es una decision de seguridad.

    NELVYON hace el POST desde DENTRO de su infraestructura: un destino que venga
    de fuera alcanza la metadata de la instancia y los servicios internos que no
    estan expuestos. Esta regla nacio de encontrar exactamente eso en `SubscribeURL`.
    """
    sin_justificar = sorted(set(sitios_egreso()) - set(EGRESO_JUSTIFICADO))
    assert not sin_justificar, (
        f"{len(sin_justificar)} rutas hacen una peticion saliente a un destino no "
        f"literal sin justificar: {sin_justificar}. O el destino se ancla a un patron, "
        "o pasa por assertSafeEgressUrl, o se explica aqui de donde sale."
    )


def test_no_sobran_justificaciones_de_egreso() -> None:
    sobran = sorted(set(EGRESO_JUSTIFICADO) - set(sitios_egreso()))
    assert not sobran, f"justificaciones de egreso sin sitio: {sobran}"


# ═════════════════════════════════════════════════════════════════════════════
# Regla 3 · lectura de ficheros desde una ruta de API
# ═════════════════════════════════════════════════════════════════════════════

_LECTURA = re.compile(r"\b(readFile|readFileSync|createReadStream)\s*\(")

FICHEROS_JUSTIFICADOS: dict[str, str] = {
    "health/route.ts": "package.json del propio cwd. Ningun dato de la peticion.",
    "public/v1/openapi/route.ts": "ruta constante al fichero de especificacion.",
    "public/v2/openapi/route.ts": "ruta constante al fichero de especificacion.",
    "saas/marketplace/blueprints/route.ts": (
        "el nombre sale de BLUEPRINTS[slug], un Record de tres claves fijas: lo "
        "interpolado solo puede ser uno de tres literales. Observacion sin gravedad: "
        "un slug 'constructor' o '__proto__' devuelve algo heredado del prototipo y "
        "path.join revienta con 500 en vez de 404. No hay travesia ni fuga."
    ),
    "saas/reports/[reportId]/export/route.ts": (
        "la ruta la construye resolveArtifactZipPath, con lista blanca anclada por "
        "segmento MAS comprobacion de contencion. Certificado con 35 casos en "
        "salirseDelDirectorioDelInquilino.test.ts."
    ),
    "os/_lib/downloadArtifactZip.ts": (
        "ayudante COMPARTIDO por las nueve rutas os/*/[jobId]. Usa el mismo "
        "resolveArtifactZipPath y ademas llama a `authenticate` y acota por "
        "claims.tenantId. Es el fichero por el que el detector de guardas del "
        "inventario tuvo que aprender a seguir imports."
    ),
}


def sitios_lectura() -> dict[str, int]:
    out: dict[str, int] = {}
    if not API.exists():
        return out
    for f in sorted(API.rglob("*.ts")):
        if _es_prueba(f):
            continue
        n = len(_LECTURA.findall(_texto(f)))
        if n:
            out[_rel_api(f)] = n
    return out


def test_el_suelo_de_la_regla_de_ficheros() -> None:
    assert sitios_lectura(), "cero lecturas de fichero en las rutas de API: patron roto."


def test_toda_lectura_de_fichero_desde_una_ruta_esta_justificada() -> None:
    """Leer un fichero cuyo nombre lo elige quien llama es como se leen los .env."""
    sin_justificar = sorted(set(sitios_lectura()) - set(FICHEROS_JUSTIFICADOS))
    assert not sin_justificar, (
        f"{len(sin_justificar)} rutas leen ficheros sin justificar: {sin_justificar}. "
        "Comprueba de donde sale el nombre: si viene de la peticion, hace falta lista "
        "blanca por segmento Y comprobacion de contencion, no una de las dos."
    )


def test_no_sobran_justificaciones_de_ficheros() -> None:
    sobran = sorted(set(FICHEROS_JUSTIFICADOS) - set(sitios_lectura()))
    assert not sobran, f"justificaciones de lectura sin sitio: {sobran}"
