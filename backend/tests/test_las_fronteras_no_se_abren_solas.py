"""BLOQUE 7 · las fronteras no se abren solas.

Los ataques profundos de este bloque van contra las dos puertas de las que
depende casi todo —`authenticate` y `requireSaasContext`— y contra los defectos
concretos que aparecieron. Pero hay 526 rutas, y auditarlas una a una a mano
garantiza dos cosas: que se tarda muchísimo y que la número 527 nace sin
auditar.

Esto es lo otro: propiedades **estructurales** sobre TODAS las rutas, derivadas
del árbol. No sustituyen a los ataques —una ruta puede tener la guarda puesta y
comprobarla mal— pero sí garantizan que ninguna nazca sin nada, y que la lista
de excepciones no crezca en silencio.

Las cuatro reglas salen de defectos reales, no de un catálogo:

  1. Ninguna ruta sin guarda que no esté justificada por escrito.
  2. Toda ruta de `cron/` verifica su secreto.
  3. Toda ruta de `admin/` comprueba que quien llama sea administrador.
  4. Una ruta solo puede aceptar el inquilino DEL CLIENTE si exige administrador
     de plataforma. Esta la escribió un defecto encontrado atacando.
"""

from __future__ import annotations

import io
import re

from backend.db.certificacion import superficies_atacables as inv
from backend.db.certificacion.texto_fuente import sin_comentarios

API = inv.API


def _texto(ruta: str) -> str:
    """Codigo de la ruta SIN comentarios.

    Sin blanquearlos, una regla casa dentro de la prosa. Paso exactamente aqui:
    `cron/os-learning-loop` documenta en su cabecera `Header: x-cron-secret:
    $CRON_SECRET`, asi que el barrido lo daba por verificado **aunque se le
    quitara la comprobacion entera**. La mutacion se aplico, se confirmo que
    `verifyCron` habia desaparecido del fichero, y la prueba siguio verde.

    Se reutiliza el escaner del Bloque 5, que ya distingue un `//` de verdad de
    uno dentro de `"https://..."`.

    El fichero se resuelve con `_fichero_de` del inventario, que entiende el
    prefijo `pages:`: al corregir el denominador aparecieron 396 rutas del
    enrutador de paginas, y `API / ruta` las buscaba donde no estan — con lo que
    devolvia cadena vacia y TODAS parecian no comprobar nada.
    """
    try:
        return sin_comentarios(
            io.open(inv._fichero_de(ruta), encoding="utf-8", errors="replace").read()
        )
    except OSError:
        return ""


# ── 1 · la lista de excepciones ─────────────────────────────────────────────
#
# Cada entrada lleva su motivo. Una ruta sin guarda puede ser perfectamente
# correcta —un healthcheck, un catálogo público— pero tiene que estar dicho.
# El día que alguien añada una ruta sin guarda y sin justificar, esto se pone
# rojo, que es exactamente lo que se quiere.
SIN_GUARDA_JUSTIFICADAS: dict[str, str] = {
    # ── enrutador de PAGINAS (aparecieron al corregir el denominador) ──
    "pages:uptime/status.ts": (
        "pagina de estado publica. Devuelve el estado agregado del servicio, sin "
        "datos de ningun inquilino: es lo mismo que /api/health y esta pensada para "
        "que la lea cualquiera, incluido un cliente que quiere saber si somos "
        "nosotros o es su red."
    ),
    "pages:uptime/history.ts": "historico agregado de la pagina de estado. Sin datos de inquilino.",
    "pages:uptime/incidents.ts": "incidencias publicas de la pagina de estado. Sin datos de inquilino.",

    # Identidad: son las rutas que CREAN la sesión. Exigir sesión para
    # iniciarla no tendría sentido; su defensa es otra (rate limit, tokens de
    # un solo uso, verificación de correo).
    "auth/forgot-password/route.ts": "inicia recuperacion: aun no hay sesion",
    "auth/login/route.ts": "crea la sesion",
    "auth/logout/route.ts": "solo borra la cookie; no lee nada del usuario",
    "auth/register/route.ts": "crea la cuenta",
    "auth/reset-password/route.ts": "consume un token de un solo uso",
    "auth/sso/start/route.ts": "arranca el flujo SSO",
    "auth/verify-email/route.ts": "consume un token de verificacion",
    # OAuth: la defensa es el `state` y el intercambio de código con el
    # proveedor, no una sesión previa.
    "oauth/google/callback/route.ts": "callback OAuth: valida state y codigo",
    "oauth/linkedin/callback/route.ts": "callback OAuth: valida state y codigo",
    "oauth/meta/callback/route.ts": "callback OAuth: valida state y codigo",
    "oauth/snapchat/callback/route.ts": "callback OAuth: valida state y codigo",
    "oauth/tiktok/callback/route.ts": "callback OAuth: valida state y codigo",
    # Portal de cliente y afiliados: audiencia propia, credencial propia.
    "platform/portal/auth/accept-invite/route.ts": "acepta invitacion con token",
    "platform/portal/auth/login/route.ts": "crea la sesion del portal",
    "affiliates/click/route.ts": "registro de clic publico por diseno",
    "packs/catalog/route.ts": "catalogo publico de packs",
    "packs/local/bot/[slug]/route.ts": "pack publico servido por slug",
    "packs/local/live/[slug]/route.ts": "pack publico servido por slug",
    "packs/local/seo/[slug]/report/route.ts": "informe publico servido por slug",
    # Superficie pública del producto.
    "changelog/route.ts": "contenido publico",
    "roadmap/route.ts": "contenido publico",
    "early-adopter/status/route.ts": "estado publico del programa",
    "email-signature/route.ts": "generador publico de firma",
    "health/route.ts": "sonda de salud",
    "health/live/route.ts": "sonda de vida",
    "nelvyon-site/chat/route.ts": "chat del sitio publico",
    "support/templates/route.ts": "plantillas publicas de soporte",
    "s/[surveyId]/route.ts": "encuesta publica por identificador",
    "t/[shortCode]/route.ts": "redireccion de enlace corto",
    "public/contracts/sign/[token]/route.ts": "firma con token de un solo uso",
    "public/funnel/[slug]/route.ts": "funnel publico por slug",
    "public/funnel/[slug]/checkout/route.ts": "checkout publico del funnel",
    "public/funnel/[slug]/event/route.ts": "evento publico del funnel",
    "public/funnel/[slug]/step/[order]/route.ts": "paso publico del funnel",
    "public/site/[subdomain]/[slug]/route.ts": "sitio publico por subdominio",
    "public/site/domain/[host]/route.ts": "sitio publico por dominio",
    "public/v1/openapi/route.ts": "especificacion publica",
    "public/v2/openapi/route.ts": "especificacion publica",
    "public/v2/health/route.ts": "sonda publica",
    "store/[subdomain]/catalog/route.ts": "catalogo publico de tienda",
    "store/[subdomain]/checkout/route.ts": "checkout publico de tienda",
    "lms/public/courses/route.ts": "catalogo publico de cursos",
    "lms/public/courses/[id]/route.ts": "ficha publica de curso",
    "lms/courses/[id]/enroll/route.ts": "matricula: valida token de acceso propio",
    # OS y panel: la guarda vive mas de dos saltos de imports mas alla, o la
    # ruta es un catalogo estatico.
    "os/health/route.ts": "sonda del OS",
    "saas/comunidades/route.ts": "delega en un servicio que exige contexto",
    "saas/productos/route.ts": "delega en un servicio que exige contexto",
    # SCIM y API publica: credencial propia (token SCIM, clave de API) que la
    # deteccion por nombre no reconoce.
    "scim/v2/[[...path]]/route.ts": "SCIM: token propio de aprovisionamiento",
    "v1/portal/[...path]/route.ts": "API v1 del portal: clave propia",
    # Deshabilitada.
    "webhooks/paddle/route.ts": "desactivada: responde 410 sin leer nada",
    # BFF de plataforma: la cadena es ruta -> *BffRoute -> adsBffRoute ->
    # requirePlatformClaims, tres saltos. La deteccion transitiva llega a dos a
    # proposito: mas profundidad hace que todo parezca protegido.
    **{
        r: "BFF de plataforma: autentica en adsBffRoute (3 saltos)"
        for r in (
            "analytics/route.ts",
            "platform/ads/alerts/roas/route.ts",
            "platform/ads/briefing/route.ts",
            "platform/ads/google/campaigns/route.ts",
            "platform/ads/google/reporting/route.ts",
            "platform/ads/google/status/route.ts",
            "platform/ads/meta/campaigns/route.ts",
            "platform/ads/meta/reporting/route.ts",
            "platform/ads/meta/status/route.ts",
            "platform/ads/reporting/unified/route.ts",
            "platform/automations/executions/route.ts",
            "platform/automations/rules/[id]/execute/route.ts",
            "platform/automations/rules/route.ts",
            "platform/automations/stats/route.ts",
            "platform/automations/workflows/[id]/activate/route.ts",
            "platform/automations/workflows/[id]/executions/route.ts",
            "platform/automations/workflows/[id]/route.ts",
            "platform/automations/workflows/route.ts",
            "platform/ecommerce/projects/route.ts",
            "platform/ecommerce/projects/[id]/route.ts",
            "platform/ecommerce/projects/[id]/analytics/route.ts",
            "platform/ecommerce/projects/[id]/generate/route.ts",
            "platform/ecommerce/projects/[id]/products/route.ts",
            "platform/ecommerce/projects/[id]/products/[productId]/route.ts",
            "platform/ecommerce/projects/[id]/publish/route.ts",
            "platform/funnels/route.ts",
            "platform/funnels/[id]/route.ts",
            "platform/funnels/[id]/analytics/route.ts",
            "platform/social/analytics/module/route.ts",
            "platform/social/monitoring/dashboard/route.ts",
            "platform/social/publish/analytics/route.ts",
            "platform/social/scheduler/overview/route.ts",
        )
    },
}


def test_el_barrido_encuentra_las_rutas():
    assert len(inv.rutas()) >= 800, (
        f"solo {len(inv.rutas())} rutas: la raiz apunta mal y todo lo de abajo "
        "mediria el vacio"
    )


def test_ninguna_superficie_se_queda_sin_categoria():
    h = inv.huerfanas()
    assert not h, f"{len(h)} superficies sin categoria: {h[:10]}"


def test_ninguna_ruta_nace_sin_guarda_y_sin_justificar():
    """El trinquete. La lista de excepciones solo puede encoger."""
    sin_guarda = set(inv.sin_guarda_detectable())
    nuevas = sorted(sin_guarda - set(SIN_GUARDA_JUSTIFICADAS))
    assert not nuevas, (
        f"{len(nuevas)} rutas sin ninguna comprobacion y sin justificar: {nuevas}. "
        "O se les pone guarda, o se explica por escrito por que no la llevan."
    )


def test_la_lista_de_excepciones_no_se_queda_obsoleta():
    """Lo contrario también importa.

    Una excepción que ya no aplica —porque a la ruta se le puso guarda, o porque
    la ruta desapareció— convierte la lista en algo que nadie lee. Un inventario
    que solo crece deja de ser un inventario.
    """
    sin_guarda = set(inv.sin_guarda_detectable())
    sobrantes = sorted(set(SIN_GUARDA_JUSTIFICADAS) - sin_guarda)
    assert not sobrantes, (
        f"excepciones que ya no hacen falta: {sobrantes}. Quitalas de la lista."
    )


def test_toda_ruta_de_cron_verifica_su_secreto():
    """Una tarea programada la puede disparar cualquiera que sepa la URL."""
    verificador = re.compile(r"verifyCron(Header|Bearer|Flexible)|CRON_SECRET")
    mudas = [
        r for r in inv.rutas()
        if r.startswith("cron/") and not verificador.search(_texto(r))
    ]
    assert not mudas, (
        f"rutas de cron sin comprobar su secreto: {mudas}. Cualquiera con la URL "
        "podria dispararlas."
    )
    assert len([r for r in inv.rutas() if r.startswith("cron/")]) >= 10, (
        "menos de 10 rutas de cron: el barrido no esta mirando donde cree"
    )


def test_toda_ruta_de_administracion_comprueba_que_lo_seas():
    admin = re.compile(r"requirePlatformAdmin|assertAdmin|requireAdmin|isUserAdmin")
    mudas = [
        r for r in inv.rutas()
        if r.startswith("admin/") and not admin.search(_texto(r))
    ]
    assert not mudas, f"rutas de administracion sin comprobar el rol: {mudas}"


def test_aceptar_el_inquilino_del_cliente_exige_ser_administrador():
    """La regla que escribió un defecto encontrado atacando.

    `POST /api/os/certificates/issue` verificaba que el pack run fuera del
    workspace de quien llamaba —bien— y acto seguido sellaba el certificado con
    el `tenantId` que venía **en el cuerpo**. Dos campos hermanos que dicen de
    quién es el certificado: uno derivado y el otro regalado.

    Y no era decorativo: los listados se acotan por `tenant_id`, así que el
    certificado falsificado aparecía en la cuenta de la víctima.

    Aceptar el inquilino del cliente es legítimo **solo** para un administrador
    de plataforma, que opera entre inquilinos por diseño. Con autenticación a
    secas, es mass assignment.
    """
    # El parentesis del cast: `tenantId: (body as {..}).tenantId` no casaba con
    # `tenantId:\s*body\.` y la mutacion que reintroducia el defecto pasaba
    # limpia. Se admite un parentesis y un `as` por medio.
    patron = re.compile(
        r"(tenantId|workspaceId|tenant_id|workspace_id)\s*:\s*\(?\s*(body|payload|input)\b[^,;\n]*\."
    )
    admin = re.compile(r"requirePlatformAdmin|assertAdmin|requireAdmin|isUserAdmin")

    culpables = []
    for r in inv.rutas():
        t = _texto(r)
        if patron.search(t) and not admin.search(t):
            culpables.append(r)
    assert not culpables, (
        f"rutas que aceptan el inquilino del cliente sin exigir administrador: "
        f"{culpables}. Es mass assignment: se comprueba la pertenencia de un "
        "campo y se confia en el de al lado."
    )


def test_el_control_positivo_del_barrido():
    """Sin esto, un barrido que no leyera nada daría cero culpables siempre.

    Se comprueba que las expresiones encuentran lo que tienen que encontrar
    sobre rutas reales del árbol.
    """
    conCron = [r for r in inv.rutas() if r.startswith("cron/")]
    assert conCron, "no se encontro ni una ruta de cron"
    assert any("verifyCron" in _texto(r) for r in conCron), (
        "ninguna ruta de cron menciona su verificador: el barrido no esta "
        "leyendo los ficheros"
    )
    conAdmin = [r for r in inv.rutas() if r.startswith("admin/")]
    assert conAdmin, "no se encontro ni una ruta de administracion"


def test_todo_callback_de_oauth_ata_el_flujo_al_navegador() -> None:
    """BLOQUE 7 · el `state` firmado dice quien EMPIEZA, no quien TERMINA.

    Cinco proveedores tienen la misma pareja de rutas, y la comprobacion hay que
    ponerla en las cinco. Certificar una y suponer las otras cuatro es la forma
    mas comun de que quede un agujero: la ruta que se olvida no falla, funciona
    perfectamente — solo que a nombre de quien no debe.

    La mitad ofensiva de esta propiedad esta en `terminarElFlujoDeOtro.test.ts`;
    esta es la mitad que dice que llega a las cinco.
    """
    callbacks = sorted(
        p.parent.relative_to(API).as_posix() + "/route.ts"
        for p in (API / "oauth").rglob("callback/route.ts")
    ) if (API / "oauth").exists() else []
    assert len(callbacks) >= 5, (
        f"solo {len(callbacks)} callbacks de OAuth. Si el arbol tiene cinco "
        "proveedores y aqui salen menos, el patron ha dejado de encontrarlos y "
        "la regla mide el vacio."
    )
    sin_atar = [c for c in callbacks if "verificarNonceDelNavegador" not in _texto(c)]
    assert not sin_atar, (
        f"{len(sin_atar)} callbacks de OAuth aceptan un `state` firmado sin comprobar "
        f"que lo termine el navegador que lo empezo: {sin_atar}. Un `state` autentico "
        "enviado a la victima cuelga la cuenta del proveedor de la victima del atacante."
    )


def test_ningun_arranque_de_oauth_se_queda_sin_cookie() -> None:
    """La otra mitad: sin la cookie, la comprobacion del callback rechaza SIEMPRE.

    Una defensa que rechaza siempre no es una defensa: es una averia. Por eso las
    dos mitades se comprueban por separado — y por eso la suite ofensiva lleva un
    control positivo del flujo legitimo.
    """
    inicios = sorted(
        p.parent.relative_to(API).as_posix() + "/route.ts"
        for p in (API / "oauth").glob("*/route.ts")
        if "crearEstadoOAuth" in _texto(p.parent.relative_to(API).as_posix() + "/route.ts")
    ) if (API / "oauth").exists() else []
    assert len(inicios) >= 5, f"solo {len(inicios)} arranques de OAuth encontrados."
    sin_cookie = [i for i in inicios if "aplicarCookieDeNonce" not in _texto(i)]
    assert not sin_cookie, (
        f"{len(sin_cookie)} arranques de OAuth crean el `state` pero no dejan la "
        f"cookie del nonce: {sin_cookie}. El callback los rechazaria siempre."
    )


# ── 5 · la identidad no viaja en la peticion, en NINGUNO de los dos enrutadores ─

# `clientId` NO esta en la lista, y merece explicacion porque el defecto del
# WebSocket era precisamente un `clientId`.
#
# En este arbol `clientId` significa dos cosas distintas. En `pages/api/os/ws`
# el frontend le pasaba el `tenantId` —ahi SI era el inquilino, y por eso ese
# defecto se certifica aparte, en `elCanalEnVivoDeOtroInquilino.test.ts`—. Pero
# en el enrutador de la aplicacion es un cliente DENTRO del inquilino: en
# `platform/portal/invites` y en `saas/private-ai/inference` el limite lo pone
# el `workspaceId` o el `ctx.tenant.id` de la sesion, y el `clientId` del cuerpo
# solo elige a cual de los clientes propios se refiere.
#
# Meterlo aqui daria dos falsos positivos permanentes, y una regla con falsos
# positivos permanentes se justifica una vez y se deja de leer.
_IDENTIDAD_DE_LA_PETICION = re.compile(
    r"(tenantId|userId|workspaceId|tenant_id|user_id)\s*[:=]\s*\(?\s*"
    r"(req\.body|req\.query|body|payload|input)\b[^,;\n]*\."
)

# Un administrador de PLATAFORMA opera entre inquilinos por diseño; es la unica
# excepcion, y tiene que estar escrita en la propia ruta.
_ES_ADMIN_DE_PLATAFORMA = re.compile(r"requirePlatformAdmin|assertAdmin|requireAdmin|isUserAdmin")


def test_ninguna_ruta_toma_su_identidad_de_la_peticion() -> None:
    """Quien eres lo dice la sesion, no el cuerpo ni la barra de direcciones.

    Esta regla nacio tres veces en el Bloque 7, y esa es la razon de que sea
    estructural y no una nota:

      1. `os/certificates/issue` grababa `tenantId` del cuerpo: se podia sellar
         un certificado de entrega a nombre de otro cliente.
      2. `saas/shared-memory` grababa `userId` y `workspaceId` del cuerpo.
      3. `pages/api/os/ws` cogia `clientId` —que ES el inquilino— de la barra de
         direcciones, sin sesion ninguna.

    Cubre los DOS enrutadores. Cuando se corrigio el denominador aparecieron 396
    rutas mas en `pages/api`, y una regla que solo mirase la mitad del arbol seria
    la clase de verde que no significa nada.
    """
    culpables = []
    for r in inv.rutas():
        t = _texto(r)
        if _IDENTIDAD_DE_LA_PETICION.search(t) and not _ES_ADMIN_DE_PLATAFORMA.search(t):
            culpables.append(r)
    assert not culpables, (
        f"{len(culpables)} rutas toman su identidad de la peticion: {culpables}. "
        "El inquilino, el usuario y el workspace salen de la sesion verificada; "
        "aceptar el de al lado es asignacion masiva."
    )


def test_la_regla_de_identidad_sabe_decir_que_si() -> None:
    """CONTROL POSITIVO: la regla de arriba espera CERO.

    Una regla rota tambien da cero, y en verde las dos se ven igual. Aqui se le
    ponen delante las tres formas reales que aparecieron en este bloque —incluida
    la del molde, que la primera version del patron no veia— y se exige que las
    senale.
    """
    hostiles = [
        "tenantId: body.tenantId ?? null",
        "tenantId: (body as {tenantId?: string}).tenantId ?? null",
        "userId: (body.userId as string) ?? ctx.claims.userId",
        "tenantId = req.query.tenantId as string",
        "workspaceId: payload.workspaceId,",
    ]
    for h in hostiles:
        assert _IDENTIDAD_DE_LA_PETICION.search(h), (
            f"la regla NO detecta {h!r}: seria incapaz de encontrar el defecto que la creo."
        )
    inocentes = [
        "tenantId: ctx.tenant.id,",
        "userId: claims.userId,",
        "tenantId = r.tenantId",
        "workspaceId: ctx.tenant.workspaceId,",
    ]
    for i in inocentes:
        assert not _IDENTIDAD_DE_LA_PETICION.search(i), (
            f"la regla grita por {i!r}, que sale de la sesion. Una regla que grita por "
            "todo se acaba silenciando entera."
        )
