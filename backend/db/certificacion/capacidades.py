"""El inventario CERRADO de capacidades del Bloque 2, derivado de lo que existe.

Por que se deriva y no se escribe a mano
----------------------------------------
Una lista escrita a mano queda desactualizada al siguiente lote, y el sintoma es
un porcentaje de cierre que sube porque el denominador se olvido de algo. Aqui
cada capacidad se define por los patrones de ruta que la identifican, y hay una
prueba que exige que **ninguna ruta quede sin capacidad**: si aparece una familia
nueva, el inventario falla hasta que alguien decida a que capacidad pertenece.

El denominador no puede crecer por duplicar el mismo defecto en categorias
nuevas: un hallazgo se asigna a una capacidad EXISTENTE salvo que se demuestre
que faltaba una.

Uso:
    python capacidades.py            # el reparto y lo que quede sin clasificar
"""
import collections
import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parents[3]
WEB = RAIZ / "apps" / "web" / "src"

#: Capacidad -> patron que la identifica. El ORDEN manda: gana la primera que
#: casa, asi que lo especifico va antes que lo general.
CAPACIDADES = [
    ("auth_onboarding_workspaces", r"/auth/|/onboarding|/workspace|/invit|/sso|/members|/rbac|/roles|/setup\b|/team\b|/subcuentas|/profile\b|/settings\b"),
    ("cuenta_y_suscripcion",       r"/user/(?:cancel|change-plan|delete-account|export-data|reactivate|history|api-keys|cancellation)|/saas/api-keys|/usage\b|/saas/usage"),
    ("dashboard",                  r"/dashboard|/overview|/resumen|/saas/results|/activation|/starter-pack"),
    ("crm",                        r"/crm|/leads?|/contacts?|/deals?|/pipeline|/clients?|/cdp|/custom-objects|/saas/objects|/attribution|/loyalty"),
    ("prospeccion_cold_email",     r"/prospecting|/cold-email"),
    ("campanias",                  r"/campanias|/campaigns|/sequences|/secuencias|/nurtur|/countdown|/utm|/klaviyo"),
    ("email",                      r"/email|/mail|/smtp|/ses\b|/warmup|/snippets"),
    ("redes_sociales",             r"/social|/instagram|/tiktok|/linkedin|/snapchat|/meta|/facebook|/twitter|/publish|/communities|/comunidades"),
    ("contenido",                  r"/content|/contenido|/blog|/copywriting|/creative|/media|/ai-copy|/briefing|/brief-to-launch|/knowledge-base"),
    ("seo_visibilidad",            r"/seo|/keywords|/backlink|/sitemap|/serp|/geo-visibility|/competitor-gap|/benchmark"),
    ("reputacion_sentimiento",     r"/reputation|/reputacion|/reviews?|/resenas|/sentiment"),
    ("inbox_helpdesk",             r"/inbox|/helpdesk|/tickets?|/soporte|/support|/conversation|/notifications"),
    ("chatbot",                    r"/chatbot|/chat\b|/widget|/livechat|/helpbot"),
    ("reservas",                   r"/booking|/reservas|/calendar|/appointments|/agenda|/citas"),
    ("workflows",                  r"/workflows?|/automation|/automatiz|/triggers?|/recipes|/playbooks|/data-playbooks"),
    ("ab_testing",                 r"/ab-?test|/experiments?|/variants?"),
    ("facturacion_billing",        r"/billing|/invoic|/factur|/stripe|/payment|/pricing|/plans?|/subscription|/checkout|/dunning|/cpq|/paddle|/quotes|/rebilling"),
    ("packs_entregables",          r"/packs?|/deliverab|/entregab|/kickoff|/certificados"),
    ("portal_cliente",             r"/portal|/client-portal"),
    ("partners_afiliados",         r"/partners?|/affiliate|/afiliad|/referral|/early-adopter"),
    ("contratos",                  r"/contracts?|/contrat|/esign|/firma|/proposal"),
    ("storage_uploads",            r"/storage|/upload|/files?|/documents?|/assets|/qr\b"),
    ("analytics_reporting",        r"/analytics|/reporting|/reports?|/metrics|/stats|/kpi|/insights|/nps|/feedback|/heatmap|/uptime|/roadmap|/changelog"),
    ("encuestas",                  r"/surveys?|/encuestas|/s/\["),
    ("integraciones",              r"/integrations?|/connectors?|/webhooks?|/oauth|/twilio|/whatsapp|/slack|/zapier|/messaging|/sms|/approval-channels"),
    ("ads",                        r"/ads?/|/saas/ads|/adwords|/roas|/audiences?"),
    ("ecommerce_tienda",           r"/ecommerce|/store|/shop|/products?|/orders?|/cart"),
    ("erp",                        r"/erp/"),
    ("lms_formacion",              r"/lms|/courses?|/lessons?|/enrollments?|/certificate"),
    ("formularios_captacion",      r"/forms?/|/formularios|/funnels?|/landing|/waitlist|/contact\b|/site/|/sites?/"),
    ("web_builder",                r"/web-builder|/templates?"),
    ("marca_blanca",               r"/whitelabel|/white-label"),
    ("pwa",                        r"/pwa/"),
    ("dialer_voz_llamadas",        r"/dialer|/call|/voice|/voz|/agent-language"),
    ("admin_plataforma",           r"/admin/|/platform/|/tenants?/|/mcp|/marketplace|/platform-health|/_deprecated"),
    ("os",                         r"/os/|/agents?/|/agentes|/autopilot|/orchestrat|/ai-agents"),
    ("ia_privada_memoria",         r"/private-ai|/ai/|/ia/|/memory|/shared-memory|/rag|/transcri|/embedding|/brain"),
    ("gdpr_cumplimiento",          r"/gdpr|/compliance|/consent|/privacy|/audit|/security"),
    ("salud_infra",                r"/health|/status|/cron|/public/|/t/|/p/|/v1/|/v2/"),
]


def rutas_de_api():
    """Las rutas que existen, en las dos convenciones de Next."""
    salida = []
    for base, es_app in ((WEB / "app" / "api", True), (WEB / "pages" / "api", False)):
        if not base.exists():
            continue
        for f in base.rglob("*.ts*"):
            if es_app and f.stem != "route":
                continue
            rel = (f.parent.relative_to(base) if es_app
                   else f.relative_to(base).with_suffix(""))
            salida.append("/api/" + rel.as_posix().replace("/index", ""))
    return sorted(set(salida))


def capacidad_de(ruta: str):
    """La capacidad a la que pertenece una ruta, o `None`."""
    for nombre, patron in CAPACIDADES:
        if re.search(patron, ruta, re.I):
            return nombre
    return None


def reparto():
    """(cuenta por capacidad, rutas sin capacidad)."""
    cuenta, huerfanas = collections.Counter(), []
    for r in rutas_de_api():
        c = capacidad_de(r)
        if c is None:
            huerfanas.append(r)
        else:
            cuenta[c] += 1
    return cuenta, huerfanas


if __name__ == "__main__":
    cuenta, huerfanas = reparto()
    total = sum(cuenta.values()) + len(huerfanas)
    print(f"rutas: {total}   con capacidad: {sum(cuenta.values())}   sin: {len(huerfanas)}")
    print(f"capacidades declaradas: {len(CAPACIDADES)}   con al menos una ruta: {len(cuenta)}")
    if huerfanas:
        print("\nSIN CAPACIDAD:")
        for r in huerfanas:
            print("   ", r)
    print()
    for n, c in cuenta.most_common():
        print(f"   {c:4}  {n}")
