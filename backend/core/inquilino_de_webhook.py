"""De quien es este webhook. Fail-closed: si no se puede demostrar, no se escribe.

EL PROBLEMA
-----------
Un webhook entrante no tiene usuario. Verificar la firma demuestra que el cuerpo
viene del proveedor —que no lo fabrico un tercero— pero NO dice a que inquilino
pertenece. Esas son dos preguntas distintas y hoy el codigo respondia la segunda
de tres maneras, las tres malas:

    workspace 1 a fuego        instagram_dm, facebook_messenger, tiktok_dm,
                               text2pay. Todo DM de todo inquilino aterrizaba en
                               el workspace 1.
    variable de entorno        whatsapp, via HELPDESK_DEFAULT_WORKSPACE_ID: un
                               unico inquilino para toda la instalacion.
    query string               helpdesk `/inbound/*`: `?workspace_id=` lo pone
                               quien hace la peticion. Es decir, lo elige quien
                               ataca.

Ninguna es una respuesta: son tres formas de no contestar.

DE DONDE PUEDE SALIR EL INQUILINO, Y DE DONDE NO
------------------------------------------------
Solo vale un identificador que cumpla las DOS cosas:

  1. viene DENTRO del cuerpo que la firma cubre, asi que un tercero no lo pudo
     elegir; y
  2. NELVYON ya lo tiene asociado a un workspace en su propia base, porque
     alguien conecto esa cuenta desde dentro del producto.

Es decir: el proveedor dice «esto es de la cuenta X», y NELVYON mira en sus
tablas de quien es la cuenta X. El atacante no puede inventarse la asociacion
porque no puede escribir en esas tablas, y no puede reetiquetar el cuerpo porque
la firma lo cubre.

Lo que NUNCA vale: query string, cabeceras, campos del cuerpo que la firma no
cubre, variables de entorno con un inquilino por defecto, y desde luego un
literal.

DOS AMBIGUEDADES QUE TAMBIEN SON UN NO
--------------------------------------
    cuenta desconocida     nadie ha conectado esa cuenta: no hay a quien
                           atribuirlo. Se rechaza; no se inventa un destino.
    cuenta duplicada       dos workspaces dicen tener la misma cuenta externa.
                           Uno de los dos miente —es exactamente como se robaria
                           el trafico de otro— y no hay forma de saber cual. Se
                           rechaza y se registra.

QUE DEVUELVE UN RECHAZO
-----------------------
`202 Accepted` con `atribuido: false`, no un 4xx. Los proveedores reintentan
ante un error y luego desactivan el endpoint; un webhook autentico que no
podemos atribuir no es un fallo del proveedor. Se acepta, no se escribe, y queda
registrado para que se vea. Lo que no se hace jamas es escribirlo en algun sitio
«por si acaso».
"""
from __future__ import annotations

import logging
import os

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class InquilinoNoAtribuible(Exception):
    """El webhook es autentico pero no se puede decir de quien es.

    No hereda de `HTTPException` a proposito: quien la reciba decide si responde
    202 —lo normal— o la propaga. Que la decision sea explicita evita que un
    `except HTTPException` de mas arriba la convierta en un 500.
    """

    def __init__(self, motivo: str, proveedor: str, cuenta: str | None = None):
        self.motivo = motivo
        self.proveedor = proveedor
        self.cuenta = cuenta
        super().__init__(f"{proveedor}: {motivo}")


# ═══════════════════════════════════════════════════════════════════════════
# Resolucion por cuenta externa
# ═══════════════════════════════════════════════════════════════════════════


async def workspace_de_cuenta(
    sesion: AsyncSession, proveedor: str, cuenta_externa: str | None
) -> int:
    """El workspace que conecto `cuenta_externa` en `proveedor`.

    `oauth_tokens` es la tabla donde queda constancia de que alguien, DESDE
    DENTRO del producto y autenticado, conecto una cuenta a su workspace. Esa
    fila es la unica fuente legitima: la escribio un usuario identificado, no el
    webhook.

    Lanza `InquilinoNoAtribuible` si la cuenta no esta conectada o si hay mas de
    un workspace reclamandola.
    """
    cuenta = (cuenta_externa or "").strip()
    if not cuenta:
        raise InquilinoNoAtribuible(
            "el cuerpo firmado no trae identificador de cuenta", proveedor)

    filas = (await sesion.execute(
        text("""
            SELECT DISTINCT workspace_id
              FROM oauth_tokens
             WHERE provider = :proveedor
               AND account_id = :cuenta
               AND workspace_id IS NOT NULL
        """),
        {"proveedor": proveedor, "cuenta": cuenta},
    )).scalars().all()

    if not filas:
        raise InquilinoNoAtribuible("cuenta no conectada por ningun workspace",
                                    proveedor, cuenta)
    if len(filas) > 1:
        # Dos inquilinos reclamando la misma cuenta externa es como se robaria el
        # trafico de otro. Elegir uno seria elegir a quien se lo entregamos.
        logger.error(
            "webhook_cuenta_ambigua",
            extra={"webhook_proveedor": proveedor,
                   "webhook_workspaces": sorted(int(w) for w in filas)},
        )
        raise InquilinoNoAtribuible(
            f"{len(filas)} workspaces reclaman la misma cuenta", proveedor, cuenta)

    return int(filas[0])


#: Las consultas de resolucion por fila, ESCRITAS ENTERAS.
#:
#: La primera version componia `f'SELECT workspace_id FROM "{tabla}" WHERE
#: "{columna}" = :valor'` y validaba `tabla` y `columna` contra una lista
#: cerrada. Era correcto, pero el barrido de seguridad no puede ver esa
#: validacion: solo ve dos identificadores metidos en el SQL. Y tenia razon en
#: quejarse — la validacion y la interpolacion estaban a veinte lineas de
#: distancia, que es justo donde se pierden con el siguiente cambio.
#:
#: Escribirlas enteras cuesta cuatro lineas mas y quita el problema de raiz: ya
#: no hay nada que interpolar, asi que no hay nada que validar.
_CONSULTAS_DE_FILA = {
    ("text2pay_payments", "id"):
        "SELECT workspace_id FROM text2pay_payments WHERE id = :valor LIMIT 1",
    ("text2pay_payments", "stripe_session_id"):
        "SELECT workspace_id FROM text2pay_payments "
        " WHERE stripe_session_id = :valor LIMIT 1",
    ("cpq_quotes", "id"):
        "SELECT workspace_id FROM cpq_quotes WHERE id = :valor LIMIT 1",
    ("dialer_calls", "call_sid"):
        "SELECT workspace_id FROM dialer_calls WHERE call_sid = :valor LIMIT 1",
}


async def workspace_de_fila(
    sesion: AsyncSession, tabla: str, columna: str, valor: str, proveedor: str
) -> int:
    """El workspace duenno de una fila que NELVYON creo antes.

    Para los webhooks de pago, de presupuesto y de telefonia el identificador no
    es una cuenta sino un registro propio —un pago, un presupuesto, una llamada—
    que NELVYON creo cuando un usuario autenticado lo pidio, y cuyo identificador
    viajo hasta el proveedor y vuelve dentro del cuerpo firmado. La fila sabe de
    quien es.
    """
    consulta = _CONSULTAS_DE_FILA.get((tabla, columna))
    if consulta is None:
        raise ValueError(
            f"no hay consulta declarada para {tabla}.{columna}. Escribela entera "
            f"en `_CONSULTAS_DE_FILA`; aqui no se compone SQL.")

    ws = (await sesion.execute(text(consulta), {"valor": valor})).scalar_one_or_none()
    if ws is None:
        raise InquilinoNoAtribuible(
            f"no hay fila en {tabla} con ese identificador", proveedor, valor)
    return int(ws)


# ═══════════════════════════════════════════════════════════════════════════
# La sesion con la que se escribe
# ═══════════════════════════════════════════════════════════════════════════


async def sesion_de_webhook():
    """Sesion ligada a `nelvyon_jobs` para escribir sin usuario. Fail-closed.

    POR QUE NO SE REUTILIZA `sesion_de_barrido` TAL CUAL
    -----------------------------------------------------
    `sesion_de_barrido()` devuelve la sesion NORMAL cuando
    `NELVYON_JOBS_DATABASE_URL` no esta puesta. Para los tres bucles de fondo esa
    degradacion es deliberada y esta documentada: mientras el operador no reparta
    la credencial, nada cambia.

    Aqui esa misma degradacion seria un fallo silencioso. Un webhook que cae al
    rol `nelvyon_app` escribe bajo RLS sin usuario y sin workspace fijado: las
    politicas deniegan, la fila no se escribe, y el proveedor recibe un 2xx. Se
    perderia trafico real de clientes sin un solo sintoma.

    Asi que en produccion, sin la variable, esto corta. Fuera de produccion cae a
    la sesion normal para que la suite —que corre sobre SQLite y sobre bases de
    certificacion de un solo rol— siga siendo ejecutable.
    """
    from core.config import settings
    from core.database import db_manager, sesion_de_barrido

    if not (os.environ.get("NELVYON_JOBS_DATABASE_URL") or "").strip():
        if getattr(settings, "is_production", False):
            logger.error("webhook_sin_credencial_de_jobs")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Webhook writer role is not configured",
            )
        await db_manager.ensure_initialized()
        return db_manager.async_session_maker()

    return await sesion_de_barrido()


# ═══════════════════════════════════════════════════════════════════════════
# Lo que un atacante NO puede aportar
# ═══════════════════════════════════════════════════════════════════════════

#: Sitios desde los que un webhook jamas debe leer el inquilino. Existe como dato
#: —y no solo como norma en un docstring— para que una prueba pueda recorrer las
#: rutas y comprobarlo.
PROCEDENCIAS_PROHIBIDAS = (
    "query_params.get('workspace_id')",
    "query_params.get(\"workspace_id\")",
    "headers.get('x-workspace-id')",
    "HELPDESK_DEFAULT_WORKSPACE_ID",
)


# ═══════════════════════════════════════════════════════════════════════════
# El identificador de cuenta, sacado del cuerpo que la firma cubre
# ═══════════════════════════════════════════════════════════════════════════


def cuenta_de_cuerpo(proveedor: str, payload: dict) -> str | None:
    """El identificador de cuenta del proveedor dentro del cuerpo firmado.

    Devuelve `None` cuando el formato no trae ninguno; quien llama lo trata como
    «no atribuible», nunca como «pues el workspace 1».

    Meta manda `entry[].id`: para Instagram es el identificador de la cuenta
    profesional y para Messenger el de la pagina. WhatsApp Business manda ademas
    `phone_number_id` dentro de `changes[].value.metadata`, que es mas preciso
    —una WABA puede tener varios numeros— y por eso se prefiere.
    """
    entradas = payload.get("entry") or []
    if not isinstance(entradas, list):
        return None

    if proveedor == "whatsapp":
        for entrada in entradas:
            for cambio in (entrada or {}).get("changes") or []:
                metadatos = ((cambio or {}).get("value") or {}).get("metadata") or {}
                numero = metadatos.get("phone_number_id")
                if numero:
                    return str(numero)
        # Sin numero, la WABA sigue identificando al inquilino.
        for entrada in entradas:
            if (entrada or {}).get("id"):
                return str(entrada["id"])
        return None

    if proveedor in ("instagram", "facebook", "messenger"):
        for entrada in entradas:
            if (entrada or {}).get("id"):
                return str(entrada["id"])
        return None

    if proveedor == "zoom":
        # Zoom manda la cuenta en `payload.account_id`. Es la cuenta de Zoom que
        # alguien conecto a su workspace, no un dato que elija quien llama.
        interior = payload.get("payload") or {}
        return str(interior.get("account_id")) if interior.get("account_id") else None

    if proveedor == "tiktok":
        # TikTok NO manda identificador de la cuenta RECEPTORA en el cuerpo que
        # procesamos: `open_id`, `from_user_id` y `sender_id` son el REMITENTE, y
        # atribuir por remitente significaria que quien escribe elige el
        # inquilino — el mismo defecto con otra cara.
        #
        # Se buscan los campos que si identificarian la cuenta del inquilino. Si
        # no viene ninguno, no se atribuye. Es preferible dejar de procesar DMs
        # de TikTok a seguir metiendolos todos en el workspace 1.
        for clave in ("to_user_id", "receiver_id", "account_id", "shop_id"):
            for sitio in (payload, payload.get("data") or {}):
                if isinstance(sitio, dict) and sitio.get(clave):
                    return str(sitio[clave])
        return None

    return None


def respuesta_no_atribuible(exc: InquilinoNoAtribuible) -> dict:
    """La respuesta a un webhook autentico que no se puede atribuir.

    202 y `atribuido: false`. NO es un 4xx: los proveedores reintentan ante un
    error y acaban desactivando el endpoint, y no hay nada que el proveedor pueda
    corregir —el fallo es que en NELVYON nadie conecto esa cuenta—. Se acepta, no
    se escribe nada, y queda en el log para que se vea.

    Se registra la cuenta pero NUNCA el cuerpo: puede llevar mensajes de personas.
    """
    logger.warning(
        "webhook_no_atribuido",
        extra={"webhook_proveedor": exc.proveedor,
               "webhook_cuenta": exc.cuenta,
               "webhook_motivo": exc.motivo},
    )
    return {
        "atribuido": False,
        "proveedor": exc.proveedor,
        "motivo": exc.motivo,
        "procesados": 0,
    }


async def workspace_de_direccion(sesion: AsyncSession, destinatario: str | None) -> int:
    """El workspace duenno de la direccion a la que se escribio.

    El correo entrante llega por SES: el cuerpo firmado dice a QUE direccion se
    envio, y esa direccion la configuro el inquilino desde dentro del producto.
    `whitelabel_configs.ses_domain_verified` es la parte que hace que esto sea
    procedencia y no una declaracion: Amazon comprobo el dominio contra un
    registro DNS que solo controla su duenno.

    Se acepta la coincidencia exacta con `support_email` o, si no, el dominio
    contra `custom_domain` — pero SOLO si el dominio esta verificado. Un dominio
    sin verificar lo puede declarar cualquiera, y entonces bastaria decir «mi
    dominio es el del competidor» para quedarse con su correo.
    """
    direccion = (destinatario or "").strip().lower()
    if not direccion or "@" not in direccion:
        raise InquilinoNoAtribuible(
            "el cuerpo firmado no trae destinatario", "ses", destinatario)

    ws = (await sesion.execute(
        text("""
            SELECT workspace_id FROM whitelabel_configs
             WHERE ses_domain_verified IS TRUE
               AND lower(support_email) = :direccion
             LIMIT 1
        """),
        {"direccion": direccion},
    )).scalar_one_or_none()
    if ws is not None:
        return int(ws)

    dominio = direccion.rsplit("@", 1)[1]
    filas = (await sesion.execute(
        text("""
            SELECT DISTINCT workspace_id FROM whitelabel_configs
             WHERE ses_domain_verified IS TRUE
               AND lower(custom_domain) = :dominio
        """),
        {"dominio": dominio},
    )).scalars().all()

    if not filas:
        raise InquilinoNoAtribuible(
            "ningun workspace tiene verificada esa direccion o su dominio",
            "ses", direccion)
    if len(filas) > 1:
        logger.error("webhook_dominio_ambiguo",
                     extra={"webhook_dominio": dominio,
                            "webhook_workspaces": sorted(int(w) for w in filas)})
        raise InquilinoNoAtribuible(
            f"{len(filas)} workspaces tienen verificado el mismo dominio",
            "ses", direccion)
    return int(filas[0])


def destinatario_de_sns(mensaje: dict) -> str | None:
    """La direccion a la que se escribio, dentro de la notificacion de SES.

    SES la manda en `mail.destination`, una lista. Se toma la primera: si un
    correo va a varias direcciones de inquilinos distintos hay que decidir a
    proposito a quien pertenece, y hoy no hay ninguna regla que lo diga — asi que
    lo que NO se hace es abrirlo en los dos.
    """
    import json as _json

    cuerpo = mensaje.get("Message")
    if isinstance(cuerpo, str):
        try:
            cuerpo = _json.loads(cuerpo)
        except (ValueError, TypeError):
            return None
    if not isinstance(cuerpo, dict):
        return None
    destinos = ((cuerpo.get("mail") or {}).get("destination")) or []
    if isinstance(destinos, str):
        return destinos
    return str(destinos[0]) if destinos else None
