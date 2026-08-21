"""El guard que impide repetir el incidente del rol de la aplicacion.

QUE PASO
--------
Un script de verificacion de la migracion 559 ejecuto contra PRODUCCION:

    ALTER ROLE nelvyon_app LOGIN PASSWORD '<aleatoria>'
    ...
    ALTER ROLE nelvyon_app NOLOGIN

`nelvyon_app` es el rol con el que se conecta la aplicacion. Quedo sin LOGIN y
con una contrasena que nadie conservo: `/health/ready` paso a 503 con
`database: error`. Sin clientes reales no hubo impacto; con clientes habria sido
una caida completa.

LA PRUEBA DISCRIMINANTE
-----------------------
No basta con comprobar que el guard existe. Se reproduce el SQL exacto del
script culpable y se exige:

    contra produccion   ->  bloqueado ANTES de ejecutarse
    contra certificacion ->  permitido, porque ahi es la unica forma de probar
                             privilegios con el rol real

Si solo bloqueara, el guard rompería las baterías legitimas de RLS, que
necesitan ese `ALTER ROLE` para conectarse como `nelvyon_app` y comprobar el
aislamiento de verdad.
"""
from __future__ import annotations

import pytest

from tests._guardia_de_roles import (
    ATRIBUTOS_PROHIBIDOS,
    RolDeProduccionIntocable,
    comprobar,
    es_destino_de_certificacion,
)

import re as _re

#: Reconoce cualquier sentencia que cree, altere o borre un rol. Se comparte
#: entre los inventarios de abajo para que no vuelvan a divergir.
PATRON_ROL = _re.compile(
    r"\b(ALTER|CREATE|DROP)\s+(ROLE|USER)\s+", _re.IGNORECASE)

#: Ficheros donde el SQL de rol aparece como DATO, no como ejecucion: una
#: asercion sobre lo que debe contener una migracion, o una lista de palabras
#: peligrosas. No ejecutan nada, asi que no tienen que llamar al guard —pero se
#: declaran aqui a proposito para que la exencion sea visible y revisable, en vez
#: de un hueco silencioso en el patron.
SOLO_MENCIONAN = {
    # comprueba que las migraciones creen `authenticated` y `anon`; el SQL es la
    # cadena que se inspecciona, no algo que esta bateria ejecute
    "test_migrations_run_on_virgin_postgres.py",
}

#: El SQL exacto que causo el incidente.
SQL_CULPABLE = "ALTER ROLE nelvyon_app LOGIN PASSWORD 'verif559_abc123'"
SQL_CULPABLE_2 = "ALTER ROLE nelvyon_app NOLOGIN"

#: Un destino de produccion real, con la forma que tiene el de NELVYON.
DSN_PRODUCCION = "postgresql://postgres:x@postgres.railway.internal:5432/railway"
DSN_PROXY = "postgresql://postgres:x@turntable.proxy.rlwy.net:41234/railway"
DSN_CERT = "postgresql://nelvyon_local:x@localhost:5434/nelvyon_cert545"


# ═══════════════════════════════════════════════════════════════════════════
# El script anterior HABRIA podido tocar el rol
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.parametrize("sql", [SQL_CULPABLE, SQL_CULPABLE_2])
def test_el_sql_culpable_queda_bloqueado_contra_produccion(sql):
    """LA PRUEBA DISCRIMINANTE, primera mitad.

    Este es literalmente el SQL que dejo `/health/ready` en 503. Contra un
    destino de produccion tiene que fallar ANTES de ejecutarse.
    """
    with pytest.raises(RolDeProduccionIntocable) as exc:
        comprobar(sql, DSN_PRODUCCION)
    assert "nelvyon_app" in str(exc.value)
    assert "503" in str(exc.value), (
        "el mensaje no explica que paso: quien lo lea dentro de un año tiene que "
        "entender por que esta prohibido, no solo que lo esta")


@pytest.mark.parametrize("sql", [SQL_CULPABLE, SQL_CULPABLE_2])
def test_tambien_por_el_proxy_publico(sql):
    """El incidente ocurrio por el proxy publico, no por el host interno."""
    with pytest.raises(RolDeProduccionIntocable):
        comprobar(sql, DSN_PROXY)


def test_el_mismo_sql_si_se_permite_en_certificacion():
    """LA PRUEBA DISCRIMINANTE, segunda mitad — y la mas importante.

    Sin esto el guard seria una prohibicion total, y romperia las baterias de
    RLS: necesitan ese `ALTER ROLE` para conectarse como `nelvyon_app` y
    comprobar el aislamiento con el rol de verdad, en vez de leer el catalogo de
    privilegios y creerselo.
    """
    comprobar(SQL_CULPABLE, DSN_CERT)      # no lanza
    comprobar(SQL_CULPABLE_2, DSN_CERT)    # no lanza


# ═══════════════════════════════════════════════════════════════════════════
# Cobertura de atributos
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.parametrize("atributo", [
    "LOGIN", "NOLOGIN", "BYPASSRLS", "NOBYPASSRLS", "SUPERUSER",
    "CREATEROLE", "CREATEDB", "REPLICATION",
])
def test_ningun_atributo_peligroso_se_escapa(atributo):
    with pytest.raises(RolDeProduccionIntocable):
        comprobar(f"ALTER ROLE nelvyon_app {atributo}", DSN_PRODUCCION)


def test_alter_role_inofensivo_no_se_bloquea():
    """Control negativo: un guard que bloquea todo acaba desactivado."""
    comprobar("ALTER ROLE nelvyon_app SET search_path = public", DSN_PRODUCCION)
    comprobar("ALTER ROLE nelvyon_app RESET statement_timeout", DSN_PRODUCCION)


def test_una_sentencia_que_no_es_alter_role_pasa():
    comprobar("SELECT * FROM workspaces", DSN_PRODUCCION)
    comprobar("GRANT SELECT ON os_clients TO nelvyon_app", DSN_PRODUCCION)


def test_alter_user_tambien_cuenta():
    """`ALTER USER` es sinonimo de `ALTER ROLE`: mismo daño, otra palabra."""
    with pytest.raises(RolDeProduccionIntocable):
        comprobar("ALTER USER nelvyon_app NOLOGIN", DSN_PRODUCCION)


# ═══════════════════════════════════════════════════════════════════════════
# Como se decide que es produccion: fail-closed
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.parametrize("dsn,esperado", [
    ("postgresql://u:p@localhost:5434/nelvyon_cert545", True),
    ("postgresql://u:p@127.0.0.1:5432/nelvyon_test", True),
    ("postgresql://u:p@postgres.railway.internal:5432/railway", False),
    ("postgresql://u:p@turntable.proxy.rlwy.net:41234/railway", False),
    ("", False),
    ("postgresql://u:p@algun-host-remoto/nelvyon_cert", False),
])
def test_solo_es_certificacion_si_lo_demuestra(dsn, esperado):
    """Fail-closed: ante la duda, produccion.

    Un host remoto con «cert» en el nombre de la base NO basta: el dia que la
    certificacion se mueva fuera de localhost habra que declararlo a proposito,
    y eso es mucho mejor que dejar pasar produccion por defecto.
    """
    assert es_destino_de_certificacion(dsn) is esperado


def test_sin_dsn_se_asume_produccion():
    """No saber a donde se apunta es la peor razon posible para permitirlo."""
    with pytest.raises(RolDeProduccionIntocable):
        comprobar(SQL_CULPABLE, "")


# ═══════════════════════════════════════════════════════════════════════════
# El guard se usa donde tiene que usarse
# ═══════════════════════════════════════════════════════════════════════════


def test_las_baterias_que_tocan_roles_estan_declaradas():
    """Inventario vivo de quien hace `ALTER ROLE`.

    Si aparece una bateria nueva que toca roles, esta prueba obliga a mirarla y
    a decidir si debe llamar al guard. Sin el inventario, la siguiente se
    escribiria sin que nadie lo notara — que es exactamente como paso la primera
    vez.
    """
    import pathlib
    import re

    raiz = pathlib.Path(__file__).resolve().parent
    conocidas = {
        "test_rls_activacion_parcial.py",
        "test_rls_privilegios_barrido_rol_real.py",
        "test_rls_lote_560_cross_tenant.py",
        "test_rls_pertenencia_561.py",
        "test_gobierno_no_es_escribible.py",
        "test_gdpr_borrado.py",
        "test_provisioning_de_inquilinos.py",
        "_rol_de_barrido.py",
        # El guard y su bateria contienen el patron porque hablan DE el: sus
        # constantes y sus casos de prueba llevan `ALTER ROLE` como texto. Un
        # inventario que se cuenta a si mismo no informa de nada.
        "_guardia_de_roles.py",
        "test_guardia_de_roles.py",
        "test_rls_certificacion_sin_bypass.py",
        "test_rls_contexto_completo.py",
        "test_rls_erp_fail_closed.py",
        "test_rls_flujo_completo.py",
        "test_rls_pertenencia_workspace.py",
        "test_rls_politicas_completas.py",
        "test_stripe_webhook_persistencia_rol_restringido.py",
    } | SOLO_MENCIONAN
    # La primera version solo buscaba `ALTER`. Con eso el inventario daba por
    # cubiertas ocho baterias que en realidad hacen `CREATE ROLE` y
    # `DROP ROLE IF EXISTS`: un `DROP ROLE nelvyon_app` contra produccion causa
    # exactamente la misma caida que el incidente.
    patron = PATRON_ROL

    encontradas = set()
    for f in raiz.glob("*.py"):
        texto = f.read_text(encoding="utf-8", errors="replace")
        if patron.search(texto):
            encontradas.add(f.name)

    nuevas = encontradas - conocidas
    assert not nuevas, (
        f"baterias que tocan atributos de rol y no estan declaradas: "
        f"{sorted(nuevas)}. Revisa que apunten SIEMPRE a certificacion y "
        f"anadelas a la lista de arriba.")


def test_ninguna_bateria_apunta_a_produccion_por_defecto():
    """Todas las que tocan roles usan `NELVYON_PG_CERT_DSN`, que es de
    certificacion por definicion. Si alguna leyera `DATABASE_PUBLIC_URL` o
    `DATABASE_URL`, estaria a un `export` de repetir el incidente."""
    import pathlib
    import re

    raiz = pathlib.Path(__file__).resolve().parent
    patron_rol = PATRON_ROL
    #: El guard y su bateria quedan fuera por la misma razon que arriba: el
    #: patron que buscan aparece en su propio codigo fuente.
    propias = {"_guardia_de_roles.py", "test_guardia_de_roles.py"}
    peligrosas = []
    for f in raiz.glob("*.py"):
        if f.name in propias:
            continue
        texto = f.read_text(encoding="utf-8", errors="replace")
        if not patron_rol.search(texto):
            continue
        if re.search(r"DATABASE_PUBLIC_URL|environ\[.DATABASE_URL.\]", texto):
            peligrosas.append(f.name)

    assert not peligrosas, (
        f"estas baterias tocan roles Y leen un DSN que puede ser de produccion: "
        f"{peligrosas}")


# ═══════════════════════════════════════════════════════════════════════════
# Crear y borrar roles cuenta tanto como alterarlos
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.parametrize("sql", [
    "DROP ROLE nelvyon_app",
    "DROP ROLE IF EXISTS nelvyon_app",
    "CREATE ROLE intruso_544 LOGIN",
    "CREATE ROLE cert_tmp LOGIN PASSWORD 'x' NOSUPERUSER NOBYPASSRLS",
])
def test_crear_y_borrar_roles_tambien_esta_prohibido_en_produccion(sql):
    """`DROP ROLE nelvyon_app` deja la aplicacion sin conectarse igual que
    `NOLOGIN`, y un `CREATE ROLE` en produccion mete un principal que nadie
    audito. Ninguno menciona un atributo prohibido, asi que la primera version
    del guard los dejaba pasar."""
    with pytest.raises(RolDeProduccionIntocable):
        comprobar(sql, DSN_PRODUCCION)
    comprobar(sql, DSN_CERT)   # en certificacion son legitimos


def test_comment_on_role_no_se_bloquea():
    """Control negativo del ensanchamiento: `COMMENT ON ROLE` no cambia nada."""
    comprobar("COMMENT ON ROLE nelvyon_app IS 'rol de la aplicacion'",
              DSN_PRODUCCION)


# ═══════════════════════════════════════════════════════════════════════════
# El guard esta CABLEADO, no solo escrito
# ═══════════════════════════════════════════════════════════════════════════


def test_ninguna_bateria_ejecuta_sentencias_de_rol_a_pelo():
    """Un guard que hay que acordarse de llamar no es un guard.

    Cuando se escribio este modulo, CERO baterias lo invocaban: existia, sus
    pruebas pasaban, y no habria impedido nada. Esta prueba exige que toda
    sentencia de rol pase por `alterar_rol`/`alterar_rol_sync`, que comprueban
    el destino antes de ejecutar.
    """
    import pathlib
    import re

    raiz = pathlib.Path(__file__).resolve().parent
    propias = {"_guardia_de_roles.py", "test_guardia_de_roles.py"}
    a_pelo = re.compile(
        r"""(await\s+\w+|\bcur|\bcursor\(\))\.execute\(\s*f?["']"""
        r"""\s*(ALTER|CREATE|DROP)\s+(ROLE|USER)\b""", re.IGNORECASE)

    culpables = []
    for f in sorted(raiz.glob("*.py")):
        if f.name in propias:
            continue
        texto = f.read_text(encoding="utf-8", errors="replace")
        if a_pelo.search(texto):
            culpables.append(f.name)

    assert not culpables, (
        f"estas baterias ejecutan sentencias de rol sin pasar por el guard: "
        f"{culpables}. Usa `alterar_rol(conexion, sql, DSN)` o "
        f"`alterar_rol_sync(cursor, sql, DSN)`.")


def test_toda_bateria_que_toca_roles_importa_el_guard():
    """Complemento del anterior: la lista declarada tiene que estar cableada."""
    import pathlib

    raiz = pathlib.Path(__file__).resolve().parent
    propias = {"_guardia_de_roles.py", "test_guardia_de_roles.py"} | SOLO_MENCIONAN
    sin_guard = []
    for f in sorted(raiz.glob("*.py")):
        if f.name in propias:
            continue
        texto = f.read_text(encoding="utf-8", errors="replace")
        if PATRON_ROL.search(texto) and "_guardia_de_roles" not in texto:
            sin_guard.append(f.name)

    assert not sin_guard, (
        f"tocan roles y no importan el guard: {sin_guard}")


# ═══════════════════════════════════════════════════════════════════════════
# El fallo que desactivo dos guardas en silencio
# ═══════════════════════════════════════════════════════════════════════════


def test_ningun_fichero_tiene_un_backspace_donde_deberia_ir_una_frontera():
    """Una frontera de palabra de regex, escrita en una cadena que no es `raw`,
    produce un BACKSPACE real (0x08) en vez de la frontera.

    Paso justo aqui, tres veces. El patron del guard acabo empezando por ese
    byte y dejo de reconocer ni una sola sentencia. El guard seguia importandose, sus
    otras pruebas seguian pasando, y no bloqueaba nada. El mismo byte aparecio
    en `test_tests_no_capturan_env_al_cargar`, debilitando otra asercion.

    Un byte invisible que convierte un regex en algo que no coincide nunca es
    indistinguible de «no hay problemas», que es exactamente la clase de
    silencio que estas baterias existen para romper.
    """
    import pathlib

    raiz = pathlib.Path(__file__).resolve().parents[1]
    con_backspace = [
        str(f.relative_to(raiz))
        for f in raiz.rglob("*.py")
        if chr(8) in f.read_text(encoding="utf-8", errors="replace")
    ]
    assert not con_backspace, (
        f"backspace literal (0x08) en: {con_backspace}. Casi siempre es un "
        f"`\b` de regex escrito en una cadena sin `r` delante: el patron deja "
        f"de coincidir y la comprobacion pasa a no comprobar nada.")
