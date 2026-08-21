"""Credencial temporal para `nelvyon_jobs`, el rol que ejecuta Autopilot.

POR QUE NO VALE UNA VARIABLE DE ENTORNO
---------------------------------------
Porque el rol NO tiene LOGIN de forma permanente, y no debe tenerlo: asi lo dejo
la migracion 540 y asi lo devuelve `test_rls_activacion_parcial`, que lo rota
como parte de su propia certificacion. Una credencial preparada a mano antes de
la suite deja de funcionar en cuanto ese fichero corre, y las pruebas que
dependian de ella empiezan a fallar por un motivo que no tiene nada que ver con
lo que estaban comprobando. Paso exactamente eso.

QUE HACE ESTO
-------------
Reparte la credencial justo cuando hace falta y la retira al terminar, con la
misma clave de certificacion que ya usa la fixture `rol_jobs`. Es idempotente y
no depende del orden en que pytest recorra los ficheros.

LO QUE NO HACE
--------------
No concede ni un privilegio. Los privilegios los ponen las migraciones 544, 549,
554 y 555; si faltan, las pruebas tienen que fallar. Una fixture que se concede a
si misma los permisos que deberia estar verificando no verifica nada.
"""
from __future__ import annotations

from tests._guardia_de_roles import alterar_rol

#: La misma que usa `test_rls_activacion_parcial.rol_jobs`. Solo existe en bases
#: de certificacion locales; produccion reparte la suya por variable de entorno.
CLAVE_CERT = "nelvyon_jobs_cert"


def _con_rol(dsn: str, clave: str) -> str:
    """Reescribe el DSN para entrar como `nelvyon_jobs`."""
    cuerpo = dsn.split("://", 1)[1]
    return f"postgresql://nelvyon_jobs:{clave}@{cuerpo.split('@', 1)[1]}"


async def dar_login(dsn_admin: str) -> str | None:
    """Da LOGIN temporal al rol y devuelve su DSN. None si el rol no existe."""
    import asyncpg

    limpio = dsn_admin.replace("postgresql+asyncpg://", "postgresql://")
    c = await asyncpg.connect(limpio, timeout=30)
    try:
        if not await c.fetchval("SELECT 1 FROM pg_roles WHERE rolname='nelvyon_jobs'"):
            return None
        await alterar_rol(
            c, f"ALTER ROLE nelvyon_jobs LOGIN PASSWORD '{CLAVE_CERT}'", limpio)
    finally:
        await c.close()
    return _con_rol(limpio, CLAVE_CERT)


async def retirar_login(dsn_admin: str) -> None:
    """Devuelve el rol a como lo dejo la migracion 540: sin LOGIN."""
    import asyncpg

    limpio = dsn_admin.replace("postgresql+asyncpg://", "postgresql://")
    try:
        c = await asyncpg.connect(limpio, timeout=30)
    except Exception:  # noqa: BLE001
        return
    try:
        await alterar_rol(c, "ALTER ROLE nelvyon_jobs NOLOGIN", limpio)
    except Exception:  # noqa: BLE001
        pass
    finally:
        await c.close()
