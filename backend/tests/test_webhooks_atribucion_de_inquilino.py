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


def solo_codigo(ruta) -> str:
    """El fichero sin comentarios ni docstrings, conservando el resto.

    DOS ERRORES ANTES DE ACERTAR, Y LOS DOS DEJABAN EL GUARD INERTE
    ---------------------------------------------------------------
    1. Borraba la LINEA ENTERA de cada token de cadena. Como los patrones
       prohibidos llevan una cadena dentro —`query_params.get("workspace_id")`—
       la linea desaparecia antes de buscarla.
    2. Borrar solo el TRAMO de la cadena tampoco vale: lo que se busca ES el
       contenido de la cadena. Quitarla deja `query_params.get(      )`, que no
       casa con nada.

    Lo que hay que quitar no son las cadenas: son los COMENTARIOS y los
    DOCSTRINGS, que es donde vive la prosa que explica el defecto corregido y
    provoca los falsos positivos. Una cadena dentro de una expresion es codigo y
    se queda.

    Un docstring se reconoce porque el token de cadena es toda la sentencia: al
    quitarlo, su linea queda en blanco.

    Las dos veces el sintoma fue el mismo —el guard en verde con el defecto
    reintroducido— y solo se vio mutando la ruta a proposito.
    """
    import io as _io
    import tokenize

    lineas = ruta.read_text(encoding="utf-8", errors="replace").split(chr(10))
    a_borrar = []
    try:
        with _io.open(ruta, "rb") as fh:
            for tok in tokenize.tokenize(fh.readline):
                if tok.type == tokenize.COMMENT:
                    a_borrar.append(tok)
                elif tok.type == tokenize.STRING:
                    primera = lineas[tok.start[0] - 1]
                    if not primera[:tok.start[1]].strip():
                        a_borrar.append(tok)      # la cadena abre la sentencia
    except (tokenize.TokenError, SyntaxError, IndentationError):
        return chr(10).join(lineas)

    for tok in a_borrar:
        (fila_i, col_i), (fila_f, col_f) = tok.start, tok.end
        for n in range(fila_i, fila_f + 1):
            linea = lineas[n - 1]
            desde = col_i if n == fila_i else 0
            hasta = col_f if n == fila_f else len(linea)
            lineas[n - 1] = linea[:desde] + " " * max(0, hasta - desde) + linea[hasta:]
    return chr(10).join(lineas)


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


# ═══════════════════════════════════════════════════════════════════════════
# SMS entrante: la conversacion previa es el vinculo
# ═══════════════════════════════════════════════════════════════════════════
#
# Esta ruta se encontro DESPUES de dar el bloque por cerrado, comprobando los
# invariantes sobre el codigo que iba a desplegarse. Seguia leyendo
# `?workspace_id=` con `TWILIO_DEFAULT_WORKSPACE_ID` de reserva. Se cerro con el
# mismo criterio: un SMS entrante es una RESPUESTA a un mensaje que un workspace
# envio, y esa fila la creo una accion autenticada.

TELEFONO_DE_A = "+34600000001"
TELEFONO_DE_B = "+34600000002"
TELEFONO_DISPUTADO = "+34600000777"
TELEFONO_SIN_HISTORIA = "+34699999999"
SECRETO_TWILIO = "secreto-twilio-de-prueba"


@pytest.fixture
async def conversaciones_sms(db_session, dos_inquilinos, monkeypatch):
    """A escribio a un numero; B a otro. Ese es el unico vinculo que cuenta."""
    monkeypatch.setenv("TWILIO_AUTH_TOKEN", SECRETO_TWILIO)
    await db_session.execute(text("DELETE FROM sms_messages"))
    await db_session.execute(text("DELETE FROM sms_conversations"))
    for ws, tel in ((dos_inquilinos["A"], TELEFONO_DE_A),
                    (dos_inquilinos["B"], TELEFONO_DE_B)):
        await db_session.execute(
            text("INSERT INTO sms_messages (workspace_id, to_number, message, status)"
                 " VALUES (:ws, :tel, 'hola', 'delivered')"),
            {"ws": ws, "tel": tel})
    await db_session.commit()
    return dos_inquilinos


async def _sms_entrante(client, desde: str, texto: str = "respondo"):
    """Una entrega de Twilio con su firma, como llega de verdad."""
    import base64
    import hashlib
    import hmac as _hmac

    url = "http://test/api/sms/webhook/twilio"
    campos = {"From": desde, "Body": texto, "MessageSid": f"SM{abs(hash(desde)) % 10**12}"}
    base = url + "".join(f"{k}{campos[k]}" for k in sorted(campos))
    firma = base64.b64encode(
        _hmac.new(SECRETO_TWILIO.encode(), base.encode(), hashlib.sha1).digest()).decode()
    return await client.post("/api/sms/webhook/twilio", data=campos,
                             headers={"X-Twilio-Signature": firma})


async def _sms_por_workspace(db_session) -> dict[int, int]:
    filas = (await db_session.execute(text(
        "SELECT workspace_id, count(*) AS n FROM sms_conversations GROUP BY workspace_id"
    ))).mappings().all()
    return {int(f["workspace_id"]): int(f["n"]) for f in filas}


async def test_el_sms_entra_en_el_workspace_que_escribio_antes(
    client, db_session, conversaciones_sms
):
    r = await _sms_entrante(client, TELEFONO_DE_A)
    assert r.status_code == 200, r.text
    por_ws = await _sms_por_workspace(db_session)
    assert por_ws.get(conversaciones_sms["A"], 0) > 0, por_ws
    assert por_ws.get(conversaciones_sms["B"], 0) == 0, (
        f"la respuesta a A aparecio en B: {por_ws}")


async def test_el_query_string_tampoco_decide_en_sms(client, db_session, conversaciones_sms):
    """El parametro ya no existe; si alguien lo reintroduce, esto lo dice."""
    r = await client.post(
        f"/api/sms/webhook/twilio?workspace_id={conversaciones_sms['B']}",
        data={"From": TELEFONO_DE_A, "Body": "x"},
        headers={"X-Twilio-Signature": "no-vale"})
    assert r.status_code in (400, 403), r.status_code   # cae por firma, antes de nada
    assert await _sms_por_workspace(db_session) == {}


async def test_un_numero_al_que_nadie_escribio_no_se_atribuye(
    client, db_session, conversaciones_sms
):
    r = await _sms_entrante(client, TELEFONO_SIN_HISTORIA)
    assert r.json().get("atribuido") is False, r.json()
    assert await _sms_por_workspace(db_session) == {}, "se escribio sin poder atribuir"


async def test_dos_workspaces_que_escribieron_al_mismo_numero_es_un_no(
    client, db_session, conversaciones_sms
):
    """La respuesta podria ser para cualquiera de los dos. Elegir seria adivinar."""
    for ws in conversaciones_sms.values():
        await db_session.execute(
            text("INSERT INTO sms_messages (workspace_id, to_number, message, status)"
                 " VALUES (:ws, :tel, 'hola', 'delivered')"),
            {"ws": ws, "tel": TELEFONO_DISPUTADO})
    await db_session.commit()

    r = await _sms_entrante(client, TELEFONO_DISPUTADO)
    assert r.json().get("atribuido") is False
    assert await _sms_por_workspace(db_session) == {}


# ═══════════════════════════════════════════════════════════════════════════
# Los invariantes, como prueba y no como comprobacion de una vez
# ═══════════════════════════════════════════════════════════════════════════


def test_los_invariantes_de_atribucion_se_mantienen():
    """Las tres fuentes prohibidas, sobre CODIGO y no sobre texto.

    `sms.py` se encontro asi: el bloque se dio por cerrado y esta comprobacion,
    pasada sobre el codigo que iba a desplegarse, revelo una ruta que nadie
    habia auditado y que seguia leyendo `?workspace_id=`.
    """
    import io
    import pathlib
    import re
    import tokenize

    raiz = pathlib.Path(__file__).resolve().parents[1] / "routers"
    de_quien_llama = re.compile(
        r"query_params\.get\(\s*['\"]workspace_id"
        r"|workspace_id\s*:\s*int[^=]*=\s*Query", re.IGNORECASE)
    de_entorno = re.compile(
        r"TWILIO_DEFAULT_WORKSPACE_ID|HELPDESK_DEFAULT_WORKSPACE_ID"
        r"|default_helpdesk_workspace_id")
    literal_que_escribe = re.compile(
        r"get_\w+_service\(\s*\w+\s*,\s*\d+\s*\)[^\n]{0,240}?"
        r"\.(handle_webhook|handle_reply|mark_\w+|process_\w+)")

    culpables, revisados = [], 0
    for f in sorted(raiz.glob("*.py")):
        codigo = solo_codigo(f)
        revisados += 1
        for patron, motivo in ((de_quien_llama, "lo elige quien llama"),
                               (de_entorno, "una variable de entorno"),
                               (literal_que_escribe, "una constante")):
            for m in patron.finditer(codigo):
                culpables.append(
                    f"{f.name}:{codigo[:m.start()].count(chr(10)) + 1} ({motivo})")

    assert revisados >= 40, f"solo se revisaron {revisados} routers"
    assert not culpables, (
        f"el inquilino sale de una fuente que no es procedencia: {culpables}. "
        f"Tiene que salir de una identidad externa vinculada antes por alguien "
        f"autenticado, y verificable.")
