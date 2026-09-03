"""Nada que pueda gastar dinero se ejecuta sin preguntar a la politica de coste.

CLASE DE FALLO, ENCONTRADA TRES VECES EN UNA HORA
--------------------------------------------------
`PoliticaDeCosteCero` clasifica cada proveedor y cada operacion, y falla cerrado
ante `UNKNOWN_COST`. Esta bien construida.

Pero tres modulos que gastan dinero de verdad NO le preguntaban:

  · `GoogleAdsExecutor` creaba presupuestos y campanas contra la API real;
  · `SaasSmsService` enviaba SMS que Twilio factura por mensaje;
  · `SaasWhatsAppCloudService` abria conversaciones que Meta factura.

Lo unico que los frenaba era que no hubiera credenciales configuradas. Eso es
una guarda por AUSENCIA, no por diseno: el dia que se configuren —que es el
objetivo del producto— el freno desaparece sin que nadie cambie una linea.

Y en los tres casos la politica YA lo tenia declarado. `google_ads`, `twilio` y
`whatsapp` figuran como `PAID`; `crear_campana`, `enviar_sms` y `enviar_whatsapp`
como operaciones que cuestan. Lo unico que faltaba era preguntar.

Esta bateria existe para que el cuarto no repita la historia.

QUE COMPRUEBA
-------------
Que todo modulo que (a) nombra a un proveedor clasificado como `PAID` y (b)
hace una llamada saliente que MUTA o ENVIA, consulte la politica.

Leer NO cuenta como gastar: `fetchMessageTemplates` o `resolveWabaId` consultan
la API de Meta y no abren ninguna conversacion. Meterles una puerta de gasto
seria ruido, y el ruido ensena a ignorar las puertas.

COSTE EXTERNO: 0 EUR. Se leen ficheros.
"""
from __future__ import annotations

import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parents[2]
BACKEND = RAIZ / "backend"

#: Proveedores que la politica clasifica como `PAID`. Se derivan del fichero de
#: la politica, no se copian: si manana se anade uno, entra solo.
def _proveedores_de_pago() -> set[str]:
    fuente = (BACKEND / "coste" / "PoliticaDeCosteCero.ts").read_text(encoding="utf-8")
    ini = fuente.index("COSTE_POR_PROVEEDOR")
    fin = fuente.index("};", ini)
    return {
        m.group(1)
        for m in re.finditer(r'^\s{2}([a-z_]+):\s*\{\s*clase:\s*"PAID"', fuente[ini:fin], re.M)
    }

#: Como se nombra a cada proveedor en el codigo que lo llama.
_COMO_APARECEN = {
    "google_ads": r"GoogleAds|googleads\.googleapis",
    "meta_ads": r"MetaAds|graph\.facebook\.com/v\d+/act_",
    "tiktok_ads": r"TikTokAds|business-api\.tiktok",
    "linkedin_ads": r"LinkedInAds|api\.linkedin\.com/rest/adAccounts",
    "whatsapp": r"WhatsApp|META_WA_",
    "twilio": r"[Tt]wilio|TWILIO_",
    "openai": r"api\.openai\.com",
    "anthropic": r"api\.anthropic\.com",
    "gemini": r"generativelanguage\.googleapis",
    "openrouter": r"openrouter\.ai",
}

#: MUTAR o ENVIAR. Un GET no gasta.
_MUTA = re.compile(
    r'method:\s*"(POST|PUT|PATCH|DELETE)"'
    r"|\.post\(|\.put\(|\.patch\(|\.delete\("
    r"|async send[A-Za-z]*\(|createCampaign|createBudget|createAdGroup",
)

#: Las tres formas validas de preguntar. `exigirPuertaDeGasto` es la de una
#: linea, y es la que se quiere: preguntar costaba ocho lineas repetidas y por
#: eso se olvidaba. Un guardian que no reconociera la forma recomendada
#: acusaria precisamente a quien la usa.
_CONSULTA_POLITICA = re.compile(
    r"exigirPuertaDeGasto|decidirCoste|PoliticaDeCosteCero|modoCosteCeroActivo"
)

_COMENTARIO = re.compile(r"//[^\n]*|/\*.*?\*/", re.S)

#: Modulos que nombran un proveedor de pago y mutan, pero NO gastan.
#:
#: Cada entrada explica POR QUE. Una excepcion sin motivo es un permiso.
SIN_GASTO_A_PROPOSITO: dict[str, str] = {
    "backend/oauth/OAuthService.ts":
        "intercambia y refresca tokens; no ejecuta ninguna operacion del proveedor",
    "backend/integrations/google/GoogleDataFetcher.ts":
        "lee Analytics y Search Console; ninguna lectura abre gasto",
    "backend/integrations/meta/MetaDataFetcher.ts":
        "lee insights de campanas ya existentes; no crea ni activa nada",
    "backend/integrations/MetaAdsService.ts":
        "sube eventos de conversion a la CAPI de Meta; Meta no factura la ingesta "
        "de eventos, solo la entrega de anuncios",
    "backend/agency/OAuthMultiTenantFramework.ts":
        "gestiona conexiones OAuth por inquilino; no hace ni una llamada saliente "
        "al proveedor",
    "backend/agency/TelephonyCore.ts":
        "modela numeros y rutas de telefonia; quien marca de verdad es el dialer, "
        "y ese si tiene puerta",
    "backend/os-agents/ClosedLoopRoiService.ts":
        "compone la senal de conversion y delega el envio; el modulo que sale a "
        "la red es el que lleva la puerta",
    "backend/saas/BookingService.ts":
        "crea reservas en la base; el aviso al cliente lo manda el servicio de "
        "mensajeria, que ya pregunta",
    "backend/saas/SaasInboxService.ts":
        "guarda el mensaje en la bandeja; el envio real pasa por "
        "SaasWhatsAppCloudService, que tiene su puerta",
}


def _codigo(f: pathlib.Path) -> str:
    return _COMENTARIO.sub(" ", f.read_text(encoding="utf-8", errors="replace"))


def _modulos_que_pueden_gastar() -> list[tuple[str, str]]:
    """(ruta, proveedor) de cada modulo que nombra un proveedor PAID y muta."""
    de_pago = _proveedores_de_pago()
    patrones = {p: re.compile(_COMO_APARECEN[p]) for p in de_pago if p in _COMO_APARECEN}
    fuera: list[tuple[str, str]] = []
    for f in sorted(BACKEND.rglob("*.ts")):
        ruta = f.relative_to(RAIZ).as_posix()
        if "__tests__" in ruta or "/coste/" in ruta:
            continue
        codigo = _codigo(f)
        if not _MUTA.search(codigo):
            continue
        for prov, pat in patrones.items():
            if pat.search(codigo):
                fuera.append((ruta, prov))
                break
    return fuera


def test_la_politica_declara_proveedores_de_pago():
    """Sin denominador, todo lo de abajo pasaria sin mirar nada."""
    de_pago = _proveedores_de_pago()
    assert len(de_pago) >= 6, f"solo {len(de_pago)} proveedores PAID; la politica cambio de forma"
    for imprescindible in ("google_ads", "twilio", "whatsapp"):
        assert imprescindible in de_pago, f"{imprescindible} dejo de estar clasificado como PAID"


def test_el_barrido_encuentra_modulos_que_pueden_gastar():
    """CONTROL POSITIVO. Cero modulos seria un verde vacio."""
    m = _modulos_que_pueden_gastar()
    assert len(m) >= 3, f"solo {len(m)} modulos con salida de pago; el barrido no mira nada"


def test_ningun_modulo_gasta_sin_preguntar_a_la_politica():
    """LA REGLA.

    Un modulo que puede mover dinero del cliente y no consulta la politica no
    falla en ninguna prueba: funciona perfectamente. Por eso hace falta mirarlo
    aqui y no esperar a que lo cuente una factura.
    """
    culpables = [
        f"{ruta}  ({prov})"
        for ruta, prov in _modulos_que_pueden_gastar()
        if ruta not in SIN_GASTO_A_PROPOSITO
        and not _CONSULTA_POLITICA.search(_codigo(RAIZ / ruta))
    ]
    assert not culpables, (
        "estos modulos pueden gastar dinero y no preguntan a la politica de coste. "
        "Hoy solo los frena que falten credenciales, y eso es una guarda por "
        "AUSENCIA: desaparece el dia que se configuren:\n  " + "\n  ".join(culpables)
    )


def test_las_excepciones_declaradas_siguen_existiendo_y_siguen_sin_gastar():
    """Una lista de excepciones con entradas muertas deja de leerse."""
    fantasmas = sorted(r for r in SIN_GASTO_A_PROPOSITO if not (RAIZ / r).exists())
    assert not fantasmas, f"estas excepciones ya no corresponden a ningun fichero: {fantasmas}"

    for ruta, motivo in SIN_GASTO_A_PROPOSITO.items():
        assert len(motivo) > 30, f"{ruta} no explica por que no gasta"


def test_el_detector_distingue_leer_de_gastar():
    """CONTROL. Es la distincion que evita convertir el guardian en ruido.

    Si un GET contara como gasto, habria que ponerle una puerta a cada lectura
    de Analytics — y una puerta que salta siempre es una puerta que se ignora.
    """
    lee = 'const r = await fetch(url, { method: "GET" });'
    gasta = 'const r = await fetch(url, { method: "POST", body });'
    assert not _MUTA.search(lee), "el detector cuenta una lectura como gasto"
    assert _MUTA.search(gasta), "el detector no ve una escritura"


def test_el_detector_reconoce_la_consulta_a_la_politica():
    """CONTROL NEGATIVO. Un patron roto marcaria a todos como culpables."""
    con = "const v = decidirCoste({ proveedor: 'twilio', operacion: 'enviar_sms' });"
    sin = "const r = await twilioSend(sid, token, from, to, body);"
    assert _CONSULTA_POLITICA.search(con), "no reconoce una consulta real a la politica"
    assert not _CONSULTA_POLITICA.search(sin), "cree ver la politica donde no esta"
