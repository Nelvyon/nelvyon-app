"""
Identidad del proveedor de mensajeria: de quien sale el mensaje.

La autorizacion de estos endpoints ya se cerro antes: hoy exigen operator. Lo
que se prueba aqui es distinto y sobrevive a aquello — QUE CUENTA se usa cuando
el actor SI esta autorizado.

Lo medido: `whatsapp_service.py` y `ses_service.py` no tienen ninguna referencia
a workspace. Las credenciales salen de entorno global (`WHATSAPP_TOKEN`,
`WHATSAPP_PHONE_NUMBER_ID`, `AWS_*`, `SES_FROM_EMAIL`), de modo que un operator
autorizado enviaba desde el numero y el remitente CORPORATIVOS de NELVYON. Y
`POST /api/ses/send` aceptaba `from_email` en el cuerpo: el remitente lo elegia
quien llamaba.

Que es customer-facing y no infraestructura de plataforma no es una suposicion:
`030_integration_whatsapp.sql` guarda `phone_number_id`/`waba_id`/`access_token`
por tenant, `integrations/WhatsAppService.ts` los usa con `requireCredentials`
fallando cerrado, y el frontend tiene el flujo `connect/send/bulk/history/revoke`.
El camino correcto ya existe; el router Python se lo saltaba.

El correo operativo del propio SaaS (alta, reset, avisos) va por otro camino y
sigue siendo de NELVYON. Eso se prueba en `test_platform_email_unaffected.py`.
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient

from core.messaging_integration import (
    WorkspaceEmailSender,
    WorkspaceWhatsAppIntegration,
    resolve_workspace_email_sender,
    resolve_workspace_whatsapp_integration,
)

WA_ENVIOS = [
    ("/api/whatsapp/send", {"to_phone": "+34600000000", "message_text": "hola"}),
    ("/api/whatsapp/template", {"to_phone": "+34600000000", "template_name": "t",
                                "language_code": "es"}),
    ("/api/whatsapp/media", {"to_phone": "+34600000000", "media_url": "http://x/y.jpg",
                             "media_type": "image"}),
]
SES_ENVIOS = [
    ("/api/ses/send", {"to": "lead@cliente.com", "subject": "s", "html_body": "<p>h</p>"}),
    ("/api/ses/bulk", {"recipients": [
        {"to": "lead@cliente.com", "subject": "s", "html_body": "<p>h</p>"}]}),
]


class _EspiaProveedor:
    """Registra cada salida y con que identidad se hizo."""

    def __init__(self) -> None:
        self.llamadas: list[tuple[str, dict]] = []

    def __getattr__(self, nombre):
        async def _f(*a, **k):
            self.llamadas.append((nombre, {**k, "_pos": a}))
            return {"messages": [{"id": "fake"}], "MessageId": "fake", "status": "sent"}

        return _f


@pytest.fixture
def espia_whatsapp(monkeypatch):
    """
    Se parchea el espacio de nombres del ROUTER: `routers/whatsapp.py` importa
    `get_whatsapp_service` directamente, asi que sustituirlo en el modulo de
    servicio no interceptaria nada y el espia se quedaria a cero sin haber
    interceptado jamas.
    """
    from routers import whatsapp as router_whatsapp

    e = _EspiaProveedor()
    monkeypatch.setattr(router_whatsapp, "get_whatsapp_service", lambda: e)
    return e


@pytest.fixture
def espia_ses(monkeypatch):
    from routers import ses as router_ses

    e = _EspiaProveedor()
    monkeypatch.setattr(router_ses, "get_ses_service", lambda: e)
    return e


@pytest.fixture
def credenciales_globales_presentes(monkeypatch):
    """
    T5. Sin esto el test es un falso verde.

    Ambos servicios entran en "mock mode" cuando faltan las variables de
    entorno, asi que un test sin credenciales globales pasaria sin demostrar
    nada: no habria fallback al que caer. Se ponen valores INVENTADOS —nunca
    secretos reales— justamente para que el fallback sea posible y se vea que
    aun asi no ocurre.
    """
    for k, v in {
        "WHATSAPP_TOKEN": "token-corporativo-de-prueba",
        "WHATSAPP_PHONE_NUMBER_ID": "111111111111111",
        "AWS_ACCESS_KEY_ID": "AKIAFICTICIODEPRUEBA",
        "AWS_SECRET_ACCESS_KEY": "secreto-ficticio-de-prueba",
        "AWS_REGION": "eu-west-1",
        "SES_FROM_EMAIL": "no-reply@nelvyon.example",
    }.items():
        monkeypatch.setenv(k, v)


# ─────────────────────────────────────────── T2 · sin integracion, cero red

@pytest.mark.asyncio
@pytest.mark.parametrize("ruta,cuerpo", WA_ENVIOS)
async def test_t2_whatsapp_sin_integracion_no_alcanza_al_proveedor(
    client: AsyncClient, operator_headers: dict, espia_whatsapp, ruta, cuerpo
):
    r = await client.post(ruta, json=cuerpo, headers=operator_headers)
    assert espia_whatsapp.llamadas == [], (
        f"se salio hacia Meta sin integracion propia: {espia_whatsapp.llamadas}")
    assert r.status_code == 503, f"{ruta}: {r.status_code} {r.text[:200]}"
    assert "not configured" in r.text


@pytest.mark.asyncio
@pytest.mark.parametrize("ruta,cuerpo", SES_ENVIOS)
async def test_t2_ses_sin_remitente_propio_no_alcanza_al_proveedor(
    client: AsyncClient, operator_headers: dict, espia_ses, ruta, cuerpo
):
    r = await client.post(ruta, json=cuerpo, headers=operator_headers)
    assert espia_ses.llamadas == [], (
        f"se salio hacia SES sin remitente propio: {espia_ses.llamadas}")
    assert r.status_code == 503, f"{ruta}: {r.status_code} {r.text[:200]}"


# ─────────────────────────────────────────── T5 · con credenciales globales

@pytest.mark.asyncio
@pytest.mark.parametrize("ruta,cuerpo", WA_ENVIOS + SES_ENVIOS)
async def test_t5_no_hay_fallback_a_la_cuenta_corporativa(
    client: AsyncClient, operator_headers: dict, credenciales_globales_presentes,
    espia_whatsapp, espia_ses, ruta, cuerpo
):
    """
    El test central del bloque: la credencial corporativa ESTA disponible y aun
    asi no se usa. Antes, esta misma peticion salia desde el numero y el
    remitente de NELVYON.
    """
    r = await client.post(ruta, json=cuerpo, headers=operator_headers)
    assert espia_whatsapp.llamadas == [] and espia_ses.llamadas == [], (
        f"fallback a credenciales corporativas: "
        f"{espia_whatsapp.llamadas + espia_ses.llamadas}")
    assert r.status_code == 503, f"{ruta}: {r.status_code} {r.text[:200]}"


# ─────────────────────────────────────────── T1 · con integracion propia

@pytest.mark.asyncio
async def test_t1_la_integracion_propia_desbloquea_el_envio(
    client: AsyncClient, operator_headers: dict, espia_whatsapp, monkeypatch
):
    from core import messaging_integration

    async def _propia(_ws):
        return WorkspaceWhatsAppIntegration("999-del-cliente", "waba-cliente", "token-cliente")

    monkeypatch.setattr(messaging_integration, "resolve_workspace_whatsapp_integration", _propia)

    ruta, cuerpo = WA_ENVIOS[0]
    r = await client.post(ruta, json=cuerpo, headers=operator_headers)
    assert r.status_code == 200, f"con integracion propia deberia enviar: {r.text[:200]}"
    assert [n for n, _ in espia_whatsapp.llamadas] == ["send_message"]


# ─────────────────────────────────────────── T4 · actor no autorizado

@pytest.mark.asyncio
@pytest.mark.parametrize("ruta,cuerpo", WA_ENVIOS + SES_ENVIOS)
async def test_t4_actor_no_autorizado_no_alcanza_al_proveedor(
    client: AsyncClient, viewer_headers: dict, espia_whatsapp, espia_ses, ruta, cuerpo
):
    r = await client.post(ruta, json=cuerpo, headers=viewer_headers)
    assert espia_whatsapp.llamadas == [] and espia_ses.llamadas == []
    assert r.status_code == 403, f"{ruta}: {r.status_code} {r.text[:200]}"


# ─────────────────────────────────────────── el resolver, sin HTTP

@pytest.mark.asyncio
async def test_el_resolver_no_inventa_integraciones():
    """
    Hoy devuelve None para cualquier workspace, a proposito: no existe fuente de
    credencial por workspace. `integration_whatsapp` esta keyed por `user_id` y
    solo la lee TypeScript; no hay tabla de remitente por workspace.

    Fingir la integracion seria peor que no tenerla.
    """
    for ws in (1, 2, 99999, None):
        assert await resolve_workspace_whatsapp_integration(ws) is None
        assert await resolve_workspace_email_sender(ws) is None


def test_el_binding_no_lee_variables_de_entorno_globales():
    """
    Regresion del defecto exacto: si alguien hace que un resolver caiga a
    `WHATSAPP_TOKEN` o `SES_FROM_EMAIL`, el fallback corporativo vuelve.

    Se inspecciona el CUERPO por AST, no el texto del fichero: los docstrings
    nombran esas variables precisamente para explicar por que no se usan, y un
    `in` sobre el fuente las confundiria con codigo.
    """
    import ast as _ast
    from pathlib import Path

    ruta = Path(__file__).resolve().parent.parent / "core" / "messaging_integration.py"
    arbol = _ast.parse(ruta.read_text(encoding="utf-8"))
    prohibidos = ("os.environ", "os.getenv", "WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID",
                  "SES_FROM_EMAIL", "AWS_ACCESS_KEY_ID")
    revisados = 0
    for nodo in _ast.walk(arbol):
        if not isinstance(nodo, (_ast.FunctionDef, _ast.AsyncFunctionDef)):
            continue
        if not nodo.name.startswith(("resolve_", "assert_")):
            continue
        revisados += 1
        cuerpo = nodo.body[1:] if _ast.get_docstring(nodo) else nodo.body
        codigo = chr(10).join(_ast.unparse(x) for x in cuerpo)
        for prohibido in prohibidos:
            assert prohibido not in codigo, (
                f"{nodo.name} lee configuracion global: {prohibido}")
    assert revisados == 4, f"solo se revisaron {revisados} funciones: el barrido murio"


# ─────────────────────────────────────────── T3 · identidad de otro workspace

@pytest.mark.asyncio
async def test_t3_la_integracion_resuelta_es_la_del_workspace_que_pide(monkeypatch):
    """
    A nunca puede acabar usando la integracion de B.

    El resolver recibe el `workspace_id` del contexto ya autorizado —no un id
    del cuerpo ni de la cabecera sin validar—, asi que la unica forma de cruzar
    identidades seria que ignorase su argumento. Eso es lo que se comprueba.
    """
    from core import messaging_integration

    vistos: list = []

    async def _por_workspace(ws):
        vistos.append(ws)
        return WorkspaceEmailSender(f"ventas@workspace-{ws}.com")

    monkeypatch.setattr(messaging_integration, "resolve_workspace_email_sender", _por_workspace)

    a = await messaging_integration.assert_workspace_email_sender(1)
    b = await messaging_integration.assert_workspace_email_sender(2)
    assert vistos == [1, 2], "el resolver ignoro el workspace que se le paso"
    assert a.from_email != b.from_email
    assert a.from_email == "ventas@workspace-1.com"


def test_el_remitente_ya_no_se_acepta_del_cuerpo():
    """
    `from_email` en el cuerpo permitia suplantar a otro tenant o a NELVYON sin
    ninguna comprobacion de titularidad.
    """
    from pathlib import Path

    src = (Path(__file__).resolve().parent.parent / "routers" / "ses.py").read_text(
        encoding="utf-8"
    )
    assert "body.from_email" not in src
    assert "r.from_email" not in src
    assert "remitente.from_email" in src, "el remitente debe salir de la integracion"


# ─────────────────────────────────────────── guard estructural de la clase

#: Servicios cuya identidad global es LEGITIMA, con la evidencia que lo sostiene.
#: Allowlist exacta: se declara el servicio, no una familia ni un prefijo.
PLATFORM_SERVICE: dict[str, str] = {
    "email_service.py":
        "correo operativo del propio SaaS (alta, avisos de workflow y de ticket) "
        "enviado por NELVYON a SUS usuarios con la identidad de NELVYON",
}

#: Servicios customer-facing: envian EN NOMBRE del cliente, luego su identidad
#: es del cliente y el router debe exigir integracion propia antes de la red.
CUSTOMER_FACING: dict[str, str] = {
    "whatsapp.py": "assert_workspace_whatsapp_integration",
    "ses.py": "assert_workspace_email_sender",
}


@pytest.mark.parametrize("fichero,binding", sorted(CUSTOMER_FACING.items()))
def test_todo_envio_customer_facing_exige_integracion_antes_de_la_red(fichero, binding):
    """
    Guard de la clase de error, no de nombres de funcion.

    Se localizan por AST las funciones del router que alcanzan al proveedor
    (`get_*_service()`) y se exige que la llamada al binding aparezca ANTES en
    el cuerpo. Un guard que solo contase apariciones daria verde con la
    comprobacion puesta despues del envio, que es justo lo que no protege.
    """
    import ast as _ast
    from pathlib import Path

    ruta = Path(__file__).resolve().parent.parent / "routers" / fichero
    src = ruta.read_text(encoding="utf-8")
    arbol = _ast.parse(src)

    revisados = 0
    for nodo in _ast.walk(arbol):
        if not isinstance(nodo, (_ast.FunctionDef, _ast.AsyncFunctionDef)):
            continue
        cuerpo = _ast.unparse(nodo)
        if "get_whatsapp_service()" not in cuerpo and "get_ses_service()" not in cuerpo:
            continue
        # Solo los que ENVIAN: las lecturas de la cuenta corporativa ya se
        # cubren con autoridad de plataforma, no con integracion de tenant.
        if not any(x in cuerpo for x in ("send_message", "send_template", "send_media",
                                         "send_email", "send_bulk_emails")):
            continue
        revisados += 1
        assert binding in cuerpo, f"{fichero}::{nodo.name} alcanza al proveedor sin binding"
        i_bind = cuerpo.index(binding)
        i_svc = min(cuerpo.index(x) for x in ("get_whatsapp_service()", "get_ses_service()")
                    if x in cuerpo)
        assert i_bind < i_svc, (
            f"{fichero}::{nodo.name}: el binding esta DESPUES de instanciar el cliente")
    assert revisados >= 2, f"{fichero}: solo {revisados} envios hallados, el barrido murio"


def test_ningun_servicio_customer_facing_esta_en_la_allowlist_de_plataforma():
    """Contradiccion imposible: o envia en nombre del cliente, o de NELVYON."""
    solapan = set(PLATFORM_SERVICE) & set(CUSTOMER_FACING)
    assert solapan == set(), f"clasificados como ambas cosas: {solapan}"


@pytest.mark.parametrize("fichero,motivo", sorted(PLATFORM_SERVICE.items()))
def test_la_allowlist_de_plataforma_declara_su_evidencia(fichero, motivo):
    from pathlib import Path

    assert len(motivo) > 40, f"{fichero}: el motivo no explica nada"
    assert (Path(__file__).resolve().parent.parent / "services" / fichero).exists(), (
        f"{fichero} ya no existe: limpia la allowlist")
