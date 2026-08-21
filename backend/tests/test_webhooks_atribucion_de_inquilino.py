"""Un webhook firmado escribe en SU inquilino, y en ningun otro.

QUE SE ENCONTRO
---------------
Verificar la firma y saber de quien es el mensaje son DOS preguntas. Los webhooks
respondian la primera bien y la segunda de tres formas que no son respuestas:

    workspace 1 a fuego   instagram_dm, facebook_messenger, tiktok_dm, text2pay
                          y —via `or 1`— dialer. Todo el trafico de todos los
                          inquilinos aterrizaba en el mismo workspace.
    query string          helpdesk `/inbound/email`, `/inbound/whatsapp`,
                          bookings `/webhook/zoom` y dialer: `?workspace_id=` lo
                          pone quien hace la peticion, o sea quien ataca.
    variable de entorno   whatsapp, via `HELPDESK_DEFAULT_WORKSPACE_ID`: una
                          instalacion entera escribiendo en un solo workspace.

POR QUE ESTAS PRUEBAS VAN CONTRA LAS RUTAS Y NO CONTRA LOS AYUDANTES
--------------------------------------------------------------------
Porque el defecto no estaba en ningun ayudante: `instagram_dm_service` acotaba
por `self.workspace_id` en todas sus consultas, correctamente. Estaba en el
numero que el router le pasaba. Una prueba del servicio habria pasado en verde
con el `1` a fuego todavia puesto, porque el servicio hacia su parte bien.

Asi que se manda una peticion HTTP firmada a la ruta de verdad y se mira en que
workspace acabo la fila.

EL CASO QUE MAS IMPORTA
-----------------------
`test_el_query_string_no_puede_reescribir_el_inquilino`: cuerpo firmado que
nombra la cuenta de A, y `?workspace_id=<B>` en la URL. Tiene que acabar en A.
Es la version ejecutable de «no confiar en el `workspace_id` que aporta quien
llama».
"""
from __future__ import annotations

import hashlib
import hmac
import json
import pytest
from sqlalchemy import text

pytestmark = pytest.mark.asyncio

SECRETO = "secreto-de-instagram-de-prueba"
CUENTA_A = "17841400000000001"
CUENTA_B = "17841400000000002"
CUENTA_DESCONOCIDA = "17841499999999999"
CUENTA_DISPUTADA = "17841400000000777"


def _firmar(cuerpo: bytes) -> str:
    return "sha256=" + hmac.new(SECRETO.encode(), cuerpo, hashlib.sha256).hexdigest()


def _cuerpo(cuenta: str, texto: str = "hola", remitente: str = "cliente-1") -> bytes:
    """Un DM entrante con la forma exacta que manda Meta."""
    return json.dumps({
        "object": "instagram",
        "entry": [{
            "id": cuenta,
            "messaging": [{
                "sender": {"id": remitente},
                "message": {"text": texto},
            }],
        }],
    }).encode()


@pytest.fixture(autouse=True)
def _secreto_de_firma(monkeypatch):
    """Sin secreto el verificador corta con 503 y no se probaria nada."""
    monkeypatch.setenv("INSTAGRAM_APP_SECRET", SECRETO)
    # El bot responde con IA; en las pruebas no se llama a ningun proveedor.
    monkeypatch.setenv("NELVYON_MOCK_AI", "1")


@pytest.fixture
async def dos_inquilinos(db_session):
    """Dos workspaces, cada uno con SU cuenta de Instagram conectada.

    Las filas de `oauth_tokens` son la constancia de que alguien, autenticado y
    desde dentro del producto, conecto esa cuenta. Es la unica procedencia que
    el resolutor acepta.
    """
    await db_session.execute(text("DELETE FROM oauth_tokens"))
    await db_session.execute(text("DELETE FROM instagram_dm_messages"))
    for ws, cuenta in ((101, CUENTA_A), (202, CUENTA_B)):
        await db_session.execute(
            text("INSERT INTO oauth_tokens (workspace_id, user_id, provider, "
                 "access_token, account_id) "
                 "VALUES (:ws, :uid, 'instagram', 'no-real', :cuenta)"),
            {"ws": ws, "uid": f"usuario-{ws}", "cuenta": cuenta})
    await db_session.commit()
    return {"A": 101, "B": 202}


async def _mensajes_por_workspace(db_session) -> dict[int, int]:
    filas = (await db_session.execute(text(
        "SELECT workspace_id, count(*) AS n FROM instagram_dm_messages "
        "GROUP BY workspace_id"))).mappings().all()
    return {int(f["workspace_id"]): int(f["n"]) for f in filas}


async def _enviar(client, cuerpo: bytes, sufijo: str = ""):
    return await client.post(
        f"/api/instagram-dm/webhook{sufijo}",
        content=cuerpo,
        headers={"x-hub-signature-256": _firmar(cuerpo),
                 "content-type": "application/json"},
    )


# ═══════════════════════════════════════════════════════════════════════════
# Positivo
# ═══════════════════════════════════════════════════════════════════════════


async def test_el_mensaje_acaba_en_el_workspace_que_conecto_la_cuenta(
    client, db_session, dos_inquilinos
):
    r = await _enviar(client, _cuerpo(CUENTA_A))
    assert r.status_code == 200, r.text

    por_ws = await _mensajes_por_workspace(db_session)
    assert por_ws.get(dos_inquilinos["A"], 0) > 0, (
        f"el mensaje de la cuenta de A no llego a su workspace: {por_ws}")


# ═══════════════════════════════════════════════════════════════════════════
# Negativos: nada cruza de inquilino
# ═══════════════════════════════════════════════════════════════════════════


async def test_el_otro_inquilino_no_ve_nada(client, db_session, dos_inquilinos):
    """Lo importante no es que llegue a A: es que NO llegue a B."""
    await _enviar(client, _cuerpo(CUENTA_A, "mensaje privado de A"))

    por_ws = await _mensajes_por_workspace(db_session)
    assert por_ws.get(dos_inquilinos["B"], 0) == 0, (
        f"el mensaje de A aparecio tambien en B: {por_ws}")
    assert por_ws.get(1, 0) == 0, (
        "el mensaje acabo en el workspace 1: vuelve a haber un destino fijo")


async def test_el_query_string_no_puede_reescribir_el_inquilino(
    client, db_session, dos_inquilinos
):
    """LA PRUEBA DISCRIMINANTE.

    Cuerpo firmado que nombra la cuenta de A, y `?workspace_id=<B>` en la URL.
    El cuerpo lo firmo Meta; la URL la escribe quien llama. Gana el cuerpo.
    """
    await _enviar(client, _cuerpo(CUENTA_A, "de A"),
                  sufijo=f"?workspace_id={dos_inquilinos['B']}")

    por_ws = await _mensajes_por_workspace(db_session)
    assert por_ws.get(dos_inquilinos["B"], 0) == 0, (
        f"el query string decidio el inquilino: {por_ws}. Quien llama elige "
        f"donde se escribe, que es exactamente el defecto que se corrigio.")
    assert por_ws.get(dos_inquilinos["A"], 0) > 0


async def test_cada_cuenta_escribe_solo_en_la_suya(client, db_session, dos_inquilinos):
    """Con los dos inquilinos activos a la vez, ninguno ve el trafico del otro."""
    await _enviar(client, _cuerpo(CUENTA_A, "para A", remitente="cli-a"))
    await _enviar(client, _cuerpo(CUENTA_B, "para B", remitente="cli-b"))

    por_ws = await _mensajes_por_workspace(db_session)
    assert por_ws.get(dos_inquilinos["A"], 0) > 0
    assert por_ws.get(dos_inquilinos["B"], 0) > 0

    cruzados = (await db_session.execute(text(
        "SELECT count(*) FROM instagram_dm_messages "
        " WHERE workspace_id = :a AND body LIKE '%para B%'"),
        {"a": dos_inquilinos["A"]})).scalar()
    assert cruzados == 0, "el mensaje de B aparece dentro del workspace de A"


# ═══════════════════════════════════════════════════════════════════════════
# Fail-closed: si no se puede atribuir, no se escribe
# ═══════════════════════════════════════════════════════════════════════════


async def test_una_cuenta_que_nadie_conecto_no_se_escribe_en_ningun_sitio(
    client, db_session, dos_inquilinos
):
    r = await _enviar(client, _cuerpo(CUENTA_DESCONOCIDA))
    assert r.status_code == 200
    assert r.json().get("atribuido") is False, r.json()

    por_ws = await _mensajes_por_workspace(db_session)
    assert sum(por_ws.values()) == 0, (
        f"se escribio un mensaje que no se podia atribuir: {por_ws}. Elegir un "
        f"destino «por si acaso» es como empezo esto.")


async def test_dos_workspaces_reclamando_la_misma_cuenta_es_un_no(
    client, db_session, dos_inquilinos
):
    """Uno de los dos miente y no hay forma de saber cual.

    Es como se robaria el trafico de otro: conectar su identificador de cuenta.
    Elegir uno seria elegir a quien le entregamos los mensajes del otro.

    Que esto pueda ocurrir NO es hipotetico: la clave unica de `oauth_tokens` es
    `(workspace_id, user_id, provider)` y NO incluye `account_id`, asi que la
    base acepta que dos workspaces declaren la misma cuenta externa. Cerrarlo en
    el origen pide un indice unico, es decir una migracion de produccion. Hasta
    entonces, el resolutor se niega — que es lo unico correcto que puede hacer.
    """
    for ws in dos_inquilinos.values():
        await db_session.execute(
            text("INSERT INTO oauth_tokens (workspace_id, user_id, provider, "
                 "access_token, account_id) "
                 "VALUES (:ws, :uid, 'instagram', 'no-real', :cuenta)"),
            {"ws": ws, "uid": f"otro-usuario-{ws}", "cuenta": CUENTA_DISPUTADA})
    await db_session.commit()

    r = await _enviar(client, _cuerpo(CUENTA_DISPUTADA))
    assert r.json().get("atribuido") is False

    por_ws = await _mensajes_por_workspace(db_session)
    assert sum(por_ws.values()) == 0, f"se eligio un inquilino de dos: {por_ws}"


async def test_sin_firma_valida_no_se_llega_ni_a_resolver(client, db_session, dos_inquilinos):
    """Control: el orden importa. Primero autenticidad, luego atribucion."""
    cuerpo = _cuerpo(CUENTA_A)
    r = await client.post(
        "/api/instagram-dm/webhook",
        content=cuerpo,
        headers={"x-hub-signature-256": "sha256=" + "0" * 64,
                 "content-type": "application/json"},
    )
    assert r.status_code == 400
    assert sum((await _mensajes_por_workspace(db_session)).values()) == 0


# ═══════════════════════════════════════════════════════════════════════════
# Invariante estructural: que no vuelva a entrar por otra ruta
# ═══════════════════════════════════════════════════════════════════════════


def test_ninguna_ruta_saca_el_inquilino_de_donde_no_debe():
    """Inventario vivo. Si aparece un webhook nuevo con un destino fijo, o leyendo
    el workspace del query string, esta prueba lo dice.

    Se mira el CODIGO, no el texto: los comentarios que explican el defecto
    corregido nombran `HELPDESK_DEFAULT_WORKSPACE_ID` y `?workspace_id=`, y una
    busqueda sobre el fichero entero los senala a ellos. Un guard que casa con
    prosa no comprueba nada — ya paso una vez con el guard de roles.
    """
    import io
    import pathlib
    import re
    import tokenize

    def solo_codigo(ruta: pathlib.Path) -> str:
        """El fichero sin comentarios ni cadenas, conservando los numeros de linea."""
        lineas = ruta.read_text(encoding="utf-8", errors="replace").split(chr(10))
        salida = list(lineas)
        try:
            with io.open(ruta, "rb") as fh:
                for tok in tokenize.tokenize(fh.readline):
                    if tok.type not in (tokenize.COMMENT, tokenize.STRING):
                        continue
                    for n in range(tok.start[0], tok.end[0] + 1):
                        salida[n - 1] = ""
        except (tokenize.TokenError, SyntaxError, IndentationError):
            return chr(10).join(lineas)     # ante la duda, se mira todo
        return chr(10).join(salida)

    raiz = pathlib.Path(__file__).resolve().parents[1] / "routers"
    prohibido = re.compile(
        r"query_params\.get\(\s*['\"]workspace_id"
        r"|HELPDESK_DEFAULT_WORKSPACE_ID"
        r"|default_helpdesk_workspace_id\s*\("
        r"|get_\w+_service\(\s*\w+\s*,\s*\d+\s*\)\s*\.\s*\w*(webhook|inbound|viewed|mark)",
        re.IGNORECASE)

    culpables, revisados = [], 0
    for f in sorted(raiz.glob("*.py")):
        codigo = solo_codigo(f)
        revisados += 1
        for m in prohibido.finditer(codigo):
            culpables.append(f"{f.name}:{codigo[:m.start()].count(chr(10)) + 1}")

    assert revisados >= 40, (
        f"solo se revisaron {revisados} routers: si el arbol cambio de sitio, "
        f"esta prueba estaria pasando sin mirar nada")
    assert not culpables, (
        f"estas rutas sacan el inquilino de una fuente que elige quien llama, o "
        f"de un literal: {culpables}. Tiene que salir de un identificador que "
        f"venga DENTRO del cuerpo firmado y que NELVYON ya tenga asociado a un "
        f"workspace.")
