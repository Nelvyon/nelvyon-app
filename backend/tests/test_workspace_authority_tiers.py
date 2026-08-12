"""
Los tres escalones de autoridad de workspace, y el hueco que tenian en medio.

FastAPI solo distinguia PERTENENCIA (`require_workspace`) de MUTACION
(`require_workspace_operator`). El producto distingue mas: la matriz de
`apps/web/src/core/routing/roleMatrix.ts` permite a `member` crear en crm,
inbox, campaigns, ads, social, funnels y ecommerce, y reserva `operator` para
automations, reputacion, os, settings, branding y voice.

Con solo dos primitivas, los endpoints de esos modulos no tenian opcion correcta:

    require_workspace           -> deja entrar tambien a `viewer` (solo lectura)
    require_workspace_operator  -> expulsa a `member`, que es quien trabaja

Por eso 67 endpoints se habian quedado en pertenencia. El agujero nunca fue
`member`: era `viewer`. `require_workspace_member` es ese escalon intermedio.

Estos tests van contra la primitiva —no contra los 67 endpoints uno a uno—
porque la decision se toma en un solo sitio. El cableado ruta->primitiva lo
cubre el guard estructural; el efecto externo, los espias de mas abajo.
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient

from core.rbac import (
    WORKSPACE_COLLABORATION_ROLES,
    WORKSPACE_MUTATION_ROLES,
    workspace_can_collaborate,
    workspace_can_mutate,
)


# ─────────────────────────────────────────────── la primitiva, sin HTTP

def test_viewer_no_colabora_y_member_si():
    """La razon de ser del escalon nuevo, en una linea."""
    assert workspace_can_collaborate("member") is True
    assert workspace_can_collaborate("viewer") is False


def test_member_no_muta_pero_operator_si():
    """El escalon nuevo no afloja el que ya existia."""
    assert workspace_can_mutate("member") is False
    assert workspace_can_mutate("operator") is True


@pytest.mark.parametrize("rol", ["owner", "admin", "operator", "member"])
def test_los_cuatro_roles_de_trabajo_colaboran(rol):
    assert workspace_can_collaborate(rol) is True


@pytest.mark.parametrize(
    "rol",
    ["viewer", "guest", "billing", "ADMINISTRATOR", "", "   ", None, "owner ", "0", "None"],
)
def test_rol_desconocido_o_vacio_queda_fuera(rol):
    """
    Fail-closed por construccion: se compara contra un conjunto CERRADO, no se
    descarta una lista negra. Un rol nuevo en la base no obtiene permisos por el
    hecho de no estar prohibido.

    `"owner "` con espacio si entra —se normaliza—, asi que se prueba aparte.
    """
    if rol == "owner ":
        assert workspace_can_collaborate(rol) is True  # normalizacion, no laxitud
        return
    assert workspace_can_collaborate(rol) is False
    assert workspace_can_mutate(rol) is False


@pytest.mark.parametrize("rol", ["OWNER", "Operator", "  admin  "])
def test_la_normalizacion_acepta_mayusculas_y_espacios(rol):
    assert workspace_can_mutate(rol) is True


@pytest.mark.parametrize("rol", ["own3r", "operador", "admin!", "super-operator", "owner,admin"])
def test_la_normalizacion_no_admite_variantes_ajenas(rol):
    """Normalizar no es parecerse: solo recorta espacios y baja mayusculas."""
    assert workspace_can_mutate(rol) is False
    assert workspace_can_collaborate(rol) is False


def test_los_conjuntos_estan_anidados_y_no_se_solapan_al_reves():
    """Si alguien metiese `viewer` en el conjunto de mutacion, esto lo caza."""
    assert WORKSPACE_MUTATION_ROLES < WORKSPACE_COLLABORATION_ROLES
    assert "viewer" not in WORKSPACE_COLLABORATION_ROLES
    assert "member" not in WORKSPACE_MUTATION_ROLES


# ─────────────────────────────────────────────── A/B sobre HTTP real

#: Un endpoint por escalon, con su cuerpo minimo valido.
#: No se prueban los 67: la autoridad la decide la dependencia, no la ruta.
MEMBER_OK = ("POST", "/api/intent/track", {"event_type": "page_view", "page": "/x"})
OPERATOR_OK = ("POST", "/api/memory/cliente-1", {"content": "nota", "kind": "note"})
ADMIN_OK = ("POST", "/api/affiliates/register", {"commission_rate": 0.2})


async def _post(client, ruta, cuerpo, headers):
    return await client.post(ruta, json=cuerpo, headers=headers)


@pytest.mark.asyncio
async def test_viewer_denegado_en_endpoint_de_colaboracion(
    client: AsyncClient, viewer_headers: dict
):
    """El hallazgo: antes `viewer` entraba aqui por mera pertenencia."""
    _, ruta, cuerpo = MEMBER_OK
    r = await _post(client, ruta, cuerpo, viewer_headers)
    assert r.status_code == 403, f"viewer entro: {r.status_code} {r.text[:200]}"


@pytest.mark.asyncio
async def test_member_admitido_en_endpoint_de_colaboracion(
    client: AsyncClient, member_headers: dict
):
    """
    Contraprueba imprescindible: el 403 anterior no puede venir de que la ruta
    este rota. `member` debe seguir trabajando — endurecer no es cerrar.

    No se exige 200: la peticion muere despues por validacion de cuerpo (422) o
    por el servicio (503). Eso ya prueba lo unico que se afirma aqui —que la
    dependencia de autoridad la dejo pasar—, porque `viewer` recibe 403 con el
    MISMO cuerpo: la guardia se evalua igualmente.
    """
    _, ruta, cuerpo = MEMBER_OK
    r = await _post(client, ruta, cuerpo, member_headers)
    assert r.status_code != 404, f"{ruta} ya no existe: el positivo no probaria nada"
    assert r.status_code != 403, f"member perdio acceso: {r.text[:200]}"


@pytest.mark.asyncio
async def test_member_denegado_en_mutacion_de_negocio(
    client: AsyncClient, member_headers: dict
):
    _, ruta, cuerpo = OPERATOR_OK
    r = await _post(client, ruta, cuerpo, member_headers)
    assert r.status_code == 403, f"member muto negocio: {r.status_code} {r.text[:200]}"


@pytest.mark.asyncio
async def test_operator_admitido_en_mutacion_de_negocio(
    client: AsyncClient, operator_headers: dict
):
    _, ruta, cuerpo = OPERATOR_OK
    r = await _post(client, ruta, cuerpo, operator_headers)
    assert r.status_code != 404, f"{ruta} ya no existe: el positivo no probaria nada"
    assert r.status_code != 403, f"operator perdio acceso: {r.text[:200]}"


@pytest.mark.asyncio
async def test_operator_no_alcanza_el_dinero(client: AsyncClient, operator_headers: dict):
    """`register_affiliate` fija comision y destino de pago en Stripe Connect."""
    _, ruta, cuerpo = ADMIN_OK
    r = await _post(client, ruta, cuerpo, operator_headers)
    assert r.status_code == 403, f"operator toco dinero: {r.status_code} {r.text[:200]}"


@pytest.mark.asyncio
async def test_cross_workspace_denegado(client: AsyncClient, operator_headers: dict):
    """
    Ser operator de A no da autoridad sobre B. La cabecera es una peticion, no
    una credencial: la pertenencia se resuelve contra `workspace_members`.
    """
    _, ruta, cuerpo = OPERATOR_OK
    ajeno = {**operator_headers, "X-Workspace-Id": "2"}
    r = await _post(client, ruta, cuerpo, ajeno)
    assert r.status_code == 403, f"alcanzo el workspace 2: {r.status_code} {r.text[:200]}"


@pytest.mark.asyncio
async def test_manipular_la_cabecera_no_escala(client: AsyncClient, viewer_headers: dict):
    """Ni un workspace inexistente, ni basura, ni vacio conceden autoridad."""
    _, ruta, cuerpo = OPERATOR_OK
    for ws in ("2", "99999", "-1", "no-soy-un-id", ""):
        r = await _post(client, ruta, cuerpo, {**viewer_headers, "X-Workspace-Id": ws})
        assert r.status_code in (400, 403), f"ws={ws!r}: {r.status_code} {r.text[:200]}"


# ─────────────────────────────────────────────── efecto externo

@pytest.mark.asyncio
async def test_actor_no_autorizado_no_produce_ninguna_salida_externa(
    client: AsyncClient, viewer_headers: dict, member_headers: dict, monkeypatch
):
    """
    La autorizacion va ANTES de la red.

    WhatsApp sale por la Graph API de Meta con el numero corporativo de NELVYON,
    y hasta ahora bastaba pertenecer al workspace. Un 403 que llegase DESPUES de
    enviar el mensaje no serviria de nada: el mensaje ya estaria entregado.
    """
    # Se parchea el ESPACIO DE NOMBRES DEL ROUTER, no el del servicio:
    # `routers/whatsapp.py` hace `from services.whatsapp_service import
    # get_whatsapp_service`, asi que sustituir el nombre en el modulo de
    # servicio no intercepta nada y el espia se quedaria a cero sin haber
    # interceptado jamas. Ese verde vacio existio en la primera version.
    from routers import whatsapp as router_whatsapp

    llamadas: list[str] = []

    class _Espia:
        def __getattr__(self, nombre):
            async def _f(*_a, **_k):
                llamadas.append(nombre)
                return {"messages": [{"id": "fake"}]}

            return _f

    monkeypatch.setattr(router_whatsapp, "get_whatsapp_service", lambda: _Espia())

    # Cuerpos VALIDOS a proposito. Con un cuerpo invalido el 403 podria venir de
    # la validacion y el test no probaria nada sobre la autoridad: fue
    # exactamente lo que paso en la primera version de este fichero.
    rutas = [
        ("/api/whatsapp/send", {"to_phone": "+34600000000", "message_text": "hola"}),
        ("/api/whatsapp/template", {"to_phone": "+34600000000", "template_name": "t",
                                    "language_code": "es"}),
        ("/api/whatsapp/media", {"to_phone": "+34600000000", "media_url": "http://x/y.jpg",
                                 "media_type": "image"}),
    ]
    respuestas = []
    for headers, quien in ((viewer_headers, "viewer"), (member_headers, "member")):
        for ruta, cuerpo in rutas:
            r = await client.post(ruta, json=cuerpo, headers=headers)
            respuestas.append((quien, ruta, r.status_code, r.text[:160]))

    # Esta es LA propiedad, y se afirma primero: si la guardia se mueve detras
    # del envio, el mensaje sale igual y el codigo de respuesta ya da igual.
    assert llamadas == [], f"salidas hacia Meta pese a no estar autorizado: {llamadas}"

    for quien, ruta, codigo, cuerpo in respuestas:
        assert codigo == 403, f"{quien} {ruta}: {codigo} {cuerpo}"


@pytest.mark.asyncio
async def test_el_espia_de_whatsapp_intercepta_de_verdad(
    client: AsyncClient, operator_headers: dict, monkeypatch
):
    """
    Control positivo del test anterior.

    Cero llamadas solo es evidencia si el espia es capaz de registrar alguna.
    Con un actor AUTORIZADO el envio debe alcanzarlo; si esto no cuenta ninguna,
    el negativo de arriba estaba pasando en vacio.
    """
    from routers import whatsapp as router_whatsapp

    llamadas: list[str] = []

    class _Espia:
        def __getattr__(self, nombre):
            async def _f(*_a, **_k):
                llamadas.append(nombre)
                return {"messages": [{"id": "fake"}]}

            return _f

    monkeypatch.setattr(router_whatsapp, "get_whatsapp_service", lambda: _Espia())

    r = await client.post(
        "/api/whatsapp/send",
        json={"to_phone": "+34600000000", "message_text": "hola"},
        headers=operator_headers,
    )
    assert r.status_code == 200, r.text[:200]
    assert llamadas == ["send_message"], f"el espia no intercepto: {llamadas}"
