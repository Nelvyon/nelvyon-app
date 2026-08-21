"""RLS de verdad: bajo un rol SIN superuser y SIN BYPASSRLS.

POR QUE ESTO NO ESTABA CERTIFICADO
----------------------------------
Todas las certificaciones anteriores corrian con el rol de la aplicacion, que es
superusuario y por tanto tiene `bypassrls`. Con ese rol PostgreSQL NO evalua
ninguna politica: se pueden declarar las que se quiera y el resultado es siempre
el mismo. Es decir, el RLS de NELVYON nunca se habia ejercitado.

QUE SE COMPRUEBA
----------------
`oauth_connections` y `support_tickets` tienen `FORCE ROW LEVEL SECURITY` y sus
politicas discriminan por `auth.uid()`:

    oauth_connections_select_own   SELECT  USING (user_id = auth.uid())
    support_tickets_select_own     SELECT  USING (user_id = auth.uid())
    support_tickets_insert_own     INSERT  WITH CHECK (user_id = auth.uid())

`auth.uid()` —la definida en `000_bootstrap_prerequisites.sql`— devuelve el
`sub` del JWT de la peticion, leido de `request.jwt.claim.sub`.

Se crea un rol sin `SUPERUSER` y sin `BYPASSRLS`, se insertan filas de dos
usuarios distintos y se comprueba, con ese rol, que:

    A ve lo suyo                  (control positivo: sin esto el test pasaria
                                   por vacio aunque RLS denegase todo)
    B ve lo suyo
    A no ve lo de B
    A no puede modificar lo de B
    sin contexto no se ve nada    (fail-closed)
    con contexto manipulado tampoco

LO QUE ESTE TEST DEMUESTRA, Y LO QUE NO
---------------------------------------
Demuestra que las politicas SON correctas y aislan cuando se evaluan.

NO demuestra que protejan hoy en produccion, y conviene no confundirlo: la
aplicacion se conecta con un rol superusuario —asi que las politicas no se
evaluan— y ademas nunca fija `request.jwt.claim.sub`; fija `app.tenant_id` a
traves de `set_tenant_context()`. Con lo cual, si manana se le quitara el
superusuario sin tocar nada mas, `auth.uid()` seria NULL y estas tablas
denegarian TODO.

El aislamiento efectivo hoy lo da el filtrado por workspace/tenant de la
aplicacion —certificado aparte con datos reales A/B—, no PostgreSQL.
"""
from __future__ import annotations

import os
import uuid

import pytest

from tests._guardia_de_roles import alterar_rol_sync

DSN = os.environ.get("NELVYON_PG_CERT_DSN")

pytestmark = pytest.mark.skipif(
    not DSN,
    reason="requiere PostgreSQL real; exportar NELVYON_PG_CERT_DSN",
)

ROL = "nelvyon_rls_cert"
TABLAS = ("oauth_connections", "support_tickets")


@pytest.fixture(scope="module")
def conexiones():
    """Una conexion admin para preparar, y otra con el rol SIN bypass."""
    psycopg2 = pytest.importorskip("psycopg2")

    admin = psycopg2.connect(DSN)
    admin.autocommit = True
    cur = admin.cursor()

    clave = uuid.uuid4().hex
    alterar_rol_sync(cur, f"DROP ROLE IF EXISTS {ROL}", DSN)
    # NOSUPERUSER y NOBYPASSRLS explicitos: son la razon de ser del test.
    alterar_rol_sync(cur, f"CREATE ROLE {ROL} LOGIN PASSWORD %s NOSUPERUSER NOBYPASSRLS", DSN, (clave,))
    cur.execute(f"GRANT USAGE ON SCHEMA public TO {ROL}")
    cur.execute(f"GRANT USAGE ON SCHEMA auth TO {ROL}")
    for t in TABLAS:
        cur.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON public.{t} TO {ROL}")

    # DSN del rol restringido, reutilizando host/puerto/base del admin.
    import re

    dsn_rol = re.sub(r"//[^@]*@", f"//{ROL}:{clave}@", DSN)
    restringido = psycopg2.connect(dsn_rol)
    restringido.autocommit = True

    yield admin, restringido

    restringido.close()
    cur.execute(f"REASSIGN OWNED BY {ROL} TO CURRENT_USER")
    cur.execute(f"DROP OWNED BY {ROL}")
    alterar_rol_sync(cur, f"DROP ROLE IF EXISTS {ROL}", DSN)
    admin.close()


@pytest.fixture(scope="module")
def usuarios(conexiones):
    """Dos filas por tabla, de dos usuarios distintos, creadas como admin."""
    admin, _ = conexiones
    a, b = uuid.uuid4(), uuid.uuid4()
    cur = admin.cursor()
    marca = uuid.uuid4().hex[:8]

    # Las dos tablas tienen clave ajena a `nelvyon_users(user_id)`: los usuarios
    # tienen que existir antes.
    for u, quien in ((a, "a"), (b, "b")):
        cur.execute(
            "INSERT INTO nelvyon_users (user_id, email, password_hash, full_name, plan, "
            "tenant_id, email_verified) VALUES (%s, %s, 'x', %s, 'free', %s, false)",
            (str(u), f"rls-{quien}-{marca}@nelvyon.test", f"RLS {quien}", str(u)),
        )

    # `provider` tiene CHECK sobre un conjunto cerrado (google/meta/tiktok/
    # linkedin), asi que la marca va en `external_account_id`, que es libre.
    cur.execute(
        "INSERT INTO oauth_connections (user_id, provider, access_token, external_account_id) "
        "VALUES (%s, 'google', %s, %s), (%s, 'google', %s, %s)",
        (str(a), "tok-a", f"cuenta-a-{marca}", str(b), "tok-b", f"cuenta-b-{marca}"),
    )
    cur.execute(
        "INSERT INTO support_tickets (user_id, subject, body, category, status, priority) "
        "VALUES (%s, %s, %s, 'other', 'open', 'normal'), "
        "(%s, %s, %s, 'other', 'open', 'normal')",
        (str(a), f"asunto-a-{marca}", "cuerpo", str(b), f"asunto-b-{marca}", "cuerpo"),
    )
    yield {"a": a, "b": b, "marca": marca}
    cur.execute("DELETE FROM oauth_connections WHERE user_id IN (%s, %s)", (str(a), str(b)))
    cur.execute("DELETE FROM support_tickets WHERE user_id IN (%s, %s)", (str(a), str(b)))
    cur.execute("DELETE FROM nelvyon_users WHERE user_id IN (%s, %s)", (str(a), str(b)))


def _como(conn, sub: str | None, sql: str, args=()):
    """Ejecuta `sql` fijando (o no) el `sub` del JWT que lee `auth.uid()`."""
    cur = conn.cursor()
    cur.execute("SELECT set_config('request.jwt.claim.sub', %s, false)", (sub or "",))
    cur.execute(sql, args)
    return cur.fetchall()


def test_el_rol_de_certificacion_no_puede_saltarse_rls(conexiones):
    """Si el rol tuviera bypass, todo lo demas seria teatro."""
    _, restringido = conexiones
    cur = restringido.cursor()
    cur.execute("SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user")
    superusuario, bypass = cur.fetchone()
    assert superusuario is False, "el rol es superusuario: RLS no se evaluaria"
    assert bypass is False, "el rol tiene BYPASSRLS: RLS no se evaluaria"


def test_las_dos_tablas_tienen_rls_forzado(conexiones):
    """`FORCE` importa: sin el, el dueno de la tabla se salta sus propias politicas."""
    admin, _ = conexiones
    cur = admin.cursor()
    for t in TABLAS:
        cur.execute(
            "SELECT relrowsecurity, relforcerowsecurity FROM pg_class c "
            "JOIN pg_namespace n ON n.oid = c.relnamespace "
            "WHERE n.nspname = 'public' AND c.relname = %s",
            (t,),
        )
        activo, forzado = cur.fetchone()
        assert activo, f"{t} no tiene RLS activo"
        assert forzado, f"{t} no tiene FORCE ROW LEVEL SECURITY"


@pytest.mark.parametrize("tabla,columna", [
    ("oauth_connections", "external_account_id"),
    ("support_tickets", "subject"),
])
def test_cada_usuario_ve_lo_suyo(conexiones, usuarios, tabla, columna):
    """CONTROL POSITIVO. Sin el, un RLS que denegara TODO pasaria el test de fuga."""
    _, restringido = conexiones
    for quien in ("a", "b"):
        filas = _como(restringido, str(usuarios[quien]),
                      f"SELECT {columna} FROM {tabla}")
        propios = [f[0] for f in filas if usuarios["marca"] in str(f[0])]
        assert propios, f"{quien} no ve su propia fila en {tabla}: RLS deniega todo"
        assert all(f"-{quien}-" in str(p) for p in propios), (
            f"{quien} ve filas que no son suyas en {tabla}: {propios}"
        )


@pytest.mark.parametrize("tabla,columna", [
    ("oauth_connections", "external_account_id"),
    ("support_tickets", "subject"),
])
def test_ninguno_ve_lo_del_otro(conexiones, usuarios, tabla, columna):
    """La propiedad, en los dos sentidos."""
    _, restringido = conexiones
    for quien, ajeno in (("a", "b"), ("b", "a")):
        filas = _como(restringido, str(usuarios[quien]), f"SELECT {columna} FROM {tabla}")
        fuga = [f[0] for f in filas if f"-{ajeno}-{usuarios['marca']}" in str(f[0])]
        assert not fuga, f"FUGA: {quien} ve filas de {ajeno} en {tabla}: {fuga}"


def test_sin_contexto_no_se_ve_nada(conexiones, usuarios):
    """Fail-closed: `auth.uid()` NULL no puede igualar a ningun `user_id`."""
    _, restringido = conexiones
    for tabla, col in (("oauth_connections", "external_account_id"), ("support_tickets", "subject")):
        filas = _como(restringido, None, f"SELECT {col} FROM {tabla}")
        nuestras = [f[0] for f in filas if usuarios["marca"] in str(f[0])]
        assert not nuestras, f"sin contexto se ven filas de {tabla}: {nuestras}"


def test_contexto_ajeno_no_abre_acceso(conexiones, usuarios):
    """Un `sub` inventado no debe ver nada de A ni de B."""
    _, restringido = conexiones
    intruso = str(uuid.uuid4())
    for tabla, col in (("oauth_connections", "external_account_id"), ("support_tickets", "subject")):
        filas = _como(restringido, intruso, f"SELECT {col} FROM {tabla}")
        nuestras = [f[0] for f in filas if usuarios["marca"] in str(f[0])]
        assert not nuestras, f"un sub ajeno ve filas de {tabla}: {nuestras}"


def test_no_se_puede_modificar_lo_del_otro(conexiones, usuarios):
    """Leer no es lo unico que hay que impedir."""
    _, restringido = conexiones
    cur = restringido.cursor()
    cur.execute("SELECT set_config('request.jwt.claim.sub', %s, false)", (str(usuarios["a"]),))
    cur.execute(
        "UPDATE support_tickets SET subject = 'secuestrado' WHERE user_id = %s",
        (str(usuarios["b"]),),
    )
    assert cur.rowcount == 0, "A ha podido modificar filas de B"

    # Y la fila de B sigue intacta, comprobado como admin.
    admin, _ = conexiones
    ca = admin.cursor()
    ca.execute("SELECT subject FROM support_tickets WHERE user_id = %s", (str(usuarios["b"]),))
    assert "secuestrado" not in str(ca.fetchall()), "la fila de B quedo modificada"


def test_insert_no_puede_suplantar_a_otro(conexiones, usuarios):
    """`WITH CHECK (user_id = auth.uid())`: A no puede crear tickets como B."""
    psycopg2 = pytest.importorskip("psycopg2")
    _, restringido = conexiones
    cur = restringido.cursor()
    cur.execute("SELECT set_config('request.jwt.claim.sub', %s, false)", (str(usuarios["a"]),))
    # PostgreSQL rechaza una violacion de `WITH CHECK` de RLS con
    # `InsufficientPrivilege` ("new row violates row-level security policy"),
    # NO con `CheckViolation` —esa es para los CHECK de columna—. Distinguirlas
    # importa: si el test aceptara cualquier excepcion, un fallo por columna
    # obligatoria se leeria como "RLS funciona".
    with pytest.raises(psycopg2.errors.InsufficientPrivilege):
        cur.execute(
            "INSERT INTO support_tickets (user_id, subject, body, category, status, priority) "
            "VALUES (%s, %s, %s, 'other', 'open', 'normal')",
            (str(usuarios["b"]), "suplantado", "cuerpo"),
        )
