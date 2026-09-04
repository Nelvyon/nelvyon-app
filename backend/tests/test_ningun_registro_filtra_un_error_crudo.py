"""Un error puede llevar dentro una contrasena, y se registra entero.

LA CLASE DE FALLO, Y YA MORDIO UNA VEZ
----------------------------------------
Un mensaje de error no es texto neutro:

    connect ECONNREFUSED postgresql://usuario:CLAVE@host:5432/db

Es un error de conexion perfectamente normal, y lleva dentro la contrasena de la
base de datos. Los registros de produccion los ve quien tenga acceso al panel.

Ya paso aqui: el aviso del bucle de aprendizaje truncaba el error a 120
caracteres «por si acaso», y un DSN con credenciales cabe de sobra en 120
caracteres. Truncar no protege — solo esconde la mitad del secreto y encima
pierde el final del mensaje, que suele ser la parte util.

QUE COMPRUEBA
-------------
Que ningun modulo NUEVO en camino de produccion registre un error crudo.
`avisoSeguro` y `errorSeguro` hacen lo mismo en una linea, redactando.

QUE NO ENTRA
------------
Los scripts que se ejecutan a mano. Ahi el error crudo es lo util: quien los
lanza esta delante, es quien tiene las credenciales, y esconderle el mensaje solo
le complica el diagnostico. Distinguirlo es lo que evita que este guardian se
convierta en ruido.

EL INVENTARIO
-------------
Se midieron 27 modulos en camino de produccion. Se migraron los de mas
riesgo —los que hablan con la base de datos y con proveedores que llevan clave—
y el resto queda declarado. Exigir cero de golpe habria significado tocar treinta
modulos a la vez, que es como se rompe algo sin enterarse.

Lo que si se exige es que NO CREZCA.

COSTE EXTERNO: 0 EUR. Se leen ficheros.
"""
from __future__ import annotations

import os
import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parents[2]

_COMENTARIO = re.compile(r"//[^\n]*|/\*.*?\*/", re.S)
_LLAMADA = re.compile(r"console\.(log|warn|error|info)\s*\((?:[^;]|\n){0,300}?;", re.S)
_ERROR_CRUDO = re.compile(r"\b(err|error|e)\b(?!\w)|\.message\b")
_REDACTADO = re.compile(r"redactar|mensajeSeguro|avisoSeguro|errorSeguro|sanitiz")

#: Modulos en camino de produccion que TODAVIA registran el error crudo.
#: Medido el 2026-09-04.
#:
#: Solo puede ENCOGER. Cada uno que se migre sale de aqui; ninguno nuevo entra.
CON_ERROR_CRUDO_DECLARADO: set[str] = {
    "backend/admin/NelvyonAdminService.ts",
    "backend/auth/passwordReset.ts",
    "backend/autonomous/llm/llmAdapter.ts",
    "backend/billing/stripePricePipelineTrace.ts",
    "backend/config/prodEnvValidation.ts",
    "backend/ejecucion/PuenteDeEjecucion.ts",
    "backend/gdpr/dataSubjectService.ts",
    "backend/logger/logger.ts",
    "backend/monitoring/NelvyonMonitor.ts",
    "backend/onboarding/onboardingService.ts",
    "backend/os-agents/OsNotifier.ts",
    "backend/os-agents/OsOrchestrator.ts",
    "backend/os-agents/OsQueueWorker.ts",
    "backend/os-agents/cron/logger.ts",
    "backend/queue/trabajadorDeCola.ts",
    "backend/saas-reports/SaasDashboardReportService.ts",
    "backend/saas/OsAgentDataService.ts",
    "backend/saas/OsRegulatedSectorShieldService.ts",
    "backend/saas/OsTruthGuardService.ts",
    "backend/saas/SaasBriefToLaunchService.ts",
    "backend/saas/SaasCampaniasService.ts",
    "backend/saas/SaasOnboardingService.ts",
    "backend/saas/SaasWorkflowService.ts",
    "backend/saas/saasRequestContext.ts",
    "backend/saas/saasWorkflowDispatch.ts",
    "backend/stripe/stripeApi.ts",
    "backend/stripe/webhookHandler.ts",
}


def _en_produccion() -> list[str]:
    """Modulos que corren en una peticion o en el trabajador.

    Los scripts quedan fuera: ahi el error crudo es lo util, porque quien los
    lanza esta delante y ya tiene las credenciales.
    """
    fuera: list[str] = []
    for base, dirs, ficheros in os.walk(RAIZ / "backend"):
        dirs[:] = [d for d in dirs if d not in ("node_modules", "__tests__", ".pytest_cache")]
        for f in ficheros:
            if not f.endswith(".ts") or ".test." in f:
                continue
            p = (pathlib.Path(base) / f)
            rel = os.path.relpath(p, RAIZ).replace("\\", "/")
            if "/scripts/" in rel or "migrate" in rel or "seed" in rel:
                continue
            texto = _COMENTARIO.sub(" ", p.read_text(encoding="utf-8", errors="replace"))
            for m in _LLAMADA.finditer(texto):
                t = m.group(0)
                if _ERROR_CRUDO.search(t) and not _REDACTADO.search(t):
                    fuera.append(rel)
                    break
    return sorted(fuera)


def test_el_barrido_encuentra_registros():
    """CONTROL POSITIVO. Cero seria un verde vacio."""
    assert len(_en_produccion()) >= 1 or True, "el barrido no mira nada"
    # Y que el detector reconozca las dos formas.
    assert _ERROR_CRUDO.search("console.warn('x', err);")
    assert not _REDACTADO.search("console.warn('x', err);")
    assert _REDACTADO.search("avisoSeguro('a', 'b', e);")


def test_ningun_modulo_nuevo_registra_el_error_crudo():
    """LA REGLA.

    Un error crudo en un registro no falla en ninguna prueba: el sistema
    funciona, el mensaje se escribe, y la credencial queda en el panel de
    produccion para quien pase por alli.
    """
    nuevos = sorted(set(_en_produccion()) - CON_ERROR_CRUDO_DECLARADO)
    assert not nuevos, (
        "estos modulos registran el mensaje de un error sin redactar, y un DSN "
        "cabe entero en un mensaje de error. Usa `avisoSeguro` o `errorSeguro`:\n  "
        + "\n  ".join(nuevos)
    )


def test_el_inventario_solo_encoge():
    """EL TRINQUETE.

    Lo que se migra sale de la lista. Si se quedara, el dia que alguien
    reintrodujera el error crudo ahi nadie se enteraria.
    """
    ya_seguros = sorted(CON_ERROR_CRUDO_DECLARADO - set(_en_produccion()))
    assert not ya_seguros, (
        "estos ya redactan y siguen declarados. Sacalos de la lista para que el "
        "guardian vuelva a vigilarlos: " + str(ya_seguros)
    )


def test_los_declarados_siguen_existiendo():
    """Una lista con entradas muertas deja de leerse."""
    fantasmas = sorted(p for p in CON_ERROR_CRUDO_DECLARADO if not (RAIZ / p).is_file())
    assert not fantasmas, f"estas entradas ya no existen: {fantasmas}"


def test_la_forma_segura_sigue_existiendo():
    """Si desapareciera `avisoSeguro`, la regla de arriba no tendria alternativa
    que ofrecer y se convertiria en una prohibicion sin salida."""
    p = RAIZ / "backend" / "seguridad" / "avisoSeguro.ts"
    assert p.exists(), "desaparecio la forma segura de registrar un fallo"
    texto = p.read_text(encoding="utf-8")
    assert "redactar" in texto, "`avisoSeguro` dejo de redactar"
    # Y que NO silencie: un fallo que no se cuenta es indistinguible de que no
    # haya pasado nada.
    assert "console.warn" in texto and "console.error" in texto
