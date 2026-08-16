"""Guard permanente: toda conexion a la base nace en un sitio, y todo camino de
fondo declara su inquilino.

QUE PROTEGE
-----------
La activacion parcial de RLS descansa en dos hechos que hoy son ciertos y que
nada impide romper manana con un `import` inocente:

  1. La UNICA creacion de motor/sesion de la superficie FastAPI esta en
     `core/database.py`. Es donde se engancha `core/contexto_rls.py`, que fija
     `app.tenant_id` y `request.jwt.claim.sub` al empezar CADA transaccion. Un
     motor creado en otro sitio no pasa por ese enganche: sus consultas llegan
     sin contexto y, bajo un rol sin BYPASSRLS, devuelven cero filas.

  2. Los modulos que abren sesion FUERA de una peticion fijan su inquilino
     explicitamente. El ContextVar lo puebla `middleware/tenant.py`, que solo
     corre en peticiones HTTP; un worker, un job de cola o un hilo nuevo nacen
     con el vacio.

POR QUE UN GUARD Y NO UNA REVISION
----------------------------------
Los dos fallos que previene son SILENCIOSOS. No lanzan excepcion, no aparecen en
Sentry, no rompen ningun test funcional: devuelven listas vacias. Un guard es la
unica forma de que un cambio que los reintroduzca se note el dia que se escribe
y no seis meses despues, cuando alguien pregunte por que un cliente dice que sus
datos «desaparecieron».
"""
from __future__ import annotations

import ast
import re
from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parent.parent

#: Carpetas que NO forman parte de la superficie FastAPI en ejecucion.
#: `alembic` y `db/migrations` corren como `postgres`; `scripts` y `migrations`
#: son utilidades de linea de comandos que se ejecutan a mano, fuera del
#: proceso; `tests` es este mismo arnes.
EXCLUIDAS = ("tests", "alembic", "scripts", "migrations", "__pycache__", "node_modules")

#: Formas de abrir una conexion o fabricar sesiones sin pasar por
#: `core/database.py`.
CREACION_DE_CONEXION = (
    "create_async_engine",
    "create_engine",
    "async_sessionmaker",
    "sessionmaker",
    "asyncpg.connect",
    "asyncpg.create_pool",
    "psycopg2.connect",
    "psycopg.connect",
)

#: El unico fichero autorizado a crear motores y session makers.
FICHERO_DEL_MOTOR = "core/database.py"

#: Como se declara un inquilino desde fondo. Cualquiera de las dos vale:
#: `contexto_de_inquilino` para quien conoce su workspace, `sesion_de_barrido`
#: para los barridos cross-tenant que no pueden conocerlo.
MARCAS_DE_CONTEXTO = ("contexto_de_inquilino", "sesion_de_barrido")

#: Quien puede pedir la sesion privilegiada, y por que.
#:
#: `sesion_de_barrido()` devuelve una sesion del rol `nelvyon_jobs`, que BYPASSA
#: RLS. Es la unica credencial del sistema que no pasa por las politicas, asi
#: que la lista de quien la toca tiene que ser corta, explicita y revisable de
#: un vistazo. Cualquier fichero nuevo que la use y no este aqui hace fallar el
#: guard: es una decision que merece una conversacion, no un `import`.
CONSUMIDORES_DE_LA_SESION_PRIVILEGIADA = {
    "core/database.py": "es donde se define; el motor de jobs vive aqui y en ningun otro sitio",
    "services/social_scheduler_worker.py": (
        "barrido cross-tenant: pregunta que posts vencen en TODA la base, asi "
        "que no hay un inquilino que fijar antes de preguntar"
    ),
    "services/reporting_worker.py": (
        "barrido cross-tenant: recorre todos los workspaces con miembros "
        "activos para decidir a quien le toca informe"
    ),
    "services/finetuning_worker.py": (
        "barrido cross-tenant: lista los workspaces candidatos a reentrenar "
        "antes de saber cuales son"
    ),
    "routers/stripe_webhook.py": (
        "actor de SISTEMA: Stripe llama sin JWT y sin usuario, asi que ninguna "
        "politica de `subscriptions` le concede nada. La sesion se abre DESPUES "
        "de verificar la firma y se entrega SOLO a la escritura de "
        "suscripciones (`db_suscripciones`); la idempotencia y el resto del "
        "handler siguen con la sesion normal"
    ),
}


# ═══════════════════════════════════════════════════════════════════════════
# Los modulos que abren sesion FUERA de una peticion
# ═══════════════════════════════════════════════════════════════════════════
#
# Esta lista es el inventario, con su motivo. Cada entrada tiene que cumplir una
# de dos cosas: o usa una de las MARCAS_DE_CONTEXTO, o esta en
# EXCEPCIONES_DECLARADAS con una razon escrita.

MODULOS_DE_FONDO = {
    "core/nelvyon_job_handlers.py": "handlers de la cola de jobs; corren en el worker de core/job_queue.py",
    "core/productive_job_handlers.py": "handlers contratados (email/report/webhook/cleanup) de la misma cola",
    "services/social_scheduler_worker.py": "bucle de 60s arrancado en el lifespan (main.py)",
    "services/reporting_worker.py": "bucle de 900s arrancado en el lifespan (main.py)",
    "services/finetuning_worker.py": "bucle diario arrancado en el lifespan (main.py)",
    "services/os_web_builder_worker.py": "tarea lanzada con create_task desde routers/os_web_builder.py",
    "services/os_store_builder_worker.py": "tarea lanzada con create_task desde routers/os_store_builder.py",
    "services/webhook_service.py": "schedule_webhook_event puede acabar en un hilo nuevo con asyncio.run",
    "services/auth.py": "initialize_admin_user corre en el arranque, antes de la primera peticion",
    "services/landing_builder_service.py": "_seed_templates abre sesion propia sin peticion detras",
    "services/os_web_builder_service.py": "_seed_templates abre sesion propia sin peticion detras",
    "services/os_store_builder_service.py": "_seed_templates abre sesion propia sin peticion detras",
    "routers/chat.py": (
        "endpoint WebSocket y rutas publicas del widget: TenantMiddleware es "
        "BaseHTTPMiddleware y no cubre scope websocket"
    ),
}

#: Excepciones LEGITIMAS: modulos de fondo que no llaman a las marcas de
#: contexto, y por que eso esta bien. Una excepcion sin motivo escrito no pasa.
EXCEPCIONES_DECLARADAS = {
    "core/nelvyon_job_handlers.py": (
        "El contexto NO se fija aqui a proposito: lo fija el despacho de "
        "core/job_queue.py a partir de workspace_id/actor_user_id de la carga, "
        "que es un unico punto para todos los handlers registrados —los de hoy "
        "y los de manana— en vez de un envoltorio repetido que alguien acabaria "
        "olvidando."
    ),
    "core/productive_job_handlers.py": (
        "Mismo motivo: el inquilino lo pone core/job_queue.py antes de invocar "
        "al handler. El contrato de core/job_contracts.py ya obliga a que la "
        "carga traiga workspace_id y actor_user_id."
    ),
    "services/auth.py": (
        "initialize_admin_user escribe en `users`, que NO tiene RLS, y ademas "
        "esta cerrada por should_run_admin_bootstrap() —desactivada en "
        "produccion salvo ALLOW_ADMIN_BOOTSTRAP—. No hay politica que evaluar."
    ),
    "services/landing_builder_service.py": (
        "_seed_templates no tiene ningun llamador en el repositorio: es codigo "
        "muerto sobre un catalogo global (`landing_templates`) sin workspace_id "
        "que declarar. Si algun dia se revive, tendra que ir por "
        "sesion_de_barrido() como los demas barridos globales."
    ),
    "services/os_web_builder_service.py": (
        "Mismo caso: `_seed_templates` no tiene llamador en el repositorio y "
        "solo puebla `os_website_templates`, un catalogo global sin "
        "workspace_id. El resto del modulo si corre bajo peticion y hereda el "
        "contexto del middleware."
    ),
    "services/os_store_builder_service.py": (
        "Mismo caso: `_seed_templates` no tiene llamador y solo puebla "
        "`os_store_templates`, catalogo global sin workspace_id. El resto del "
        "modulo corre bajo peticion y hereda el contexto del middleware."
    ),
}


def _ficheros_de_la_superficie():
    """Todo el `.py` de `backend/` que corre dentro del proceso FastAPI."""
    for f in sorted(RAIZ.rglob("*.py")):
        rel = f.relative_to(RAIZ).as_posix()
        if any(parte in rel.split("/") for parte in EXCLUIDAS):
            continue
        yield f, rel


def _sin_comentarios_ni_textos(src: str) -> str:
    """Nombrar un patron para explicarlo no es usarlo.

    Se quitan comentarios y docstrings antes de buscar, porque si no este mismo
    fichero —y las explicaciones de los modulos que arregla— se delatarian a si
    mismos.
    """
    try:
        arbol = ast.parse(src)
    except SyntaxError:
        return re.sub(r"#.*$", "", src, flags=re.MULTILINE)
    docstrings: set[int] = set()
    for nodo in ast.walk(arbol):
        if isinstance(nodo, (ast.Module, ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            cuerpo = getattr(nodo, "body", None)
            if (
                cuerpo
                and isinstance(cuerpo[0], ast.Expr)
                and isinstance(cuerpo[0].value, ast.Constant)
                and isinstance(cuerpo[0].value.value, str)
            ):
                inicio = cuerpo[0].lineno
                fin = cuerpo[0].end_lineno or inicio
                docstrings.update(range(inicio, fin + 1))
    lineas = []
    for numero, linea in enumerate(src.split("\n"), start=1):
        if numero in docstrings:
            continue
        lineas.append(re.sub(r"#.*$", "", linea))
    return "\n".join(lineas)


def _usa_session_maker(codigo: str) -> bool:
    """Solo la LLAMADA cuenta. `if not db_manager.async_session_maker:` es una
    comprobacion de disponibilidad, no la apertura de una sesion."""
    return re.search(r"async_session_maker\s*\(", codigo) is not None


# ═══════════════════════════════════════════════════════════════════════════
# Controles del propio barrido
# ═══════════════════════════════════════════════════════════════════════════


def test_el_barrido_ve_los_ficheros():
    """Control positivo. Sin esto, una ruta mal formada daria cero hallazgos y
    el guard entero pasaria por limpio sin haber mirado nada."""
    ficheros = list(_ficheros_de_la_superficie())
    assert len(ficheros) > 200, f"solo {len(ficheros)} ficheros barridos; la ruta debe estar mal"
    rutas = {rel for _, rel in ficheros}
    assert FICHERO_DEL_MOTOR in rutas
    assert "main.py" in rutas
    assert not any(r.startswith("tests/") for r in rutas), "los tests no son superficie"


def test_el_detector_reconoce_los_patrones():
    """Control negativo. Un detector que no detecta da verdes vacios."""
    culpable = (
        "from sqlalchemy.ext.asyncio import create_async_engine\n"
        "motor = create_async_engine('postgresql+asyncpg://x')\n"
    )
    assert any(p in _sin_comentarios_ni_textos(culpable) for p in CREACION_DE_CONEXION)

    inocente = (
        '"""Aqui se explica que NO se debe llamar a create_async_engine."""\n'
        "# tampoco vale psycopg2.connect en un comentario\n"
        "x = 1\n"
    )
    limpio = _sin_comentarios_ni_textos(inocente)
    assert not any(p in limpio for p in CREACION_DE_CONEXION), (
        "el limpiador debe quitar docstrings y comentarios, o el guard se "
        "delataria a si mismo y nadie podria documentar el problema"
    )

    assert _usa_session_maker("async with db_manager.async_session_maker() as s:")
    assert not _usa_session_maker("if not db_manager.async_session_maker:"), (
        "comprobar que existe no es abrir una sesion; confundirlos llenaria el "
        "guard de falsos positivos y acabaria con alguien desactivandolo"
    )


# ═══════════════════════════════════════════════════════════════════════════
# 1. Un solo sitio crea motores
# ═══════════════════════════════════════════════════════════════════════════


def test_ninguna_conexion_nace_fuera_de_core_database():
    culpables: list[str] = []
    for fichero, rel in _ficheros_de_la_superficie():
        if rel == FICHERO_DEL_MOTOR:
            continue
        codigo = _sin_comentarios_ni_textos(fichero.read_text(encoding="utf-8"))
        encontrados = [p for p in CREACION_DE_CONEXION if p + "(" in codigo]
        if encontrados:
            culpables.append(f"{rel}: {encontrados}")
    assert culpables == [], (
        "un motor creado fuera de core/database.py no lleva el enganche de "
        "core/contexto_rls.py: sus transacciones nacen sin app.tenant_id ni "
        "request.jwt.claim.sub y, bajo nelvyon_app, devuelven cero filas sin "
        f"error. Culpables: {culpables}"
    )


def test_core_database_si_crea_el_motor():
    """Control positivo del test anterior: si `core/database.py` dejase de
    crear el motor, aquel pasaria por vacio."""
    codigo = (RAIZ / FICHERO_DEL_MOTOR).read_text(encoding="utf-8")
    assert "create_async_engine(" in codigo
    assert "async_sessionmaker(" in codigo
    assert "contexto_rls" in codigo, (
        "el motor tiene que engancharse al contexto de inquilino, o crearlo en "
        "un solo sitio no sirve de nada"
    )


# ═══════════════════════════════════════════════════════════════════════════
# 2. Todo camino de fondo declara su inquilino
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.parametrize("rel,motivo", sorted(MODULOS_DE_FONDO.items()))
def test_cada_modulo_de_fondo_declara_o_justifica_su_inquilino(rel, motivo):
    fichero = RAIZ / rel
    assert fichero.exists(), f"{rel} ya no existe: actualizar MODULOS_DE_FONDO"
    assert len(motivo) > 20, f"{rel} listado sin motivo util"

    codigo = _sin_comentarios_ni_textos(fichero.read_text(encoding="utf-8"))

    if any(marca in codigo for marca in MARCAS_DE_CONTEXTO):
        return

    if not _usa_session_maker(codigo):
        # Ni abre sesion propia ni declara contexto: ya no hay nada que
        # vigilar. Se avisa igual para que la lista no acumule entradas
        # muertas, que es como un inventario deja de servir.
        pytest.fail(
            f"{rel} ya no abre sesion propia; sacarlo de MODULOS_DE_FONDO "
            "en vez de dejar la entrada obsoleta"
        )

    razon = EXCEPCIONES_DECLARADAS.get(rel)
    assert razon, (
        f"{rel} abre sesion fuera de una peticion y no fija contexto de "
        "inquilino. Bajo nelvyon_app sus consultas devolverian cero filas sin "
        "error. Arreglarlo con contexto_de_inquilino(...) si conoce su "
        "workspace, o con sesion_de_barrido() si recorre varios; si de verdad "
        "no aplica, declararlo en EXCEPCIONES_DECLARADAS con el motivo."
    )
    assert len(razon) > 80, f"{rel}: la excepcion necesita un motivo explicado, no una etiqueta"


def test_ningun_worker_nuevo_se_queda_fuera_del_inventario():
    """Los ficheros con pinta de fondo tienen que estar inventariados.

    Es la parte que mira hacia adelante: un `services/lo_que_sea_worker.py`
    nuevo que abra sesion propia entra por aqui aunque nadie se acuerde de
    tocar MODULOS_DE_FONDO.
    """
    sospechosos: list[str] = []
    for fichero, rel in _ficheros_de_la_superficie():
        nombre = fichero.name
        parece_de_fondo = (
            nombre.endswith("_worker.py")
            or "job_handlers" in nombre
            or nombre.endswith("_scheduler.py")
            or nombre.endswith("_cron.py")
        )
        if not parece_de_fondo:
            continue
        codigo = _sin_comentarios_ni_textos(fichero.read_text(encoding="utf-8"))
        if not _usa_session_maker(codigo) and not any(
            marca in codigo for marca in MARCAS_DE_CONTEXTO
        ):
            continue
        if rel not in MODULOS_DE_FONDO:
            sospechosos.append(rel)
    assert sospechosos == [], (
        "modulos con forma de proceso de fondo que abren sesion y no estan "
        f"inventariados en MODULOS_DE_FONDO: {sospechosos}"
    )


def test_el_websocket_de_livechat_resuelve_su_inquilino_antes_de_consultar():
    """El camino publico que no puede recibir contexto del middleware.

    `TenantMiddleware` es `BaseHTTPMiddleware`, que solo procesa scope `http`:
    una conexion WebSocket nunca pasa por el. `routers/chat.py` lo resuelve por
    su cuenta con la funcion SECURITY DEFINER de la migracion 543, y este guard
    exige que siga haciendolo: si alguien quita esa llamada, el chat en vivo
    volveria a devolver cero filas sin un solo error.
    """
    codigo = _sin_comentarios_ni_textos((RAIZ / "routers/chat.py").read_text(encoding="utf-8"))
    assert "nelvyon_livechat_tenant_de_conversacion" in codigo, (
        "el WebSocket tiene que resolver su inquilino de la base; sin esa "
        "llamada vuelve el fallo silencioso"
    )
    assert "contexto_de_inquilino" in codigo, (
        "resolver el inquilino no basta: hay que fijarlo para las sesiones que "
        "abre el bucle de mensajes"
    )
    assert _usa_session_maker(codigo)


def test_la_causa_raiz_del_websocket_sigue_siendo_la_misma():
    """Si `TenantMiddleware` dejase de ser `BaseHTTPMiddleware`, quiza ya
    cubriria websockets y el rodeo de `routers/chat.py` sobraria. Mientras siga
    siendolo, ese rodeo es obligatorio."""
    codigo = (RAIZ / "middleware/tenant.py").read_text(encoding="utf-8")
    assert "class TenantMiddleware(BaseHTTPMiddleware)" in codigo


def test_la_migracion_543_existe_y_declara_su_alcance():
    """La ampliacion de alcance de `subscriptions`/`oauth_connections` tiene que
    seguir escrita donde se hizo. Un cambio de politicas sin explicacion es lo
    que produjo el desajuste original."""
    migracion = RAIZ / "db/migrations/543_rls_politicas_por_workspace.sql"
    assert migracion.exists()
    sql = migracion.read_text(encoding="utf-8")
    assert "nelvyon_user_in_workspace" in sql
    assert "nelvyon_workspace_can_mutate" in sql
    assert "nelvyon_livechat_tenant_de_conversacion" in sql
    assert "SET search_path = public" in sql, "SECURITY DEFINER sin search_path fijo"
    assert "ESTO AMPLIA EL ALCANCE" in sql, (
        "ampliar quien puede leer esas filas tiene que quedar dicho con todas "
        "las letras en la propia migracion"
    )
    # Solo el SQL efectivo: la migracion EXPLICA por que `USING (true)` no era
    # una opcion, y nombrar el atajo al descartarlo no es usarlo.
    efectivo = "\n".join(
        linea for linea in sql.split("\n") if not linea.lstrip().startswith("--")
    )
    assert "USING (true)" not in efectivo, (
        "abrir la tabla entera no es arreglar el acotado, es quitarlo"
    )


# ═══════════════════════════════════════════════════════════════════════════
# 3. La sesion privilegiada: quien la toca, y quien no debe tocarla
# ═══════════════════════════════════════════════════════════════════════════


def test_solo_los_consumidores_declarados_piden_la_sesion_privilegiada():
    """`sesion_de_barrido()` da una credencial que EVITA RLS.

    Es el unico punto del sistema donde las politicas no deciden. Que aparezca
    en un fichero nuevo no puede ser un detalle de implementacion: hace fallar
    el guard hasta que alguien lo declare y escriba por que.
    """
    culpables: list[str] = []
    for fichero, rel in _ficheros_de_la_superficie():
        codigo = _sin_comentarios_ni_textos(fichero.read_text(encoding="utf-8"))
        if "sesion_de_barrido" not in codigo:
            continue
        if rel not in CONSUMIDORES_DE_LA_SESION_PRIVILEGIADA:
            culpables.append(rel)
    assert culpables == [], (
        "estos ficheros usan la credencial que bypassa RLS sin estar "
        f"declarados: {culpables}"
    )


@pytest.mark.parametrize("rel,motivo", sorted(CONSUMIDORES_DE_LA_SESION_PRIVILEGIADA.items()))
def test_cada_consumidor_declarado_sigue_usandola_y_con_motivo(rel, motivo):
    """Control positivo del test anterior: si la lista se llenara de entradas
    muertas, el barrido no encontraria nada y pasaria por limpio."""
    assert len(motivo) > 60, f"{rel}: declarado sin motivo explicado"
    codigo = _sin_comentarios_ni_textos((RAIZ / rel).read_text(encoding="utf-8"))
    assert "sesion_de_barrido" in codigo, (
        f"{rel} ya no usa la sesion privilegiada: sacarlo de la lista en vez de "
        "dejar la entrada obsoleta"
    )


def test_payments_no_recibe_la_sesion_privilegiada():
    """Los cuatro puntos de escritura de `routers/payments.py` SI tienen usuario.

    `create_payment_session` (require_workspace_admin), `verify_payment`
    (require_workspace_operator), `get_active_subscription` (require_workspace) y
    `_get_or_create_stripe_customer` —llamado solo desde rutas con
    `get_current_user`— llegan con sujeto de JWT y workspace, asi que las
    politicas por pertenencia de la 543 ya les conceden lo que necesitan: leer
    con `nelvyon_user_in_workspace`, escribir con `nelvyon_workspace_can_mutate`.

    Darles ademas una credencial que bypassa RLS seria privilegio regalado a
    rutas autenticadas, que es justo lo contrario de este trabajo.
    """
    codigo = _sin_comentarios_ni_textos((RAIZ / "routers/payments.py").read_text(encoding="utf-8"))
    assert "sesion_de_barrido" not in codigo
    # Y siguen exigiendo identidad: si alguna dejara de hacerlo, pasaria a ser
    # un actor de sistema y esta decision habria que revisarla.
    assert "get_current_user" in codigo
    assert "require_workspace" in codigo


def test_el_webhook_de_stripe_verifica_la_firma_antes_de_abrir_la_sesion_privilegiada():
    """El orden, comprobado sobre el codigo y no solo sobre la conducta.

    `test_rls_webhook_stripe_sistema.py` lo ejercita en caliente; esto lo fija
    en la forma, que es lo que sobrevive a un refactor.
    """
    import ast as _ast

    fuente = (RAIZ / "routers/stripe_webhook.py").read_text(encoding="utf-8")
    arbol = _ast.parse(fuente)
    cuerpo = None
    for nodo in _ast.walk(arbol):
        if isinstance(nodo, _ast.AsyncFunctionDef) and nodo.name == "stripe_webhook":
            cuerpo = _ast.unparse(nodo)
            break
    assert cuerpo, "no existe routers/stripe_webhook.py::stripe_webhook"
    assert "construct_event" in cuerpo, "la verificacion de firma es intocable"
    assert "sesion_de_barrido" in cuerpo
    assert cuerpo.index("construct_event") < cuerpo.index("sesion_de_barrido"), (
        "la sesion privilegiada se abre ANTES de verificar la firma: cualquier "
        "peticion anonima abriria una conexion que bypassa RLS"
    )
    # Y el resto del handler sigue con la sesion normal: `db` posicional, la
    # privilegiada solo por nombre. Si alguien pasara la privilegiada como `db`,
    # la idempotencia y el sync de plan pasarian tambien a bypassar RLS.
    assert "process_stripe_event(db, event, db_suscripciones=db_suscripciones)" in cuerpo, (
        "la llamada al procesador debe seguir entregando la sesion NORMAL como "
        "sesion principal y la privilegiada solo para las suscripciones"
    )


def test_el_procesador_de_stripe_acota_la_sesion_privilegiada_a_las_suscripciones():
    """Regla 2 del cambio: la credencial toca lo minimo.

    `stripe_webhook_events` (idempotencia) y `saas_tenants` (sync de plan) no
    tienen RLS, asi que siguen con la sesion normal. La privilegiada solo llega
    a `SubscriptionsService`.
    """
    fuente = (RAIZ / "services/stripe_webhook_processor.py").read_text(encoding="utf-8")
    codigo = _sin_comentarios_ni_textos(fuente)
    apariciones = [
        linea.strip() for linea in codigo.split("\n") if "db_suscripciones" in linea
    ]
    # Solo la firma del parametro y el punto donde se construye el servicio.
    assert any("SubscriptionsService(" in linea for linea in apariciones), (
        "la sesion privilegiada debe llegar a SubscriptionsService"
    )
    for linea in apariciones:
        assert (
            "db_suscripciones: Optional[AsyncSession]" in linea
            or "SubscriptionsService(" in linea
        ), f"la sesion privilegiada se esta usando fuera de su sitio: {linea}"
