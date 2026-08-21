"""Ningun script de certificacion puede tocar un rol cuando el destino es produccion.

EL INCIDENTE QUE ESTO IMPIDE
----------------------------
Verificando la migracion 559 se ejecuto contra PRODUCCION un script que hacia:

    ALTER ROLE nelvyon_app LOGIN PASSWORD '<aleatoria>'
    ... comprobaciones ...
    ALTER ROLE nelvyon_app NOLOGIN

El patron es correcto EN CERTIFICACION: es la unica forma de comprobar
privilegios con el rol real en vez de leer el catalogo. Pero `nelvyon_app` es el
rol con el que se conecta la aplicacion, y el script lo dejo sin LOGIN y con una
contrasena que nadie conservo. `/health/ready` paso a 503 con `database: error`.

No hubo impacto en clientes porque todavia no hay ninguno. Con clientes habria
sido una caida completa del producto.

POR QUE UN GUARD Y NO «tener mas cuidado»
------------------------------------------
Porque el error no fue de descuido al escribir: fue una suposicion equivocada
—que `nelvyon_app` no era el rol de la aplicacion— y las suposiciones no se
arreglan prometiendo revisarlas. Se arreglan haciendo que la operacion peligrosa
sea imposible contra el destino peligroso.

COMO SE RECONOCE PRODUCCION
---------------------------
Por el HOST, no por el nombre de la base ni por una variable de intencion. Solo
`localhost`/`127.0.0.1`/`[::1]` cuentan como certificacion. Cualquier otra cosa
se trata como produccion: fail-closed.

Se descarto reconocer tambien bases llamadas `*cert*` o `*test*`: el nombre de una
base es una intencion, el host es un hecho, y bastaria una base remota llamada
`nelvyon_cert` para que el guard se apartara justo cuando hace falta. Si un dia la
certificacion se mueve a un host remoto, el guard bloqueara y habra que declararlo
a proposito — mucho mejor que dejar pasar produccion por defecto.
"""
from __future__ import annotations

import re

#: Atributos de rol que ningun script de certificacion debe tocar en produccion.
#: Cada uno puede dejar el producto inaccesible o abrir un agujero:
#:
#:   LOGIN/NOLOGIN     deja a la aplicacion sin poder conectarse
#:   PASSWORD          invalida la credencial que usa el servicio
#:   BYPASSRLS         anula el aislamiento entre inquilinos de golpe
#:   SUPERUSER         convierte cualquier fallo en un compromiso total
#:   CREATEROLE        permite fabricarse un rol con mas privilegios
ATRIBUTOS_PROHIBIDOS = (
    "LOGIN", "NOLOGIN", "PASSWORD", "BYPASSRLS", "NOBYPASSRLS",
    "SUPERUSER", "NOSUPERUSER", "CREATEROLE", "NOCREATEROLE",
    "CREATEDB", "NOCREATEDB", "REPLICATION", "NOREPLICATION",
)

#: `CREATE` y `DROP` van incluidos a proposito. La primera version solo
#: miraba `ALTER`, y con eso el inventario declaraba ocho baterias menos de
#: las que realmente tocan roles: crear un rol en produccion desde un script
#: de certificacion es tan grave como alterarlo, y `DROP ROLE` sobre el rol de
#: la aplicacion produce exactamente la misma caida que el incidente.
_ALTER_ROLE = re.compile(
    r"\b(?:ALTER|CREATE|DROP)\s+(?:ROLE|USER)\s+"
    r"(?:IF\s+(?:NOT\s+)?EXISTS\s+)?[\"']?([a-z_][a-z0-9_]*)"
    r"[\"']?(\s.*|$)",
    re.IGNORECASE | re.DOTALL)

#: Un destino se considera de certificacion solo si es LOOPBACK.
#:
#: La primera version aceptaba tambien cualquier base cuyo nombre llevara «cert»
#: o «test». Eso no es fail-closed: bastaria una base remota llamada
#: `nelvyon_cert` —o un despliegue de produccion con un nombre desafortunado—
#: para que el guard se apartara. El nombre de una base es una intencion; el host
#: es un hecho.
_DE_CERTIFICACION = re.compile(
    r"@(localhost|127\.0\.0\.1|\[::1\])[:/]", re.IGNORECASE)


class RolDeProduccionIntocable(RuntimeError):
    """Se intento cambiar un atributo de rol contra un destino de produccion."""


def es_destino_de_certificacion(dsn: str) -> bool:
    """¿Este DSN apunta a una base desechable? Fail-closed: ante la duda, NO."""
    return bool(dsn) and bool(_DE_CERTIFICACION.search(dsn))


def comprobar(sql: str, dsn: str) -> None:
    """Lanza si `sql` cambia un atributo de rol y `dsn` no es de certificacion.

    Se llama ANTES de ejecutar. Bloquear despues no serviria de nada.
    """
    m = _ALTER_ROLE.search(sql or "")
    if not m:
        return

    verbo = re.match(r"\s*(\w+)", sql).group(1).upper()
    rol, resto = m.group(1), m.group(2).upper()

    if verbo in ("CREATE", "DROP"):
        # No hace falta que mencionen ningun atributo prohibido: `DROP ROLE
        # nelvyon_app` deja a la aplicacion sin poder conectarse igual que
        # `NOLOGIN`, y un `CREATE ROLE` en produccion introduce un principal que
        # nadie ha auditado.
        tocados = [f"{verbo} ROLE"]
    else:
        tocados = [a for a in ATRIBUTOS_PROHIBIDOS if re.search(rf"\b{a}\b", resto)]

    if not tocados:
        return

    if es_destino_de_certificacion(dsn):
        return

    raise RolDeProduccionIntocable(
        f"se intento {sorted(set(tocados))} sobre el rol '{rol}' contra un "
        f"destino que no es de certificacion. Cambiar LOGIN o PASSWORD de "
        f"'{rol}' —o borrarlo— deja a la aplicacion sin poder conectarse: paso el "
        f"2026-08-21 y dejo /health/ready en 503. Si de verdad hace falta, es "
        f"una operacion de mantenimiento con autorizacion, no una comprobacion.")


# ═══════════════════════════════════════════════════════════════════════════
# Como se usa: NUNCA `conexion.execute(sql)` directamente
# ═══════════════════════════════════════════════════════════════════════════
#
# Un guard que hay que acordarse de llamar no es un guard, es una convencion —y
# el incidente ocurrio precisamente porque nadie se acordo—. Estas dos funciones
# existen para que llamarlo sea el camino corto: se pasa el DSN al que se esta
# apuntando y la comprobacion ocurre sola, antes de ejecutar.
#
# `test_guardia_de_roles` exige que toda bateria que contenga `ALTER ROLE`
# importe este modulo, asi que saltarselo rompe la suite.


async def alterar_rol(conexion, sql: str, dsn: str):
    """`ALTER ROLE` sobre una conexion asyncpg, comprobando antes el destino."""
    comprobar(sql, dsn)
    return await conexion.execute(sql)


def alterar_rol_sync(cursor, sql: str, dsn: str, *args, **kwargs):
    """Lo mismo para un cursor psycopg2."""
    comprobar(sql, dsn)
    return cursor.execute(sql, *args, **kwargs)
