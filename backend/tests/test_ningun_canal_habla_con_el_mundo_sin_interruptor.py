"""Nada que hable con una plataforma externa lo hace sin un interruptor.

LA CLASE DE FALLO, Y COMO SE ENCONTRO
--------------------------------------
Se listaron los canales que salen al mundo y se miro cual tenia puerta:

    correo      `envioDeCorreoPermitido`      SI
    SMS         permitido / ENABLED           SI
    WhatsApp    permitido                     SI
    Google Ads  permitido + simulacion        SI
    Meta Ads    `exigirPuertaDeGasto`         SI
    redes       -                             NO

`SaasSocialService.publishPost` llamaba a `graph.facebook.com` y a LinkedIn con
el token real del cliente sin cruzar nada. Y no hacia falta que alguien pulsara
un boton: `processDueScheduled` lo invoca desde el cron, asi que un post
programado salia solo.

Cinco de seis lo tenian. Eso es lo que hace peligroso al sexto: nadie lo echa de
menos porque «esto ya esta resuelto».

QUE VIGILA ESTA PRUEBA
----------------------
El DENOMINADOR, no la lista de hoy. Cualquier modulo de produccion que haga una
peticion saliente a una plataforma externa tiene que mencionar una puerta. El
septimo canal rompe esta prueba el dia que se escribe.

POR QUE BUSCA EL NOMBRE DE UNA PUERTA Y NO SU EJECUCION
--------------------------------------------------------
Una prueba estatica no puede ejecutar la rama. Lo que si puede afirmar con
certeza es la AUSENCIA: un modulo que no nombra ninguna puerta seguro que no la
cruza. Por eso esto detecta el hueco —que es lo que importa— y deja la
comprobacion de que la puerta FUNCIONA a las pruebas de cada canal, que si la
ejecutan (ver `nadiePublicaEnNombreDelClienteSinPermiso`).

COSTE EXTERNO: 0 EUR. Se lee el arbol.
"""
from __future__ import annotations

import io
import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parents[2]
BACKEND = RAIZ / "backend"

# El `(?<!:)` importa: sin el, el `//` de `https://` se toma por comentario y
# se borra justo la URL que buscamos. La primera version encontraba CERO.
_COMENTARIO = re.compile(r"(?<!:)//[^\n]*|/\*.*?\*/", re.S)

#: Anfitriones de plataformas donde una peticion tiene efecto REAL sobre la
#: cuenta de un cliente o cuesta dinero.
_PLATAFORMA = re.compile(
    r"https://(?:[\w.-]*\.)?("
    r"graph\.facebook\.com|api\.linkedin\.com|api\.twitter\.com|api\.x\.com|"
    r"open-api\.tiktok\.com|business-api\.tiktok\.com|googleads\.googleapis\.com|"
    r"api\.twilio\.com|api\.sendgrid\.com|api\.resend\.com|api\.stripe\.com|"
    r"graph\.instagram\.com|www\.googleapis\.com/youtube"
    r")",
    re.I,
)

#: Cualquier nombre que signifique «aqui hay una puerta».
_PUERTA = re.compile(
    r"\b(exigirPuertaDeGasto|exigirPublicacionSocialPermitida|publicacionSocialPermitida|"
    r"envioDeCorreoPermitido|exigirEnvioDeConversionesPermitido|modoCosteCeroActivo|assertActionAllowedInMode|"
    r"_ENABLED|dryRun|DRY_RUN|simulacion|permitido)\b"
)

#: Modulos que tocan un anfitrion externo y NO necesitan puerta, con su motivo.
#: Lo que no este aqui y no nombre una puerta, falla.
SIN_PUERTA_A_PROPOSITO: dict[str, str] = {
    # --- LEEN, no mutan. Una consulta de informe no tiene efecto sobre nadie.
    "backend/health/healthChecks.ts":
        "sondas de salud; ni escriben ni gastan",
    "backend/integrations/LinkedInAdsService.ts":
        "lectura de metricas; quien lanza campanas es el executor, que si tiene puerta",
    "backend/integrations/TikTokAdsService.ts":
        "lectura de metricas; sin camino de creacion",
    "backend/integrations/google/GoogleDataFetcher.ts":
        "informes de Google Ads: la API consulta por POST, pero no muta",
    "backend/integrations/meta/MetaDataFetcher.ts":
        "informes de Meta; solo lectura",
    "backend/saas/SaasWhiteLabelService.ts":
        "lee el estado de la cuenta Connect; el alta la hace Stripe en su portal",

    # --- CONECTAN una cuenta: el efecto es del propio usuario sobre su cuenta.
    "backend/oauth/LinkedInOAuthProvider.ts":
        "intercambio de codigo por token: lo inicia el usuario para SU cuenta",
    "backend/oauth/MetaOAuthProvider.ts":
        "intercambio de codigo por token: lo inicia el usuario para SU cuenta",
    "backend/oauth/TikTokOAuthProvider.ts":
        "intercambio de codigo por token: lo inicia el usuario para SU cuenta",
    "backend/saas/saasAdsTokenRefresh.ts":
        "renueva un token ya concedido; no crea ni publica nada",

    # --- CLIENTE HTTP sin decision propia.
    "backend/stripe/stripeApi.ts":
        "cliente HTTP de Stripe; quien decide gastar es quien lo llama, y esos si tienen puerta",

    # La deuda que habia aqui —`MetaAdsService` enviando conversiones sin puerta—
    # quedo cerrada con `exigirEnvioDeConversionesPermitido`. La lista solo
    # encoge: si alguien la reintroduce, el trinquete de abajo lo dice.
}


def _modulos_de_produccion() -> list[pathlib.Path]:
    fuera = []
    for p in BACKEND.rglob("*.ts"):
        partes = set(p.parts)
        if "node_modules" in partes or "__tests__" in partes:
            continue
        if p.name.endswith(".test.ts") or "/scripts/" in p.as_posix():
            continue
        fuera.append(p)
    return fuera


def _hablan_con_plataformas() -> dict[str, bool]:
    """rel -> si nombra alguna puerta."""
    fuera: dict[str, bool] = {}
    for p in _modulos_de_produccion():
        texto = _COMENTARIO.sub(" ", io.open(p, encoding="utf-8", errors="replace").read())
        if not _PLATAFORMA.search(texto):
            continue
        rel = p.relative_to(RAIZ).as_posix()
        fuera[rel] = bool(_PUERTA.search(texto))
    return fuera


def test_el_barrido_encuentra_canales_y_reconoce_una_puerta():
    """CONTROL POSITIVO. Cero canales seria un verde vacio."""
    canales = _hablan_con_plataformas()
    assert len(canales) >= 3, f"solo se ven {len(canales)} canales externos; el barrido dejo de mirar"
    assert any(canales.values()), "no se reconoce ni una puerta; el detector esta roto"


def test_ningun_canal_nuevo_sale_al_mundo_sin_puerta():
    """LA REGLA.

    Publicar en la cuenta de un cliente es irreversible de hecho: se puede
    borrar, pero ya lo han visto.
    """
    canales = _hablan_con_plataformas()
    descubiertos = sorted(
        rel for rel, tiene in canales.items()
        if not tiene and rel not in SIN_PUERTA_A_PROPOSITO
    )
    assert not descubiertos, (
        "estos modulos llaman a una plataforma externa sin nombrar ninguna "
        "puerta que lo impida:\n  " + "\n  ".join(descubiertos)
    )


def test_las_excepciones_siguen_existiendo_y_siguen_sin_puerta():
    """EL TRINQUETE. Una excepcion que ya no aplica se saca de la lista."""
    canales = _hablan_con_plataformas()
    fantasmas = sorted(k for k in SIN_PUERTA_A_PROPOSITO if k not in canales)
    assert not fantasmas, f"estas excepciones ya no tocan ninguna plataforma: {fantasmas}"
    con_puerta = sorted(k for k in SIN_PUERTA_A_PROPOSITO if canales.get(k))
    assert not con_puerta, (
        "estas ya tienen puerta; sacalas de la lista para que el guardian las "
        f"vigile: {con_puerta}"
    )


def test_la_puerta_de_redes_existe_y_esta_cerrada_por_defecto():
    """Si desapareciera, la regla de arriba se quedaria sin alternativa que
    ofrecer y el canal volveria a salir solo."""
    p = RAIZ / "backend" / "saas" / "publicacionSocialPermitida.ts"
    assert p.exists(), "desaparecio el interruptor de publicacion social"
    texto = p.read_text(encoding="utf-8")
    assert 'NODE_ENV === "production"' in texto, "dejo de cerrarse fuera de produccion"
    assert "throw" in texto, (
        "dejo de lanzar: devolver en silencio haria creer al cliente que se ha "
        "publicado"
    )
