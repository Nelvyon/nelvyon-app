"""Toda ruta del web que consulta la base fija antes quien pregunta.

POR QUE HACE FALTA UN INVENTARIO Y NO UNA PRUEBA POR RUTA
----------------------------------------------------------
Son 922 ficheros de ruta. Escribir una prueba por cada uno no se mantendria una
semana, y —peor— una ruta NUEVA no rompería ninguna: nacería sin prueba y sin
contexto, que es exactamente como llega este tipo de deuda.

Lo que se vigila aqui es la COBERTURA: cuantas rutas tocan la base sin fijar
inquilino. Ese numero solo puede bajar. Si sube, alguien ha añadido una ruta que
consultara PostgreSQL sin decir de quien es, y el dia que el rol deje de ser
superusuario esa ruta devolvera cero filas sin un solo error.

EL CONTROL QUE IMPIDE QUE ESTO SEA TEATRO
------------------------------------------
La clasificacion se apoya en una lista de nombres de frontera. Si una de esas
fronteras dejara de llamar a `entrarConInquilino` —al refactorizarla, al
moverla—, las rutas seguirian «pareciendo cubiertas» y el inventario daria verde
con la cobertura rota.

Por eso `test_las_fronteras_declaradas_fijan_el_inquilino` comprueba que CADA
frontera de la lista contiene esa llamada. Sin esa prueba, todo lo demas seria
contar ficheros por su import.

POR QUE HAY EXCEPCIONES Y POR QUE SE DECLARAN UNA A UNA
--------------------------------------------------------
Hay rutas legitimamente sin inquilino: los crons trabajan entre todos, los
webhooks resuelven el suyo del cuerpo firmado, las paginas publicas del embudo o
la tienda no tienen sesion detras. Se declaran por prefijo CON su motivo, para
que la ausencia de contexto sea una decision escrita y no un hueco.
"""
from __future__ import annotations

import pathlib
import re

import pytest

RAIZ = pathlib.Path(__file__).resolve().parents[2]
WEB = RAIZ / "apps" / "web" / "src"

#: Las fronteras que fijan el inquilino, con el fichero donde vive cada una. La
#: segunda mitad es lo que hace comprobable la primera.
FRONTERAS = {
    "requireSaasContext": "backend/saas/saasRequestContext.ts",
    "requireOsWorkspaceAccess": "apps/web/src/lib/osWorkspaceScope.ts",
    "requirePlatformContext": "apps/web/src/lib/platformBffAuth.ts",
    "requirePublicApiContext": "apps/web/src/lib/requirePublicApiContext.ts",
    # `getAuthService` y `authenticate` desembocan las dos en `verifyToken`.
    "getAuthService": "backend/auth/AuthService.ts",
    "authenticate": "backend/auth/AuthService.ts",
    "requirePlatformClaims": "backend/auth/AuthService.ts",
    "requirePlatformAdmin": "backend/auth/AuthService.ts",
}

#: Prefijos de ruta que NO fijan inquilino a proposito, con su razon.
SIN_INQUILINO_A_PROPOSITO = {
    "app/api/cron/": "trabajan entre todos los inquilinos por definicion",
    "app/api/webhooks/": "el inquilino sale del cuerpo firmado del proveedor, no de una sesion",
    "app/api/public/": "superficie publica sin sesion; el inquilino se resuelve del slug o del token",
    "app/api/track/": "pixeles y redirecciones de seguimiento, resueltos por token opaco",
    "app/api/store/": "escaparate publico, resuelto por subdominio",
    "app/api/forms/": "formularios publicos: quien los rellena no tiene sesion",
    "app/api/lms/": "catalogo y matriculas publicas del LMS",
    "app/api/auth/": "es ANTERIOR a la autenticacion: aqui todavia no se sabe quien es",
    "app/api/admin/": "plano de administracion de plataforma, entre inquilinos",
    "app/api/platform/": "plano de plataforma, entre inquilinos",
    "app/api/billing/": "tareas de reparacion y auditoria de precios, entre inquilinos",
    "app/api/scim/": "aprovisionamiento SCIM: el inquilino va en la ruta y la clave",
    "app/api/s/": "encuestas publicas por identificador opaco",
    "app/api/t/": "acortador de enlaces publico",
    "app/api/mcp/": "superficie MCP, con su propia autenticacion",
    "app/api/contact/": "formulario de contacto publico",
    "app/api/waitlist/": "lista de espera publica",
    "app/api/status/": "estado publico del servicio",
    "app/api/os/health/": "sonda de salud: un `SELECT 1` sin inquilino",
    "app/api/saas/campanias/unsubscribe/": "baja de suscripcion por token, sin sesion",
    "app/api/saas/lms/cert/": "certificado LMS verificable publicamente por id",
    "pages/api/os/ws.ts": "puente de websocket",
}

#: Techo de rutas que tocan la base sin fijar inquilino NI estar declaradas.
#: Solo puede bajar.
TECHO_DE_HUECOS = 0

_IMPORTA_BD = ("DbClient", "@nelvyon/saas", "@nelvyon/os-agents",
               "@nelvyon/admin", "@nelvyon/billing")


def _rutas() -> list[pathlib.Path]:
    fuera = []
    for base, es_app in ((WEB / "app" / "api", True), (WEB / "pages" / "api", False)):
        if base.exists():
            fuera += [f for f in base.rglob("*.ts*") if not es_app or f.stem == "route"]
    return fuera


def _huecos() -> list[str]:
    """Rutas que consultan la base, no fijan inquilino y no estan declaradas."""
    fuera = []
    for f in _rutas():
        rel = f.relative_to(WEB).as_posix()
        if any(rel.startswith(p) for p in SIN_INQUILINO_A_PROPOSITO):
            continue
        texto = f.read_text(encoding="utf-8", errors="replace")
        if not any(x in texto for x in _IMPORTA_BD):
            continue
        if any(x in texto for x in FRONTERAS):
            continue
        fuera.append(rel)
    return sorted(fuera)


# ═══════════════════════════════════════════════════════════════════════════
# Los controles, primero: sin ellos lo de abajo no significa nada
# ═══════════════════════════════════════════════════════════════════════════


def test_el_inventario_encuentra_las_rutas():
    """Un glob roto daria cero rutas, cero huecos y un verde vacio."""
    assert len(_rutas()) >= 500, (
        f"solo se encontraron {len(_rutas())} ficheros de ruta: el inventario "
        f"estaria pasando sin mirar el producto")


@pytest.mark.parametrize("frontera,fichero", sorted(FRONTERAS.items()))
def test_las_fronteras_declaradas_fijan_el_inquilino(frontera, fichero):
    """EL CONTROL QUE SOSTIENE TODO LO DEMAS.

    Si una frontera deja de fijar el contexto, las rutas que la usan seguirian
    contandose como cubiertas y el inventario daria verde con la cobertura rota.
    Aqui se comprueba que la llamada sigue ahi.
    """
    ruta = RAIZ / fichero
    assert ruta.exists(), f"`{fichero}` no existe: la frontera `{frontera}` se movio"
    texto = ruta.read_text(encoding="utf-8", errors="replace")
    assert "entrarConInquilino(" in texto, (
        f"`{frontera}` vive en `{fichero}` y ese fichero ya no llama a "
        f"`entrarConInquilino`: las rutas que pasan por ahi consultarian sin "
        f"decir quien pregunta, y con RLS activa eso devuelve cero filas sin error")


def test_el_contexto_llega_con_ambito_de_transaccion():
    """Con ambito de sesion seria peor que nada: fuga entre peticiones del pool."""
    fuente = (RAIZ / "backend" / "db" / "contextoDeInquilino.ts").read_text(encoding="utf-8")
    codigo = "\n".join(l for l in fuente.splitlines()
                       if not l.lstrip().startswith(("//", "*", "/*")))
    assert "set_config('app.tenant_id', $1, true)" in codigo
    assert not re.search(r"set_config\([^)]*,\s*false\)", codigo), (
        "hay un `set_config` de ambito de SESION: duraria mas que la peticion y "
        "la siguiente que reutilizara esa conexion heredaria el inquilino")


# ═══════════════════════════════════════════════════════════════════════════
# La cobertura
# ═══════════════════════════════════════════════════════════════════════════


def test_ninguna_ruta_consulta_la_base_sin_decir_quien_pregunta():
    """LA PRUEBA. El numero solo puede bajar."""
    huecos = _huecos()
    assert len(huecos) <= TECHO_DE_HUECOS, (
        f"{len(huecos)} rutas consultan la base sin fijar inquilino y sin estar "
        f"declaradas como excepcion: {huecos[:10]}. O pasan por una frontera que "
        f"lo fije, o se declaran en SIN_INQUILINO_A_PROPOSITO con su motivo.")


def test_las_excepciones_declaradas_siguen_existiendo():
    """Una lista de excepciones con entradas muertas deja de leerse.

    Y cuando deja de leerse, tampoco se mira al añadir una nueva.
    """
    existentes = {f.relative_to(WEB).as_posix() for f in _rutas()}
    for prefijo in SIN_INQUILINO_A_PROPOSITO:
        assert any(r.startswith(prefijo) for r in existentes), (
            f"`{prefijo}` esta declarado como excepcion y ya no hay ninguna ruta "
            f"con ese prefijo: quitalo")


def test_la_mayoria_de_las_rutas_si_fija_contexto():
    """Control positivo del inventario.

    Si un fallo de extraccion hiciera que ninguna ruta pareciera fijar contexto,
    la prueba de arriba tambien daria cero huecos —porque las contaria a todas
    como excepcion— y pareceria bien. Aqui se exige lo contrario: que se vea que
    la mayoria SI lo fija.
    """
    con = sum(1 for f in _rutas()
              if any(x in f.read_text(encoding="utf-8", errors="replace") for x in FRONTERAS))
    assert con >= 500, (
        f"solo {con} rutas pasan por una frontera conocida: el reconocimiento de "
        f"fronteras se rompio y el inventario no vale")
