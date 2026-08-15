"""La cadena de migraciones no puede exigir nada que no cree ella misma.

EL FALLO QUE ESTO IMPIDE
------------------------
Sobre el PostgreSQL virgen que Railway aprovisiono para staging, el despliegue
murio en pre-deploy:

    [migrate] run: 023_support_tickets.sql
    [migrate] FATAL: schema "auth" does not exist   (SQLSTATE 3F000)

Y no era uno. Reproducido en local sobre base vacia, con un ejecutor que sigue
tras cada error para verlos todos: DIECISIETE fallos, nueve de ellos el mismo en
cascada —la 279 crea `nelvyon_jwt_user_id()` y no llegaba a aplicarse, asi que
caian 311 y 322; la 311 crea `nelvyon_current_saas_tenant_uuid()`, asi que caian
313 y 515—. Mas `pgcrypto` para la 452 y la tabla `workflows` para la 518.

POR QUE NINGUNA CERTIFICACION LO VIO
------------------------------------
`scripts/pg-cert-db.mjs` aplica cuatro shims ANTES de migrar, y entre ellos crea
el schema `auth`. Todas las corridas «desde cero» partian de una base que ya
tenia lo que faltaba. El camino real —PostgreSQL recien creado— no se probaba.

Ahora esos prerrequisitos viven en `000_bootstrap_prerequisites.sql`, dentro de
la cadena, que es donde el despliegue los busca.

QUE COMPRUEBA ESTE FICHERO
--------------------------
Sin base de datos: que el bootstrap siga declarando lo que la cadena necesita y
que ninguna migracion nueva introduzca una dependencia que nadie crea.

Con `NELVYON_PG_VIRGEN_DSN`: la prueba de verdad, aplicando la cadena entera
sobre una base vacia. Se salta si no hay DSN, porque exige crear y destruir una
base.
"""
from __future__ import annotations

import os
import re
from pathlib import Path

import pytest

MIGRACIONES = Path(__file__).resolve().parent.parent / "db" / "migrations"
BOOTSTRAP = MIGRACIONES / "000_bootstrap_prerequisites.sql"

#: Schemas externos que PostgreSQL puro NO trae. Si una migracion los usa, algo
#: tiene que crearlos antes.
_SCHEMAS_EXTERNOS = ("auth", "storage", "extensions", "realtime", "vault", "graphql")

#: Objetos de Supabase/extensiones que tampoco existen de serie.
_OBJETOS_EXTERNOS = ("pg_net", "supabase", "pgsodium")

_COMENTARIO = re.compile(r"--[^\n]*")


def _sql(fichero: Path) -> str:
    return _COMENTARIO.sub("", fichero.read_text(encoding="utf-8", errors="replace"))


def test_el_bootstrap_existe_y_ordena_primero():
    """Si no ordena el primero, no sirve: la 023 correria antes."""
    assert BOOTSTRAP.exists(), "falta 000_bootstrap_prerequisites.sql"
    primero = sorted(p.name for p in MIGRACIONES.glob("*.sql"))[0]
    assert primero == BOOTSTRAP.name, f"la primera migracion es {primero}"


def test_el_bootstrap_declara_lo_que_la_cadena_necesita():
    """Los cuatro prerrequisitos, cada uno por su fallo concreto."""
    sql = _sql(BOOTSTRAP).lower()
    assert "create schema if not exists auth" in sql, "023/024/026/027/279"
    assert "function auth.uid()" in sql, "`nelvyon_jwt_user_id()` la envuelve"
    assert "create extension if not exists pgcrypto" in sql, "452: gen_random_bytes"
    assert "create table if not exists workflows" in sql, "518: ALTER sobre workflows"
    for rol in ("authenticated", "anon"):
        assert f"create role {rol}" in sql, f"los GRANT ... TO {rol} fallan sin el rol"


def test_auth_uid_no_es_un_sello_vacio():
    """`SELECT NULL` seria el adorno que falsea el modelo.

    `nelvyon_jwt_user_id()` hace `COALESCE(auth.uid(), <claim sub>)`. Si
    `auth.uid()` devolviera siempre NULL, la identidad de NELVYON quedaria
    definida sobre una funcion muerta. Se implementa con la semantica real de
    Supabase: el `sub` del JWT de la sesion.
    """
    sql = _sql(BOOTSTRAP)
    cuerpo = sql[sql.index("FUNCTION auth.uid()"):]
    cuerpo = cuerpo[: cuerpo.index("$$;") + 3]
    assert "request.jwt.claim.sub" in cuerpo, (
        "auth.uid() debe leer el claim, no devolver NULL"
    )
    assert not re.search(r"SELECT\s+NULL::uuid", cuerpo, re.IGNORECASE), (
        "auth.uid() es un sello vacio"
    )


def test_el_bootstrap_no_destruye_nada():
    """Ordena el primero, asi que en produccion corre sobre una base llena."""
    sql = _sql(BOOTSTRAP).upper()
    for destructivo in ("DROP TABLE", "DROP SCHEMA", "DROP FUNCTION", "DELETE FROM",
                        "TRUNCATE", "DROP COLUMN", "DROP ROLE"):
        assert destructivo not in sql, f"el bootstrap hace {destructivo}"


def _migraciones_que_usan(prefijos: tuple[str, ...]) -> dict[str, set[str]]:
    """Migraciones que referencian un schema/objeto externo, y cual."""
    fuera: dict[str, set[str]] = {}
    for fichero in sorted(MIGRACIONES.glob("*.sql")):
        if fichero.name == BOOTSTRAP.name:
            continue
        sql = _sql(fichero)
        for prefijo in prefijos:
            if re.search(rf"\b{prefijo}\.", sql) or re.search(
                rf"\bEXTENSION\s+(IF\s+NOT\s+EXISTS\s+)?\"?{prefijo}\"?", sql, re.I
            ):
                fuera.setdefault(fichero.name, set()).add(prefijo)
    return fuera


def test_ninguna_migracion_usa_un_schema_que_nadie_crea():
    """La familia entera, no solo la 023.

    Si una migracion nueva usa `storage.` o `vault.`, este test lo dice antes de
    que Railway lo descubra a mitad de despliegue.
    """
    usos = _migraciones_que_usan(_SCHEMAS_EXTERNOS)
    bootstrap = _sql(BOOTSTRAP).lower()
    sin_cubrir = {
        fichero: sorted(s for s in schemas
                        if f"create schema if not exists {s}" not in bootstrap)
        for fichero, schemas in usos.items()
    }
    sin_cubrir = {k: v for k, v in sin_cubrir.items() if v}
    assert not sin_cubrir, (
        "migraciones que usan un schema que ninguna crea:\n  "
        + "\n  ".join(f"{k}: {v}" for k, v in sorted(sin_cubrir.items()))
    )


def test_ninguna_migracion_depende_de_supabase_especifico():
    """`pg_net`, `pgsodium` y compania no existen en PostgreSQL puro."""
    usos = _migraciones_que_usan(_OBJETOS_EXTERNOS)
    assert not usos, (
        "migraciones que dependen de objetos exclusivos de Supabase:\n  "
        + "\n  ".join(f"{k}: {sorted(v)}" for k, v in sorted(usos.items()))
    )


def test_el_detector_encuentra_el_uso_conocido_de_auth():
    """Control positivo: si el barrido dejara de ver `auth.`, daria verde vacio.

    `023_support_tickets.sql` usa `auth.uid()` en sus politicas RLS. Es el caso
    que rompio el despliegue, y tiene que seguir siendo visible.
    """
    usos = _migraciones_que_usan(("auth",))
    assert "023_support_tickets.sql" in usos, "el detector no ve `auth.`"
    assert len(usos) >= 5, f"solo {len(usos)} migraciones detectadas usando auth"


def test_el_detector_no_marca_lo_que_no_toca():
    """Control negativo: una migracion sin schemas externos no debe aparecer."""
    usos = _migraciones_que_usan(_SCHEMAS_EXTERNOS)
    assert "531_tenant_filter_indexes.sql" not in usos


# ───────────────────────────── la prueba de verdad, con PostgreSQL

DSN_VIRGEN = os.environ.get("NELVYON_PG_VIRGEN_DSN")


@pytest.mark.skipif(
    not DSN_VIRGEN,
    reason=(
        "requiere una PostgreSQL VACIA, sin shims, para reproducir el "
        "aprovisionamiento de Railway; exportar NELVYON_PG_VIRGEN_DSN"
    ),
)
def test_la_cadena_completa_aplica_sobre_una_base_virgen():
    """Ni un shim. Lo que Railway hace de verdad.

    Se comprueba que los objetos que faltaban EXISTEN despues de migrar, que es
    la propiedad, en vez de reaplicar la cadena entera aqui —eso tarda minutos y
    ya lo hace `scripts/pg-cert-db.mjs` sin shims.
    """
    psycopg2 = pytest.importorskip("psycopg2")
    conn = psycopg2.connect(DSN_VIRGEN)
    try:
        cur = conn.cursor()
        cur.execute("SELECT count(*) FROM pg_namespace WHERE nspname = 'auth'")
        assert cur.fetchone()[0] == 1, "el schema auth no se creo"

        cur.execute(
            "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace "
            "WHERE n.nspname = 'auth' AND p.proname = 'uid'"
        )
        assert cur.fetchone()[0] == 1, "auth.uid() no existe"

        cur.execute("SELECT count(*) FROM pg_extension WHERE extname = 'pgcrypto'")
        assert cur.fetchone()[0] == 1, "falta pgcrypto: la 452 no habria aplicado"

        cur.execute("SELECT to_regclass('public.workflows') IS NOT NULL")
        assert cur.fetchone()[0], "falta workflows: la 518 no habria aplicado"

        # Las funciones de identidad de NELVYON, que dependian de `auth`.
        for funcion in ("nelvyon_jwt_user_id", "nelvyon_current_saas_tenant_uuid"):
            cur.execute(
                "SELECT count(*) FROM pg_proc p JOIN pg_namespace n "
                "ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = %s",
                (funcion,),
            )
            assert cur.fetchone()[0] >= 1, f"{funcion}() no se creo: la cascada sigue"

        # Y que la cadena entera quedo registrada.
        cur.execute("SELECT count(*) FROM _migrations")
        aplicadas = cur.fetchone()[0]
        assert aplicadas >= 434, f"solo {aplicadas} migraciones aplicadas"
        cur.close()
    finally:
        conn.close()
