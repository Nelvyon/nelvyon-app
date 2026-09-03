"""Si la cadena de cobro corre saltando RLS, el `WHERE` es todo el aislamiento.

POR QUE ESTA BATERIA EXISTE
----------------------------
`webhooks/stripe` es la unica ruta cross-tenant que sigue usando la conexion de
peticion. Migrarla a `DbJobsClient` —el rol `nelvyon_web_jobs`, que SALTA RLS—
es lo que falta para cerrar el cutover a minimo privilegio.

Pero ese rol salta RLS. Su aislamiento no lo pone la base: lo pone cada `WHERE`
que escriben estas consultas. Es el mismo contrato que `nelvyon_jobs` en el lado
Python, y el propio `DbJobsClient` lo dice en su cabecera.

Asi que antes de migrarla hay que responder una pregunta que NO es de tipos:
¿toda consulta de la cadena de cobro esta acotada por inquilino?

SE MIDIO, Y LA RESPUESTA ES SI: 36 consultas en cuatro ficheros, todas acotadas
por `user_id` o `tenant_id`. Cuatro parecian no estarlo y era un fallo del
detector, no del codigo: acotan por `user_id::text = $1` y el patron no
contemplaba el cast. Merece decirse porque es la forma exacta en que una
auditoria apresurada habria reportado cuatro fugas que no existen.

El bloqueo de esa ruta es de TIPOS —`DbClient` se propaga por toda la cadena—,
no de seguridad. Esta bateria lo deja fijado para que siga siendo cierto el dia
que se migre.

QUE NO COMPRUEBA
----------------
Que el `user_id` sea el correcto. Eso lo decide el cuerpo firmado por Stripe y
lo cubren las baterias de firma. Aqui solo se comprueba que ninguna consulta
opera SIN acotar — que es la fuga que el salto de RLS haria posible.

COSTE EXTERNO: 0 EUR. Se leen ficheros.
"""
from __future__ import annotations

import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parents[2]

#: La cadena que recorre un webhook de Stripe, del manejador a sus dependencias.
CADENA = [
    "apps/web/src/app/api/webhooks/stripe/route.ts",
    "backend/stripe/webhookHandler.ts",
    "backend/billing/dunningService.ts",
    "backend/billing/cancellationService.ts",
    "backend/email/resolveUserEmailLocale.ts",
]

#: Consultas SQL en plantillas de cadena.
_SQL = re.compile(r"`([^`]*?\b(?:SELECT|INSERT|UPDATE|DELETE)\b[^`]*?)`", re.S | re.I)

#: ACOTADA por inquilino. Acepta el cast: `user_id::text = $1` es tan acotado
#: como `user_id = $1`, y no contemplarlo reporta fugas que no existen — paso
#: al escribir esto, con cuatro `UPDATE subscriptions` perfectamente acotados.
_ACOTA = re.compile(
    r"\b(?:user_id|tenant_id|workspace_id)\b(?:::\w+)?\s*(?:=|IN\b)",
    re.I,
)

#: `INSERT INTO t (...) VALUES` no lleva `WHERE`: su acotacion es la COLUMNA que
#: escribe. Se comprueba distinto.
_ES_INSERT = re.compile(r"^\s*INSERT\s+INTO", re.I)

#: Una consulta EMPIEZA por su verbo. Contenerlo en prosa no basta.
_EMPIEZA_SQL = re.compile(r"^\s*(?:WITH|SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM)\b", re.I)

#: Consultas sin sujeto de inquilino por naturaleza. Cada una con su motivo.
SIN_INQUILINO_A_PROPOSITO = {
    "stripe_webhook_events": "tabla de idempotencia del proveedor: su clave es el id del evento de Stripe, no un inquilino",
}


def _consultas() -> list[tuple[str, str]]:
    fuera = []
    for rel in CADENA:
        p = RAIZ / rel
        if not p.exists():
            continue
        texto = p.read_text(encoding="utf-8", errors="replace")
        for m in _SQL.finditer(texto):
            # Sin comentarios de linea: la casa los escribe DENTRO del SQL, y una
            # plantilla cuyo comentario dice «el UPDATE llego a aplicar» no es un
            # UPDATE. Es el mismo fallo que ya mordio en otros tres guardianes de
            # este repositorio; aqui habria reportado una fuga inexistente en una
            # cadena de COBRO, que es donde mas caro sale investigar en falso.
            crudo = re.sub(r"//[^\n]*", " ", m.group(1))
            una = " ".join(crudo.split())
            # Y tiene que EMPEZAR por un verbo, no solo contenerlo.
            if not _EMPIEZA_SQL.match(una):
                continue
            fuera.append((rel, una))
    return fuera


def _tabla(sql: str) -> str:
    m = re.search(r"\b(?:FROM|INTO|UPDATE)\s+(?:public\.)?([a-z_][a-z0-9_]*)", sql, re.I)
    return m.group(1).lower() if m else ""


def test_el_barrido_encuentra_la_cadena():
    """Cero consultas seria un verde vacio."""
    c = _consultas()
    assert len(c) >= 25, f"solo {len(c)} consultas en la cadena de cobro; el barrido no mira nada"


def test_toda_consulta_de_cobro_esta_acotada_por_inquilino():
    """LA REGLA.

    Con `nelvyon_web_jobs` no hay red debajo: una consulta sin acotar toca las
    filas de todos los clientes. En una cadena de COBRO eso no es una fuga de
    lectura: es cobrar, suspender o cancelar al cliente equivocado.
    """
    culpables = []
    for rel, sql in _consultas():
        if _tabla(sql) in SIN_INQUILINO_A_PROPOSITO:
            continue
        if _ES_INSERT.search(sql):
            # Un INSERT acota escribiendo la columna del inquilino.
            if not _ACOTA.search(sql) and not re.search(
                r"\(\s*[^)]*\b(?:user_id|tenant_id|workspace_id)\b", sql, re.I
            ):
                culpables.append((rel, sql[:90]))
            continue
        if not _ACOTA.search(sql):
            culpables.append((rel, sql[:90]))

    detalle = "\n  ".join(f"{r}: {s}" for r, s in culpables)
    assert not culpables, (
        f"{len(culpables)} consultas de la cadena de cobro no acotan por inquilino. "
        f"Si esta cadena pasa a la conexion que salta RLS, cada una de ellas toca "
        f"las filas de TODOS los clientes:\n  {detalle}"
    )


def test_el_detector_acepta_el_cast():
    """CONTROL, y no es hipotetico: fallo al escribir esta bateria.

    Cuatro `UPDATE subscriptions ... WHERE user_id::text = $1` salieron como
    fugas porque el patron no contemplaba `::text`. Un detector que reporta
    cuatro fugas inexistentes en una cadena de cobro cuesta una tarde de
    investigacion y, la vez siguiente, se le cree menos.
    """
    con_cast = "UPDATE subscriptions SET plan='free' WHERE user_id::text = $1"
    sin_cast = "UPDATE subscriptions SET plan='free' WHERE user_id = $1"
    assert _ACOTA.search(con_cast), "el detector no reconoce `user_id::text = $1`"
    assert _ACOTA.search(sin_cast)


def test_el_detector_ve_una_consulta_sin_acotar():
    """CONTROL NEGATIVO. Un patron que aceptara todo daria verde para siempre."""
    fuga = "UPDATE subscriptions SET status = 'canceled' WHERE plan = 'pro'"
    assert not _ACOTA.search(fuga), "el detector aprueba una consulta sin sujeto de inquilino"


def test_las_excepciones_declaradas_siguen_existiendo():
    """Una lista de excepciones con entradas muertas deja de leerse."""
    tablas = {_tabla(sql) for _, sql in _consultas()}
    fantasmas = sorted(t for t in SIN_INQUILINO_A_PROPOSITO if t not in tablas)
    assert not fantasmas, (
        f"estas excepciones ya no corresponden a ninguna consulta: {fantasmas}. Quitalas.")


def test_los_ficheros_de_la_cadena_existen():
    """Si uno se renombra, todo lo de arriba mediria menos sin decirlo."""
    faltan = [rel for rel in CADENA if not (RAIZ / rel).exists()]
    assert not faltan, f"la cadena de cobro cambio de forma: faltan {faltan}"
