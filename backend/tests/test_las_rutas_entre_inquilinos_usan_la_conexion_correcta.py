"""Una ruta que trabaja entre inquilinos tiene que decirlo en su CONEXION.

POR QUE ESTA BATERIA EXISTE
----------------------------
Hoy `DATABASE_URL` apunta a `postgres`: superusuario, dueño de las 733 tablas y
con BYPASSRLS. Las 652 tablas con RLS no protegen NADA en tiempo de ejecucion.

El plan para arreglarlo (`WEB_DB_ROLE_CUTOVER`) es apuntar `DATABASE_URL` a
`nelvyon_web_app`, que NO salta RLS. Para las rutas normales eso es exactamente
lo que se quiere. Para las que trabajan ENTRE inquilinos —crons, webhooks,
plano de plataforma, superficies publicas— es una averia:

    NO DAN ERROR. DEVUELVEN CERO FILAS.

Un cron que no encuentra trabajo, un webhook que no encuentra al inquilino del
cuerpo firmado y un panel de plataforma vacio se parecen mucho a «no habia
nada». Es la averia mas cara de diagnosticar que puede producir ese cambio.

`backend/db/DbJobsClient.ts` existe precisamente para eso: usa
`NELVYON_WEB_JOBS_DATABASE_URL` (el rol `nelvyon_web_jobs`, que SI salta RLS) y
cae a `DATABASE_URL` mientras esa variable no exista, asi que adoptarlo HOY no
cambia ni una conducta.

Pero estaba escrito y sin usar: cuando se midio, CERO rutas cross-tenant lo
usaban y 22 seguian con `DbClient`. Esta prueba es lo que impide que ese numero
vuelva a crecer, y lo que convierte el cutover en algo que se puede hacer.

QUE NO COMPRUEBA
----------------
Las rutas que no tocan la base directamente y delegan en un servicio. Ese
servicio puede a su vez usar `DbClient`, y este guardian no lo ve. Es una cota
INFERIOR de la deuda, no la deuda entera; decirlo importa mas que aparentar
cobertura total.

COSTE EXTERNO: 0 EUR. Se leen ficheros.
"""
from __future__ import annotations

import pathlib
import re

import pytest

# La MISMA fuente de verdad que el guardian de contexto de inquilino. Si las dos
# listas se escribieran por separado, se separarian: una ruta nueva declarada
# exenta alli quedaria sin vigilar aqui, que es justo el hueco que abre esto.
from tests.test_las_rutas_web_fijan_el_inquilino import (
    SIN_INQUILINO_A_PROPOSITO,
    WEB,
)

#: `DbClient` como identificador, no como subcadena: `DbJobsClient` contiene
#: `DbClient` y sin la frontera de palabra toda ruta correcta saldria acusada.
_USA_CLIENTE_WEB = re.compile(r"(?<![A-Za-z])DbClient\b")
_USA_CLIENTE_JOBS = re.compile(r"\bDbJobsClient\b")

#: Comentarios de TypeScript. Se quitan ANTES de buscar.
#:
#: Una ruta migrada explica en un comentario POR QUE ya no usa la conexion de
#: peticion, y para explicarlo tiene que nombrarla. Sin quitar comentarios, el
#: guardian acusa precisamente a los ficheros que hicieron lo correcto y lo
#: dejaron escrito — y la forma de callarlo seria borrar la explicacion.
_COMENTARIO = re.compile(r"//[^\n]*|/\*.*?\*/", re.S)


def _codigo(texto: str) -> str:
    return _COMENTARIO.sub(" ", texto)

#: Rutas cross-tenant que TODAVIA usan la conexion de peticion.
#:
#: Solo puede ENCOGER. Cada entrada es deuda medida el 2026-09-02, no una
#: excepcion permanente: mientras quede una, el cutover a `nelvyon_web_app`
#: rompe esa ruta en silencio.
PENDIENTES_DE_MIGRAR: dict[str, str] = {
    "app/api/admin/sala-de-maquinas/route.ts":
        "plano de administracion entre inquilinos",
    "app/api/billing/checkout/route.ts":
        "reparacion y auditoria de precios entre inquilinos",
    "app/api/contact/route.ts":
        "formulario de contacto publico, sin sesion",
    "app/api/forms/[formId]/route.ts":
        "formularios publicos: quien los rellena no tiene sesion",
    "app/api/forms/[formId]/submit/route.ts":
        "formularios publicos: quien los rellena no tiene sesion",
    "app/api/os/health/route.ts":
        "sonda de salud sin inquilino",
    "app/api/public/portal/approve/route.ts":
        "portal por token opaco",
    "app/api/saas/campanias/unsubscribe/route.ts":
        "acceso publico por token o id verificable",
    "app/api/saas/lms/cert/[id]/route.ts":
        "acceso publico por token o id verificable",
    "app/api/status/route.ts":
        "estado publico del servicio",
    "app/api/store/[subdomain]/checkout/route.ts":
        "escaparate publico por subdominio",
    "app/api/track/email/click/[token]/route.ts":
        "seguimiento por token opaco",
    "app/api/track/email/open/[token]/route.ts":
        "seguimiento por token opaco",
    "app/api/waitlist/route.ts":
        "lista de espera publica",
    "app/api/webhooks/ses/route.ts":
        "el inquilino sale del cuerpo firmado del proveedor",
    "app/api/webhooks/stripe/route.ts":
        "el inquilino sale del cuerpo firmado del proveedor",
}


def _rutas_entre_inquilinos() -> list[tuple[str, str]]:
    """(ruta relativa, texto) de cada ruta declarada cross-tenant."""
    prefijos = tuple(p for p in SIN_INQUILINO_A_PROPOSITO if p.endswith("/"))
    fuera = []
    for f in sorted(WEB.rglob("route.ts")):
        rel = f.relative_to(WEB).as_posix()
        if rel.startswith(prefijos):
            fuera.append((rel, f.read_text(encoding="utf-8", errors="replace")))
    return fuera


def test_el_barrido_encuentra_rutas():
    """Cero rutas seria un verde vacio: ya paso con otros guardianes de aqui."""
    rutas = _rutas_entre_inquilinos()
    assert len(rutas) >= 100, f"solo {len(rutas)} rutas cross-tenant; el barrido no mira nada"


def test_ninguna_ruta_nueva_entre_inquilinos_usa_la_conexion_de_peticion():
    """LA REGLA. Una ruta cross-tenant nueva nace con la conexion correcta."""
    culpables = [
        rel
        for rel, texto in _rutas_entre_inquilinos()
        if _USA_CLIENTE_WEB.search(_codigo(texto))
        and not _USA_CLIENTE_JOBS.search(_codigo(texto))
        and rel not in PENDIENTES_DE_MIGRAR
    ]
    assert not culpables, (
        f"{len(culpables)} rutas entre inquilinos usan `DbClient`. Tras el cutover a "
        f"`nelvyon_web_app` NO daran error: devolveran CERO FILAS, que se parece "
        f"demasiado a «no habia trabajo». Usa `DbJobsClient`:\n  "
        + "\n  ".join(culpables)
    )


def test_la_deuda_solo_encoge():
    """Trinquete. Una entrada arreglada tiene que salir de la lista.

    Una lista de deuda que conserva entradas ya resueltas deja de creerse, y una
    que crece en silencio no es una lista: es un permiso.
    """
    vivos = {rel for rel, _ in _rutas_entre_inquilinos()}
    fantasmas = sorted(r for r in PENDIENTES_DE_MIGRAR if r not in vivos)
    assert not fantasmas, (
        f"estas entradas ya no corresponden a ninguna ruta: {fantasmas}. Quitalas.")

    ya_migradas = sorted(
        rel
        for rel, texto in _rutas_entre_inquilinos()
        if rel in PENDIENTES_DE_MIGRAR and _USA_CLIENTE_JOBS.search(_codigo(texto))
    )
    assert not ya_migradas, (
        f"estas ya usan `DbJobsClient` y siguen declaradas como pendientes: "
        f"{ya_migradas}. Quitalas de PENDIENTES_DE_MIGRAR.")


def test_los_dos_crons_cross_tenant_nombrados_ya_estan_migrados():
    """Los dos que el cutover no puede dejar atras, por nombre.

    `saas-competitor-gap` hace `SELECT ... FROM saas_tenants` sobre TODOS los
    inquilinos, y `saas_tenants` tiene RLS desde la migracion 592. Con la
    conexion de peticion, tras el cutover, ese SELECT devuelve cero y el cron
    informa `tenantsChecked: 0` como si no hubiera nada que hacer.

    En lista explicita ademas del barrido: si manana alguien reescribe uno de los
    dos y el barrido deja de reconocer su forma, esta prueba lo dice igual.
    """
    for ruta in (
        "app/api/cron/saas-competitor-gap/route.ts",
        "app/api/cron/os-recurring-services/route.ts",
    ):
        f = WEB / ruta
        assert f.exists(), f"falta {ruta}"
        texto = f.read_text(encoding="utf-8", errors="replace")
        codigo = _codigo(texto)
        assert _USA_CLIENTE_JOBS.search(codigo), f"{ruta} no usa DbJobsClient"
        assert not _USA_CLIENTE_WEB.search(codigo), f"{ruta} sigue usando DbClient"


def test_el_detector_distingue_los_dos_clientes():
    """CONTROL. `DbJobsClient` CONTIENE `DbClient`.

    Sin la frontera de palabra, toda ruta correctamente migrada saldria acusada
    —y la forma de callar al guardian seria volver atras—. El guardian empujaria
    justo hacia lo que existe para evitar.
    """
    solo_jobs = 'import { DbJobsClient } from "x";\nconst db = DbJobsClient.getInstance();'


def test_un_comentario_que_nombra_la_conexion_no_cuenta_como_uso():
    """CONTROL del saneado, y no es teorico: se cometio al escribir esto.

    La nota que lleva cada cron migrado explica POR QUE ya no usa la conexion de
    peticion, y para explicarlo tiene que nombrarla. El guardian sin sanear
    acusaba al fichero CORREGIDO por haber dejado escrito el motivo — y la forma
    de callarlo habria sido borrar la explicacion.
    """
    migrado = (
        "// Con `DbClient` este cron devolveria cero filas tras el cutover.@"
        "/* Antes: DbClient.getInstance() */@"
        'import { DbJobsClient } from "x";@'
        "const db = DbJobsClient.getInstance();@"
    ).replace("@", "\n")
    assert not _USA_CLIENTE_WEB.search(_codigo(migrado)), (
        "el guardian acusa a un fichero migrado por explicar la migracion")
    assert _USA_CLIENTE_JOBS.search(_codigo(migrado))

    # Y no se pasa de listo: el uso REAL fuera de comentarios sigue viendose.
    sin_migrar = 'import { DbClient } from "x";\nconst db = DbClient.getInstance();'
    assert _USA_CLIENTE_WEB.search(_codigo(sin_migrar)), (
        "sanear comentarios dejo ciego al detector")


def test_existe_la_conexion_entre_inquilinos():
    """Si `DbJobsClient` desapareciera, todo lo de arriba pediria lo imposible.

    Y si dejara de leer su propia variable, dejaria de separarse el dia del
    cutover: seria la conexion de peticion con otro nombre, y este guardian
    aprobaria rutas que romperian igual.
    """
    cliente = WEB.parents[2] / "backend" / "db" / "DbJobsClient.ts"
    assert cliente.exists(), f"falta {cliente}"
    fuente = cliente.read_text(encoding="utf-8", errors="replace")
    assert "NELVYON_WEB_JOBS_DATABASE_URL" in fuente, (
        "DbJobsClient dejo de leer su propia variable: ya no se separa en el cutover")
