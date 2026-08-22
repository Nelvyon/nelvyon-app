"""Aislamiento del espacio SaaS, intentando romperlo de verdad.

QUE NO CUENTA COMO EVIDENCIA
----------------------------
Que la tabla tenga una columna `tenant_id`. Eso solo dice que alguien penso en
el problema, no que este resuelto. Lo que se prueba aqui es que el inquilino A
NO PUEDE ver ni tocar la fila de B **aunque lo pida explicitamente**, con una
consulta que nombra el tenant ajeno.

Se ejecuta con `nelvyon_app`, el rol de las peticiones HTTP. `nelvyon_jobs`
bypassa RLS: probar con el diria que todo pasa.

POR QUE ESTA BATERIA EXISTE
---------------------------
El espacio OS tenia su bateria adversaria desde el lote 560. El espacio SaaS
—220 tablas con `tenant_id`— no tenia ninguna: se comprobaba que las politicas
existieran en el catalogo, que es exactamente el tipo de evidencia que esta
sesion ha demostrado que no basta.

LAS TABLAS SE DESCUBREN, NO SE LISTAN
-------------------------------------
Igual que en la de OS: una lista escrita a mano queda desactualizada al lote
siguiente, y el sintoma es una bateria en verde que no mira las tablas nuevas.
Se buscan por el nombre de politica que aplica `nelvyon_apply_rls_tenant_id`.

DE QUE PROTEGE ESTE MODELO, DICHO CLARO
---------------------------------------
La politica compara `tenant_id` con `nelvyon_current_tenant_id()`, que lee una
variable de sesion fijada por el middleware. Protege contra una consulta que se
olvide de filtrar — que es el fallo real y frecuente. NO protege contra un actor
que ya pueda fijar esa variable a voluntad; para eso esta la autenticacion.
Decirlo aqui evita que alguien lea «RLS activo» como una garantia mas fuerte de
la que es.
"""
from __future__ import annotations

import os
import secrets
import uuid

import pytest

from tests._guardia_de_roles import alterar_rol

DSN = os.environ.get("NELVYON_PG_CERT_DSN")

pytestmark = [
    pytest.mark.skipif(not DSN, reason="sin NELVYON_PG_CERT_DSN"),
    pytest.mark.asyncio,
]

CLAVE_APP = "cert_app_rls_saas"

#: Toda tabla protegida por el patron estandar del espacio SaaS tiene una
#: politica llamada `<tabla>_select_own`. Buscarlas asi hace que cualquier lote
#: futuro entre solo.
CONSULTA_DESCUBRIMIENTO = """
    SELECT p.tablename AS t
      FROM pg_policies p
      JOIN information_schema.columns c
        ON c.table_schema = 'public' AND c.table_name = p.tablename
       AND c.column_name = 'tenant_id' AND c.data_type = 'uuid'
     WHERE p.schemaname = 'public'
       AND p.policyname = p.tablename || '_saas_tenant_select'
     ORDER BY 1
"""


def _dsn_app(base: str) -> str:
    limpio = base.replace("postgresql+asyncpg://", "postgresql://")
    return "postgresql://nelvyon_app:" + CLAVE_APP + "@" + limpio.split("@", 1)[1]


@pytest.fixture
async def entorno():
    """Dos inquilinos SaaS reales y una credencial temporal para `nelvyon_app`."""
    asyncpg = pytest.importorskip("asyncpg")
    limpio = (DSN or "").replace("postgresql+asyncpg://", "postgresql://")
    adm = await asyncpg.connect(limpio, timeout=30)

    marca = secrets.token_hex(4)
    tenants, propietarios, usuarios = {}, {}, []
    for etiqueta in ("A", "B"):
        tid = uuid.uuid4()
        # `saas_tenants.user_id` tiene FK a `nelvyon_users`, asi que primero el
        # usuario. Y `company_name` lleva la marca CERTIFICATION para que los KPIs
        # reales lo excluyan y el teardown lo reconozca.
        uid = await adm.fetchval(
            "INSERT INTO nelvyon_users (email, password_hash, full_name) "
            "VALUES ($1, 'no-real', $2) RETURNING user_id",
            f"saas-{etiqueta}-{marca}@certificacion.invalid",
            f"Certificacion SaaS {etiqueta}")
        usuarios.append(uid)
        await adm.execute(
            "INSERT INTO saas_tenants (id, user_id, company_name, industry) "
            "VALUES ($1, $2, $3, 'certificacion') ON CONFLICT (id) DO NOTHING",
            tid, uid, f"CERTIFICATION-SAAS-{etiqueta}-{marca}")
        tenants[etiqueta] = tid
        propietarios[etiqueta] = uid

    tablas = [r["t"] for r in await adm.fetch(CONSULTA_DESCUBRIMIENTO)]
    await alterar_rol(adm, f"ALTER ROLE nelvyon_app LOGIN PASSWORD '{CLAVE_APP}'", DSN)

    try:
        yield {"adm": adm, "tenants": tenants, "propietarios": propietarios,
               "tablas": tablas, "dsn_app": _dsn_app(DSN or "")}
    finally:
        for tid in tenants.values():
            for t in tablas:
                try:
                    await adm.execute(f'DELETE FROM public."{t}" WHERE tenant_id = $1', tid)
                except Exception:  # noqa: BLE001
                    pass
            await adm.execute("DELETE FROM saas_tenants WHERE id = $1", tid)
        for uid in usuarios:
            await adm.execute("DELETE FROM nelvyon_users WHERE user_id = $1", uid)
        await alterar_rol(adm, "ALTER ROLE nelvyon_app NOLOGIN", DSN)
        await adm.close()


#: Valores por tipo para las columnas OBLIGATORIAS que no son `tenant_id`.
#:
#: La primera version insertaba solo `(tenant_id)` y conseguia sembrar 13 de 126
#: tablas: el resto tiene otras columnas NOT NULL sin defecto. Una bateria que
#: solo prueba el 10% de lo que dice cubrir es peor que una que no existe, porque
#: informa de una cobertura que no tiene.
_VALOR_POR_TIPO = {
    "uuid": lambda: uuid.uuid4(),
    "text": lambda: "certificacion",
    "character varying": lambda: "certificacion",
    "integer": lambda: 0,
    "bigint": lambda: 0,
    "smallint": lambda: 0,
    "numeric": lambda: 0,
    "double precision": lambda: 0.0,
    "real": lambda: 0.0,
    "boolean": lambda: False,
    "jsonb": lambda: "{}",
    "json": lambda: "{}",
    "date": lambda: "2026-01-01",
    "timestamp with time zone": lambda: "2026-01-01T00:00:00+00:00",
    "timestamp without time zone": lambda: "2026-01-01T00:00:00",
    "ARRAY": lambda: "{}",
}


async def _columnas_obligatorias(adm, tabla: str) -> list[tuple[str, str]]:
    filas = await adm.fetch("""
        SELECT column_name, data_type
          FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
           AND is_nullable = 'NO' AND column_default IS NULL
           AND is_generated = 'NEVER' AND column_name <> 'tenant_id'
         ORDER BY ordinal_position
    """, tabla)
    return [(r["column_name"], r["data_type"]) for r in filas]


async def _sembrar(adm, tabla: str, tid) -> bool:
    """Una fila del inquilino `tid`, rellenando lo obligatorio por tipo.

    Devuelve si se pudo. Lo que no se pueda sembrar —una clave ajena a algo que
    no existe, un CHECK que no adivinamos— se omite, y el recuento minimo de
    cada prueba impide que la bateria pase habiendo omitido casi todo.
    """
    columnas = await _columnas_obligatorias(adm, tabla)
    nombres = ["tenant_id"] + [c for c, _ in columnas]
    valores = [tid]
    for _, tipo in columnas:
        generador = _VALOR_POR_TIPO.get(tipo)
        if generador is None:
            return False
        valores.append(generador())

    marcas = ", ".join(f"${i + 1}" for i in range(len(valores)))
    lista = ", ".join(f'"{c}"' for c in nombres)
    try:
        await adm.execute(
            f'INSERT INTO public."{tabla}" ({lista}) VALUES ({marcas})', *valores)
        return True
    except Exception:  # noqa: BLE001
        return False


async def _como_app(dsn_app: str, uid):
    """Conexion como `nelvyon_app` con el usuario del JWT fijado."""
    import asyncpg

    c = await asyncpg.connect(dsn_app, timeout=20)
    await _fijar_contexto(c, uid)
    return c


async def _fijar_contexto(c, uid) -> None:
    """El contexto que lee de verdad `nelvyon_current_saas_tenant_uuid()`.

    UNA CORRECCION QUE EL CONTROL POSITIVO OBLIGO A HACER
    -----------------------------------------------------
    La primera version fijaba `app.tenant_id` y `app.saas_tenant_id`. Con eso las
    TRES pruebas de aislamiento pasaban... y el control positivo revelo que el
    inquilino tampoco veia SUS PROPIAS filas en 81 tablas. RLS denegaba a todo el
    mundo, asi que «A no ve lo de B» era cierto por el motivo equivocado.

    La funcion no lee esas variables:

        nelvyon_current_saas_tenant_uuid()
          -> SELECT id FROM saas_tenants WHERE user_id = nelvyon_jwt_user_id()
        nelvyon_jwt_user_id()
          -> COALESCE(auth.uid(), current_setting('request.jwt.claim.sub')::uuid)

    El inquilino SaaS se deduce del USUARIO del JWT. Se fija esa variable, que es
    la que pone el middleware en produccion.

    Sin el control positivo, esta bateria habria certificado un aislamiento que
    solo existia porque nadie podia leer nada.
    """
    await c.execute("SELECT set_config('request.jwt.claim.sub', $1, false)", str(uid))


# ═══════════════════════════════════════════════════════════════════════════
# El descubrimiento tiene que encontrar algo
# ═══════════════════════════════════════════════════════════════════════════


async def test_hay_tablas_saas_protegidas_que_probar(entorno):
    """Sin esto, toda la bateria podria pasar sin mirar nada.

    Es el mismo control que la bateria de OS: una consulta de descubrimiento que
    deja de encontrar tablas convierte cada prueba de abajo en un bucle vacio.
    """
    assert len(entorno["tablas"]) >= 50, (
        f"solo se descubrieron {len(entorno['tablas'])} tablas SaaS con politica "
        f"`_select_own`. O el patron cambio de nombre, o las migraciones de RLS "
        f"del espacio SaaS no estan aplicadas en esta base.")


# ═══════════════════════════════════════════════════════════════════════════
# Los cuatro verbos
# ═══════════════════════════════════════════════════════════════════════════


async def test_el_inquilino_a_no_ve_las_filas_de_b(entorno):
    """LECTURA. Se pide explicitamente el tenant ajeno."""
    adm, tenants = entorno["adm"], entorno["tenants"]
    fugas, probadas = [], 0

    for tabla in entorno["tablas"]:
        if not await _sembrar(adm, tabla, tenants["B"]):
            continue
        probadas += 1
        c = await _como_app(entorno["dsn_app"], entorno["propietarios"]["A"])
        try:
            n = await c.fetchval(
                f'SELECT count(*) FROM public."{tabla}" WHERE tenant_id = $1',
                tenants["B"])
            if n:
                fugas.append(f"{tabla}: A ve {n} filas de B")
        finally:
            await c.close()

    assert probadas >= 20, f"solo se pudieron sembrar {probadas} tablas"
    assert not fugas, f"lectura cruzada entre inquilinos SaaS: {fugas}"


async def test_el_inquilino_a_no_puede_borrar_lo_de_b(entorno):
    """BORRADO. Un aislamiento que solo tapa la lectura deja al vecino destruir
    lo que no puede ver — y sin verlo, ni siquiera se entera de lo que borro."""
    adm, tenants = entorno["adm"], entorno["tenants"]
    fugas, probadas = [], 0

    for tabla in entorno["tablas"]:
        if not await _sembrar(adm, tabla, tenants["B"]):
            continue
        probadas += 1
        c = await _como_app(entorno["dsn_app"], entorno["propietarios"]["A"])
        try:
            await c.execute(f'DELETE FROM public."{tabla}" WHERE tenant_id = $1',
                            tenants["B"])
        except Exception:  # noqa: BLE001
            pass          # que falle esta bien; lo que importa es la fila
        finally:
            await c.close()

        quedan = await adm.fetchval(
            f'SELECT count(*) FROM public."{tabla}" WHERE tenant_id = $1', tenants["B"])
        if not quedan:
            fugas.append(f"{tabla}: A borro la fila de B")

    assert probadas >= 20, f"solo se pudieron sembrar {probadas} tablas"
    assert not fugas, f"borrado cruzado entre inquilinos SaaS: {fugas}"


async def test_el_inquilino_a_no_puede_escribir_a_nombre_de_b(entorno):
    """INSERCION. Sin `WITH CHECK`, A podria crear filas etiquetadas como de B:
    datos que B ve como suyos y no puso."""
    tenants = entorno["tenants"]
    fugas, probadas = [], 0

    for tabla in entorno["tablas"]:
        c = await _como_app(entorno["dsn_app"], entorno["propietarios"]["A"])
        try:
            await c.execute(
                f'INSERT INTO public."{tabla}" (tenant_id) VALUES ($1)', tenants["B"])
        except Exception as exc:  # noqa: BLE001
            if "policy" in str(exc).lower() or "row-level" in str(exc).lower():
                probadas += 1        # denegado por la politica: correcto
            continue
        finally:
            await c.close()

        probadas += 1
        n = await entorno["adm"].fetchval(
            f'SELECT count(*) FROM public."{tabla}" WHERE tenant_id = $1', tenants["B"])
        if n:
            fugas.append(f"{tabla}: A inserto una fila a nombre de B")

    assert probadas >= 20, f"solo se probaron {probadas} tablas"
    assert not fugas, f"insercion cruzada entre inquilinos SaaS: {fugas}"


async def test_el_inquilino_a_si_ve_lo_suyo(entorno):
    """CONTROL. Que A no vea nada podria significar que RLS lo tapa TODO.

    Sin esta prueba, una politica rota que denegara siempre pasaria las tres
    anteriores en verde mientras el producto no funciona para nadie.
    """
    adm, tenants = entorno["adm"], entorno["tenants"]
    invisibles, probadas = [], 0

    for tabla in entorno["tablas"]:
        if not await _sembrar(adm, tabla, tenants["A"]):
            continue
        probadas += 1
        c = await _como_app(entorno["dsn_app"], entorno["propietarios"]["A"])
        try:
            n = await c.fetchval(
                f'SELECT count(*) FROM public."{tabla}" WHERE tenant_id = $1',
                tenants["A"])
            if not n:
                invisibles.append(tabla)
        finally:
            await c.close()

    assert probadas >= 20, f"solo se pudieron sembrar {probadas} tablas"
    assert not invisibles, (
        f"el inquilino NO ve sus propias filas en {len(invisibles)} tablas: "
        f"{invisibles[:12]}. RLS estaria denegando a todo el mundo, y las pruebas "
        f"de aislamiento pasarian en verde con el producto roto.")


# ═══════════════════════════════════════════════════════════════════════════
# Dos familias de politicas sobre la misma tabla ENSANCHAN el acceso
# ═══════════════════════════════════════════════════════════════════════════


async def test_ninguna_tabla_tiene_dos_familias_de_politicas(entorno):
    """En PostgreSQL, varias politicas PERMISSIVE para el mismo comando se
    combinan con **OR**. Dos familias sobre una tabla no la protegen el doble:
    la hacen alcanzable por CUALQUIERA de los dos caminos.

    COMO APARECIO
    -------------
    `api_keys` e `invoices` tienen `workspace_id` INTEGER **y** `tenant_id` UUID.
    La 566 les dio la familia `_os_*` y la primera version de la 567 les anadio
    encima la `_saas_tenant*`: ocho politicas, cuatro de cada una. Revisando el
    SQL no se veia; se vio mirando el catalogo DESPUES de aplicar.

    Una tabla que vive en los dos espacios de identidad necesita una decision
    explicita sobre cual manda, no dos politicas sumandose.
    """
    dobles = await entorno["adm"].fetch("""
        SELECT tablename,
               count(*) FILTER (WHERE policyname LIKE '%_os_select')          AS os,
               count(*) FILTER (WHERE policyname LIKE '%_saas_tenant_select') AS saas,
               count(*) FILTER (WHERE policyname LIKE '%_select_own')         AS own
          FROM pg_policies
         WHERE schemaname = 'public'
         GROUP BY tablename
        HAVING (count(*) FILTER (WHERE policyname LIKE '%_os_select') > 0)::int
             + (count(*) FILTER (WHERE policyname LIKE '%_saas_tenant_select') > 0)::int
             + (count(*) FILTER (WHERE policyname LIKE '%_select_own') > 0)::int > 1
         ORDER BY 1
    """)
    detalle = [
        "{}: os={} saas={} own={}".format(r["tablename"], r["os"], r["saas"], r["own"])
        for r in dobles
    ]
    assert not dobles, (
        f"estas tablas tienen mas de una familia de politicas de SELECT: "
        f"{detalle}. Al ser PERMISSIVE se combinan con OR, asi que la fila es "
        f"alcanzable por cualquiera de los caminos: ensancha el acceso en vez de "
        f"restringirlo. Hay que decidir explicitamente cual manda.")
