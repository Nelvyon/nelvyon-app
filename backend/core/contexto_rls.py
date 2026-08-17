"""El contexto de inquilino, aplicado a CADA transaccion de PostgreSQL.

QUE PROBLEMA RESUELVE
---------------------
NELVYON declara 969 politicas de Row Level Security sobre 317 tablas, 266 de
ellas con `FORCE ROW LEVEL SECURITY`. Ninguna se evalua hoy, porque la
aplicacion se conecta con un rol superusuario. Pero el dia que se le retire ese
privilegio, esas politicas empiezan a decidir — y para decidir bien necesitan
saber quien pregunta.

Ese «quien» viaja en dos variables de sesion, porque los ayudantes que usan las
politicas no leen la misma:

    606 politicas  nelvyon_jwt_user_id()          -> request.jwt.claim.sub
     53 politicas  current_tenant_id()            -> app.tenant_id
                   nelvyon_erp_tenant_text()      -> app.tenant_id

Hasta ahora la aplicacion fijaba `app.tenant_id`, y solo en un punado de
handlers que llamaban a `TenantService` explicitamente. El resto de peticiones
—la inmensa mayoria— llegaban a la base sin contexto ninguno.

POR QUE EN CADA TRANSACCION Y NO AL ABRIR LA SESION
---------------------------------------------------
`set_config(..., is_local => true)` tiene ambito de TRANSACCION. Fijarlo una vez
al crear la sesion parece suficiente hasta que un handler hace `commit()` y
sigue consultando: la segunda transaccion nace sin contexto, y con RLS activo
eso no da error — devuelve cero filas. Un fallo que se manifiesta como datos que
desaparecen es peor que uno que revienta, porque nadie lo ve.

Por eso el contexto se reaplica en `after_begin`: cada transaccion nueva lo
recibe, venga de donde venga.

Y con ambito de transaccion, no de conexion: las conexiones se reutilizan desde
un pool, asi que un contexto que sobreviviera al commit se lo encontraria la
peticion siguiente —de otro inquilino—. Seria una fuga entre inquilinos causada
justo por el mecanismo que debe evitarlas.

ES INOCUO HOY
-------------
Mientras el rol siga siendo superusuario, `set_config` no cambia una sola
respuesta: las politicas no llegan a evaluarse. Esto es preparacion verificable
—se puede certificar contra un rol sin BYPASSRLS— y no un cambio de conducta.

LO QUE NO HACE
--------------
No retira el privilegio ni activa nada. Ese paso necesita su propia ventana:
requiere demostrar que TODAS las rutas pasan por aqui, y las que no —jobs de
fondo, migraciones, tareas de mantenimiento— necesitan su mecanismo explicito.
"""
from __future__ import annotations

import logging

from sqlalchemy import event, text

from core.tenant_context import get_tenant_context, get_tenant_user_id

logger = logging.getLogger(__name__)

#: Marca en `info` de la sesion para no reaplicar dentro de la misma transaccion.
_MARCA = "_nelvyon_contexto_aplicado"


def sentencias_de_contexto(tenant_id: int | None, user_id: str | None) -> list[tuple[str, dict]]:
    """Las sentencias que fijan el contexto. Separadas para poder probarlas."""
    sentencias: list[tuple[str, dict]] = []
    if tenant_id is not None:
        sentencias.append(
            ("SELECT set_config('app.tenant_id', :valor, true)", {"valor": str(int(tenant_id))})
        )
    if user_id:
        sentencias.append(
            ("SELECT set_config('request.jwt.claim.sub', :valor, true)", {"valor": str(user_id)})
        )
    return sentencias


def aplicar_contexto(sesion) -> int:
    """Fija el contexto de la peticion en la transaccion en curso.

    `sesion` es cualquier cosa con `.execute()`: una `Session` o la `Connection`
    que entrega `after_begin`. Se acepta cualquiera de las dos porque el gancho
    usa la conexion y las pruebas usan la sesion.

    Devuelve cuantas variables se fijaron. Nunca lanza: un fallo aqui no puede
    tumbar una peticion. Con el rol sin BYPASSRLS, la ausencia de contexto se
    manifiesta como denegacion, que es el lado seguro — pero denegar en silencio
    tambien es un fallo, por eso se registra en DEBUG y hay un guard que
    comprueba que el gancho esta puesto.
    """
    tenant_id = get_tenant_context()
    user_id = get_tenant_user_id()
    sentencias = sentencias_de_contexto(tenant_id, user_id)
    if not sentencias:
        return 0
    aplicadas = 0
    for sql, params in sentencias:
        try:
            sesion.execute(text(sql), params)
            aplicadas += 1
        except Exception:  # noqa: BLE001
            logger.debug("no se pudo fijar el contexto de inquilino en la transaccion")
    return aplicadas


def clase_de_sesion_sincrona(session_maker):
    """La clase sobre la que SI existe `after_begin`.

    EL FALLO QUE ESTO CORRIGE
    ------------------------
    `async_sessionmaker.class_` es `AsyncSession`, y `AsyncSession` NO tiene el
    evento `after_begin`: los eventos de ORM viven en la `Session` sincrona que
    `AsyncSession` envuelve. Engancharse a la clase asincrona lanza

        InvalidRequestError: No such event 'after_begin' for target AsyncSession

    y como quien llamaba a `registrar()` capturaba la excepcion para no impedir el
    arranque, el gancho no se instalaba NUNCA y el unico rastro era una linea de
    WARNING. Mientras el rol de conexion conservo BYPASSRLS daba igual, porque el
    contexto no decidia nada. En el momento en que se le retiro, cada consulta
    autenticada paso a evaluarse sin contexto: cero filas, sin error. Datos
    legitimos invisibles.
    """
    return getattr(session_maker.class_, "sync_session_class", None) or session_maker.class_


#: Clase enganchada -> listener instalado. Sirve para no duplicar el gancho y
#: para que un guard pueda preguntar si esta puesto sin hurgar en los internos
#: de SQLAlchemy.
_ENGANCHADAS: dict[int, object] = {}


def listener_instalado(objetivo):
    """El listener enganchado a esa clase, o `None`. Para guards y pruebas."""
    return _ENGANCHADAS.get(id(objetivo))


def registrar(session_maker):
    """Engancha la aplicacion del contexto al inicio de cada transaccion.

    Devuelve el listener instalado, o `None` si ya lo estaba.

    IDEMPOTENTE, Y POR QUE IMPORTA
    ------------------------------
    El evento se registra sobre la `Session` SINCRONA, que es una clase
    compartida por todo el proceso: no es un gancho por motor ni por sesion. Dos
    llamadas a `registrar()` —dos `DatabaseManager`, un reinicio del pool, una
    prueba que lo invoca otra vez— dejarian dos listeners y el contexto se
    fijaria dos veces por transaccion. No es incorrecto, pero es un viaje de ida
    y vuelta a la base por cada transaccion y por cada duplicado.

    Que sea global tambien tiene una consecuencia buena: la sesion de barridos
    (`sesion_de_barrido`) recibe el mismo trato sin configurar nada, y los jobs
    que declaran su inquilino con `contexto_de_inquilino` lo ven aplicado.
    """
    objetivo = clase_de_sesion_sincrona(session_maker)
    if id(objetivo) in _ENGANCHADAS:
        return None

    @event.listens_for(objetivo, "after_begin")
    def _al_empezar(session, transaction, connection):  # noqa: ANN001
        # `after_begin` se dispara una vez por transaccion, incluidas las que
        # nacen despues de un commit dentro de la misma peticion.
        if session.info.get(_MARCA) is transaction:
            return
        session.info[_MARCA] = transaction
        # Se escribe por la CONEXION que entrega el evento, no por la sesion:
        # dentro de `after_begin` la sesion todavia esta estableciendo su
        # transaccion, y pedirle un `execute` la reentra.
        aplicar_contexto(connection)

    _ENGANCHADAS[id(objetivo)] = _al_empezar
    return _al_empezar
