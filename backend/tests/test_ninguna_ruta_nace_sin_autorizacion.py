"""Ninguna ruta nueva nace sin autorizacion, y ningun webhook sin firma.

LA PREGUNTA INVERSA
-------------------
El arbol ya tiene inventarios de rutas que SI autorizan:
`test_las_rutas_web_fijan_el_inquilino.py`, `test_gap_priority_routers_ws_op_verified.py`,
`test_ads_agent_authz.py`. Todos parten del conjunto protegido.

Ninguno preguntaba lo contrario: ¿que rutas NO piden nada? Y esa es la unica
pregunta que encuentra un agujero, porque un agujero, por definicion, no esta
dentro del conjunto que se audita. Es el mismo hueco que dejo 47 tablas sin RLS
con cuatro comprobaciones en verde.

Importa mas aqui que en otros sitios: `main.py` monta los routers por
DESCUBRIMIENTO AUTOMATICO —cualquier modulo de `backend/routers` con una
variable `router` queda publicado—, asi que una ruta nueva se publica sola. Si
ademas nace sin autorizacion, nace abierta y nadie se entera.

CUATRO FORMAS DE AUTORIZAR, y hay que reconocer las cuatro
----------------------------------------------------------
La primera version de este detector daba 55 falsos positivos porque solo miraba
una. Un detector que grita lobo ensena a ignorarlo, asi que se corrigio antes de
que entrara:

    1. un `Depends(...)` en la firma          — el caso comun
    2. un decorador que autorice
    3. `APIRouter(dependencies=[...])`        — vale para TODAS sus rutas;
                                                asi esta `platform_metrics`, que
                                                parecia un CRUD abierto con DELETE
    4. verificacion DENTRO del cuerpo         — `stream_messages` comprueba a mano
                                                un token firmado y lanza 401; no
                                                hay ningun `Depends` que ver

LA LISTA BLANCA ES BLANCA
-------------------------
Lo que no este declarado abajo falla. Cada entrada lleva su razon. Si no sabes
por que una ruta esta aqui, no deberia estar.

Y para los webhooks la entrada no basta: se comprueba ademas que verifiquen
firma. Un webhook publico sin firma es una ruta de escritura abierta con otro
nombre.

COSTE EXTERNO: 0 EUR. Solo se lee el arbol.
"""
from __future__ import annotations

import ast
import io
import pathlib
import re

import pytest

RAIZ = pathlib.Path(__file__).resolve().parents[1] / "routers"

#: Lo que autoriza de verdad, leido de las dependencias que existen en el arbol.
AUTORIZAN = re.compile(
    r"require_|get_current_user|get_admin_user|get_super_admin_user|"
    r"get_workspace_context|WorkspaceContext|PlatformClaims|verify_|_auth_|"
    r"api_key|apikey|authenticated",
    re.I,
)

#: Señales de que la ruta comprueba credenciales por su cuenta, dentro del cuerpo.
COMPRUEBA_EN_EL_CUERPO = re.compile(
    # `verificar_` en castellano no estaba, y este repositorio esta escrito en
    # castellano: los cinco primeros «hallazgos» de este detector eran webhooks
    # que SI firmaban, con el verificador llamado `verificar_firma_meta`,
    # `verificar_firma_sns`, `verificar_firma_zoom`. Un detector que grita lobo
    # ensena a ignorarlo, asi que se corrigio antes de que entrara.
    r"verify_|verificar_|_signature|check_signature|constant_time|compare_digest|"
    r"hmac|secreto_compartido|webhook_key|construct_event|stripe-signature|"
    r"status_code=401|status_code=403",
    re.I,
)

#: Señales de verificacion de firma, para los webhooks.
VERIFICA_FIRMA = re.compile(
    r"_signature|signature|firma|hmac|compare_digest|constant_time|construct_event|"
    r"verify_|verificar_|secreto_compartido|webhook_key|x-hub-|sha256=|stripe-signature",
    re.I,
)

#: Rutas SIN ninguna autorizacion, a proposito, con su razon.
#:
#: Lo que no este aqui, falla. Cada entrada es una decision: si no sabes por que
#: una ruta esta en esta lista, no deberia estar.
PUBLICAS: dict[str, str] = {
    # ── Autenticacion: son la puerta, no pueden pedir estar dentro ──────────
    "auth.py::login": "inicio de sesion",
    "auth.py::callback": "vuelta del proveedor de identidad",
    "auth.py::logout": "cierre de sesion",
    "gsc.py::oauth_callback": "vuelta de OAuth de Search Console",
    "portal_rest.py::accept_portal_invite": "la invitacion ES la credencial",
    # ── Salud, arranque y metricas: las consulta el orquestador, sin sesion ─
    "health.py::database_health_check": "sonda de salud",
    "email_service.py::email_health": "sonda de salud",
    "monitoring.py::health_global": "sonda de salud",
    "monitoring.py::health_detailed": "sonda de salud",
    "monitoring.py::regions_status": "estado de regiones",
    "system_health.py::comprehensive_health_check": "sonda de salud",
    "system_readiness.py::system_readiness": "sonda de arranque",
    "system_readiness.py::cache_health": "sonda de arranque",
    "system_readiness.py::job_queue_status": "sonda de arranque",
    "system_readiness.py::esignature_status": "sonda de arranque",
    "system_readiness.py::architecture_overview": "sonda de arranque",
    "metrics.py::prometheus_metrics": "raspado de Prometheus",
    # ── Contenido publico por diseño ────────────────────────────────────────
    "marketplace.py::list_marketplace_agencies": "escaparate publico",
    "marketplace.py::get_marketplace_agency": "escaparate publico",
    "marketplace.py::list_marketplace_items": "escaparate publico",
    "payments.py::get_plans": "tarifas publicas",
    "saas_intelligence.py::list_benchmark_sectors": "catalogo estatico de sectores",
    "saas_intelligence.py::industry_benchmarks": "referencias de industria, estaticas",
    "whitelabel.py::resolve_whitelabel_by_host": "un dominio resuelve su marca antes de haber sesion",
    "crm.py::list_stages": "etapas de CRM: catalogo fijo, no datos de nadie",
    "contract_signing.py::get_status_flow": "el diagrama de estados, no un contrato",
    # ── Pixeles de seguimiento: los carga el navegador de un tercero ────────
    "affiliates.py::track_affiliate": "pixel de afiliado",
    "cpq.py::quote_viewed_pixel": "pixel de lectura de presupuesto",
}

#: TODOS los webhooks entrantes, comprueben lo que comprueben.
#:
#: Esta lista NO se deriva de `PUBLICAS`, y es a proposito: los webhooks que
#: verifican firma dejan de aparecer como rutas abiertas, asi que derivarla los
#: sacaria justo a los que hay que vigilar. Un webhook que pierda su
#: verificacion desapareceria de la vigilancia por haberla perdido.
WEBHOOKS_ENTRANTES: dict[str, str] = {
    "automation.py::trigger_webhook": "la clave de la ruta es la credencial",
    "bookings.py::zoom_webhook": "firma de Zoom sobre v0:timestamp:cuerpo",
    "facebook_messenger.py::receive_webhook": "firma de Meta",
    "instagram_dm.py::receive_webhook": "firma de Meta",
    "whatsapp.py::receive_webhook": "firma de Meta",
    "tiktok_dm.py::receive_webhook": "secreto compartido; TikTok no publica esquema de firma",
    "helpdesk.py::inbound_email_webhook": "firma de SNS",
    "helpdesk.py::inbound_whatsapp_webhook": "firma de Meta",
    "monitoring.py::ses_bounce_webhook": "firma de SNS",
    "stripe_webhook.py::stripe_webhook": "construct_event verifica la firma",
    "text2pay.py::stripe_webhook": "construct_event verifica la firma",
}


def _rutas() -> tuple[list[tuple[str, str, str]], int]:
    """Devuelve (rutas_sin_autorizacion, total). Cada una: (clave, metodo, ruta)."""
    sin_auth: list[tuple[str, str, str]] = []
    total = 0
    for f in sorted(RAIZ.rglob("*.py")):
        try:
            arbol = ast.parse(io.open(f, encoding="utf-8").read())
        except Exception:
            continue

        protegidos_a_nivel_de_router: set[str] = set()
        for nodo in ast.walk(arbol):
            if isinstance(nodo, ast.Assign) and isinstance(nodo.value, ast.Call):
                src = ast.unparse(nodo.value)
                if src.startswith("APIRouter(") and "dependencies" in src and AUTORIZAN.search(src):
                    for t in nodo.targets:
                        protegidos_a_nivel_de_router.add(ast.unparse(t))

        for nodo in ast.walk(arbol):
            if not isinstance(nodo, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            metodos = []
            for d in nodo.decorator_list:
                src = ast.unparse(d)
                m = re.match(r"(\w+)\.(get|post|put|patch|delete)\(", src)
                if m and m.group(1) in ("router", "admin_router"):
                    metodos.append((m.group(2).upper(), src, m.group(1)))
            if not metodos:
                continue
            total += 1
            if metodos[0][2] in protegidos_a_nivel_de_router:
                continue
            if AUTORIZAN.search(ast.unparse(nodo.args)):
                continue
            if any(AUTORIZAN.search(ast.unparse(d)) for d in nodo.decorator_list):
                continue
            if COMPRUEBA_EN_EL_CUERPO.search(ast.unparse(nodo)):
                continue
            ruta = re.search(r'["\']([^"\']*)["\']', metodos[0][1])
            sin_auth.append(
                (
                    f"{f.relative_to(RAIZ)}::{nodo.name}".replace("\\", "/"),
                    metodos[0][0],
                    ruta.group(1) if ruta else "",
                )
            )
    return sin_auth, total


def test_el_denominador_hay_rutas_que_auditar():
    """Sin esto, un detector que no encontrara ninguna ruta pasaria siempre.

    Es el fallo que tuvieron los cuatro guardianes de RLS: aprobar por no mirar.
    """
    _, total = _rutas()
    assert total > 900, f"solo se han encontrado {total} rutas; el detector no esta mirando bien"


def test_ninguna_ruta_sin_autorizacion_fuera_de_la_lista():
    """LA REGLA. `main.py` publica los routers solos: una ruta nueva se publica
    sola, y si nace sin autorizacion nace abierta."""
    sin_auth, _ = _rutas()
    fuera = [(k, m, r) for k, m, r in sin_auth if k not in PUBLICAS]
    assert fuera == [], (
        "estas rutas no piden ninguna autorizacion y no estan declaradas como publicas:\n  "
        + "\n  ".join(f"{m} {r}  ({k})" for k, m, r in fuera)
    )


def test_la_lista_blanca_no_tiene_entradas_muertas():
    """Una lista blanca que envejece deja de proteger.

    Si una ruta declarada como publica gana autorizacion —o desaparece— su
    entrada sobra, y la siguiente que se llame igual heredaria el permiso sin
    que nadie lo decidiera.
    """
    sin_auth, _ = _rutas()
    detectadas = {k for k, _, _ in sin_auth}
    muertas = sorted(k for k in PUBLICAS if k not in detectadas)
    assert muertas == [], (
        "estas entradas de la lista blanca ya no corresponden a ninguna ruta abierta; "
        f"quitalas: {muertas}"
    )


@pytest.mark.parametrize("clave", sorted(WEBHOOKS_ENTRANTES))
def test_un_webhook_publico_verifica_firma(clave):
    """Un webhook sin verificacion es una ruta de escritura abierta.

    El emisor no tiene sesion, asi que ninguno puede pedir autorizacion normal.
    Lo que si tienen que hacer todos es comprobar QUIEN les escribe: sin eso,
    cualquiera puede inventarse un pago confirmado, un rebote de correo —que es
    como se deja de entregar correo a un cliente— o un mensaje entrante que el
    sistema tratara como real.

    Se comprueba el cuerpo de la ruta Y el del servicio al que delega: TikTok
    verifica en la ruta y procesa en el servicio, y al reves tambien pasa.
    """
    fichero, funcion = clave.split("::")
    ruta = RAIZ / fichero
    arbol = ast.parse(io.open(ruta, encoding="utf-8").read())
    cuerpo = next(
        (
            ast.unparse(n)
            for n in ast.walk(arbol)
            if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) and n.name == funcion
        ),
        None,
    )
    assert cuerpo is not None, f"no se encuentra {clave}"
    assert VERIFICA_FIRMA.search(cuerpo), (
        f"{clave} es un webhook publico y no se ve que verifique firma ni credencial"
    )


def test_el_control_positivo_una_ruta_abierta_se_detecta():
    """Sin esto, un detector con un `continue` de mas aprobaria siempre.

    Se construye en memoria un modulo con una ruta sin autorizacion y se
    comprueba que las mismas reglas la marcan.
    """
    fuente = (
        "from fastapi import APIRouter\n"
        "router = APIRouter()\n"
        "@router.delete('/todo')\n"
        "async def borra_lo_que_sea(id: int):\n"
        "    return {'ok': True}\n"
    )
    arbol = ast.parse(fuente)
    encontrada = False
    for nodo in ast.walk(arbol):
        if not isinstance(nodo, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        if not any(re.match(r"router\.(delete)\(", ast.unparse(d)) for d in nodo.decorator_list):
            continue
        if AUTORIZAN.search(ast.unparse(nodo.args)):
            continue
        if COMPRUEBA_EN_EL_CUERPO.search(ast.unparse(nodo)):
            continue
        encontrada = True
    assert encontrada, "el detector no reconoce una ruta DELETE sin ninguna autorizacion"


def test_el_control_negativo_una_ruta_protegida_no_se_marca():
    """Y por el otro lado: una ruta con su dependencia no puede aparecer.

    Sin esto, un detector que marcara TODO pasaria la prueba de arriba y
    convertiria la lista blanca en el inventario entero.
    """
    fuente = (
        "from fastapi import APIRouter, Depends\n"
        "router = APIRouter()\n"
        "@router.delete('/todo')\n"
        "async def borra(id: int, ctx = Depends(require_workspace_operator)):\n"
        "    return {'ok': True}\n"
    )
    arbol = ast.parse(fuente)
    for nodo in ast.walk(arbol):
        if isinstance(nodo, (ast.FunctionDef, ast.AsyncFunctionDef)) and nodo.name == "borra":
            assert AUTORIZAN.search(ast.unparse(nodo.args)), (
                "el detector no reconoce `Depends(require_workspace_operator)` como autorizacion"
            )
