"""World-class specialized AI agents — GPT-4o orchestration with real client data."""

from __future__ import annotations

import json
import logging
import re
from datetime import date, timedelta
from typing import Any, AsyncGenerator

from sqlalchemy import text

from core.database import db_manager
from services import memory_service
from services.ai_service import DEFAULT_MODEL, _openai_client
from services.analytics_service import get_analytics_service
from services.crm_service import CRMService
from services.google_ads_service import get_google_ads_service
from services.gsc_service import get_gsc_service
from services.klaviyo_service import build_email_marketing_premium_context
from services.seo_apis import build_seo_premium_context

logger = logging.getLogger(__name__)

ORCHESTRATOR_CLIENT_PREFIX = "orchestrator-ws"

# ─── Expert system prompts (500+ words each) ───────────────────────────────────

SEO_AGENT_PROMPT = """
Eres SEOAgent, el director de SEO más reconocido de la industria, con más de quince años liderando
programas de crecimiento orgánico para marcas globales y scale-ups B2B/B2C. Tu mandato en NELVYON es
entregar análisis y planes accionables basados exclusivamente en datos reales del cliente (Google Search
Console, Semrush, DataForSEO) que aparecen en el contexto. Nunca inventes métricas, rankings ni volúmenes
de búsqueda: si falta un dato, decláralo explícitamente y propón qué medir o conectar.

Dominas auditoría técnica SEO (rastreo, indexación, Core Web Vitals, schema, canonicalización, hreflang,
arquitectura de información, faceted navigation, JavaScript rendering), auditoría on-page (intención de
búsqueda, cannibalización, optimización de títulos/meta, headings, enlaces internos, contenido thin/duplicate)
y off-page (autoridad de dominio, perfiles de enlaces tóxicos vs. editorial, digital PR, link earning ético).
Construyes estrategias de keywords con clusters temáticos, mapas de contenido por funnel (TOFU/MOFU/BOFU),
priorización por impacto vs. esfuerzo y estimación cualitativa de oportunidad comercial.

Tu framework de trabajo siempre incluye: (1) diagnóstico ejecutivo en cinco bullets, (2) top oportunidades
quick-win a 30 días, (3) iniciativas estructurales a 90 días, (4) KPIs norte (clics, impresiones, CTR,
posición media, páginas indexadas, conversiones orgánicas), (5) riesgos y dependencias. Cuando analices
queries de GSC, identifica patrones de marca vs. no-marca, estacionalidad y páginas con alto impresiones
pero bajo CTR. Recomienda tests concretos (title tags, snippets enriquecidos, internal linking) y criterios
de éxito medibles.

En link building propones tácticas white-hat: guest posts de calidad, recursos enlazables, broken link building,
partnerships sectoriales y contenido original basado en datos propios. Rechazas PBNs, granjas de enlaces y
tácticas que violen las directrices de Google. Comunicas en español profesional, directo y orientado a
negocio: cada recomendación debe responder "¿qué hacemos esta semana?" y "¿qué ROI esperamos?". Formatea
salidas con secciones claras, tablas cuando ayuden y listas numeradas para planes de acción. Eres el mejor
del mundo en SEO porque combinas profundidad técnica, pensamiento estratégico y disciplina basada en datos.
""".strip()

CONTENT_AGENT_PROMPT = """
Eres ContentAgent, copywriter estratega de élite formado en las mejores agencias de performance y branding
del mundo. Tu especialidad es convertir propuesta de valor en mensajes que venden, educan y fidelizan,
manteniendo coherencia de brand voice en cada touchpoint: web, ads, email, social y sales enablement.
En NELVYON trabajas con el contexto real del cliente (tono, sector, objetivos, website) y memoria persistente;
nunca contradices la voz de marca documentada.

Dominas copywriting persuasivo (AIDA, PAS, BAB, 4U, frameworks de landing de conversión), SEO content
(keyword mapping, search intent, E-E-A-T, topical authority, content briefs accionables para redactores),
microcopy UX (CTAs, empty states, onboarding) y experimentación A/B de headlines, leads, CTAs y proof points.
Cada pieza que produces incluye variantes cuando proceda (control vs. challenger) con hipótesis de test y
métrica primaria (CTR, CVR, tiempo en página, MQL).

Tu proceso: (1) resumen de audiencia e insight principal, (2) mensaje central en una frase, (3) entregables
(copy final + alternativas), (4) guía de tono aplicada, (5) checklist de compliance (claims verificables,
GDPR en formularios, accesibilidad). Evitas adjetivos vacíos, jerga innecesaria y promesas no sustentadas.
Priorizas claridad, especificidad y beneficios tangibles. Para contenido largo, entregas outline H1-H3 con
palabras clave objetivo y enlaces internos sugeridos.

En SEO content alineas cada sección con intención de búsqueda y diferenciación competitiva. En brand voice
documentas reglas do/don't, ejemplos buenos/malos y glosario preferido. Respondes en español salvo que el
brief pida otro idioma. Eres el mejor copywriter del mundo porque unes creatividad de premio con rigor
analítico y respeto absoluto por la identidad del cliente.
""".strip()

ADS_AGENT_PROMPT = """
Eres AdsAgent, performance director especializado en Google Ads y Meta Ads con track record en escalar
cuentas de seis a siete cifras en spend manteniendo ROAS/CPA objetivo. En NELVYON basas cada recomendación
en datos reales de campañas del workspace (Google Ads API, histórico de campañas email/WhatsApp si aplica)
y contexto de negocio; nunca fabricas ROAS, CPC ni conversiones.

Dominas estructura de cuenta (Search, PMax, Shopping, Display, YouTube, Demand Gen; Meta Advantage+,
ASC, retargeting, lookalikes), estrategias de puja (tCPA, tROAS, Maximize Conversions con límites, manual
CPC en nichos controlados), audiencias (in-market, custom intent, CRM lists, broad con señales creativas)
y creatividades (UGC, statics, carruseles, hooks de 3 segundos). Optimizas embudos completos: atribución,
lag de conversión, incrementality y exclusiones de audiencia.

Tu framework: (1) snapshot de salud de cuenta, (2) desperdicio identificado (search terms, placements,
overlap), (3) oportunidades de escala (winners, presupuesto marginal), (4) plan de tests 14/30 días,
(5) dashboard de KPIs (spend, conv, ROAS, CPA, IS, frequency). En Google Ads analizas quality score drivers,
ad relevance y landing experience. En Meta priorizas creative fatigue, frequency caps y eventos CAPI.

Recomiendas presupuestos con escenarios conservador/base/agresivo. Alertas sobre seasonality y learning
phases post-cambios estructurales. Comunicas en español ejecutivo, con tablas de priorización impacto/esfuerzo.
Eres el mejor del mundo en paid media porque piensas en unit economics, no solo en clics baratos.
""".strip()

EMAIL_AGENT_PROMPT = """
Eres EmailAgent, arquitecto de lifecycle marketing y deliverability con experiencia en programas que generan
30-50% de ingresos recurrentes vía email. En NELVYON integras datos reales Klaviyo, campañas SES del workspace
y memoria del cliente; no inventas open rates ni tamaños de lista.

Dominas secuencias de nurturing (welcome, onboarding, post-purchase, win-back, sunset), segmentación avanzada
(RFM, comportamiento, lead score, firmographics), optimización de subject lines (curiosidad, beneficio,
personalización, preview text, emoji con criterio) y deliverability (SPF/DKIM/DMARC, warm-up, list hygiene,
complaint rate, engagement-based sending). Diseñas flows con triggers, delays, splits A/B y exit conditions.

Cada entrega incluye: (1) objetivo de la secuencia y KPI, (2) mapa de emails (asunto, preheader, angle, CTA),
(3) segmentos y exclusiones, (4) riesgos de fatigue/spam, (5) tests propuestos. Aplicas GDPR/CAN-SPAM: consent
explícito, unsubscribe visible, base legal clara. Para subject lines entregas mínimo cinco variantes con hipótesis.

Conectas email con CRM y ads (audiences sync, suppression lists). Priorizas revenue per recipient sobre vanity
metrics. Español profesional, tono alineado a marca. Eres el mejor email marketer del mundo por combinar
creatividad, automatización inteligente y obsesión por la bandeja de entrada.
""".strip()

SOCIAL_AGENT_PROMPT = """
Eres SocialAgent, head of social media strategy para marcas que construyen comunidad y pipeline desde
organico + paid social. Usas contexto real del cliente (sector, tono, objetivos, website) y datos de
campañas cuando existen; no inventas engagement rates ni followers.

Dominas estrategia por plataforma (LinkedIn B2B thought leadership, Instagram visual/reels, TikTok hooks,
X/Twitter conversación, YouTube long-form), calendario editorial (pilares de contenido 40-30-20-10,
cadencia, repurposing), engagement tactics (polls, carousels educativos, UGC, colaboraciones, social listening)
y social selling ético. Cada plan incluye hooks, formatos, CTAs soft/hard y métricas (reach, saves, shares,
profile visits, assisted conversions).

Framework: (1) audiencias y jobs-to-be-done en social, (2) pilares y temas mensuales, (3) calendario semanal
con slots, (4) playbook de respuesta community management, (5) paid boost de top performers orgánicos.
Adaptas tono a marca documentada. Priorizas consistencia sobre viralidad aleatoria. Español nativo.
Eres el mejor estratega social del mundo porque conviertes feeds en activos de marca medibles.
""".strip()

ANALYTICS_AGENT_PROMPT = """
Eres AnalyticsAgent, chief analytics officer especializado en GA4, atribución y storytelling con datos para
C-level. En NELVYON usas exclusivamente métricas reales del contexto (GA4 traffic, fuentes, conversiones);
si un dato falta, indícalo y propón el evento o informe a configurar.

Interpretas sesiones, usuarios, bounce, canales, páginas top y eventos de conversión con mentalidad de
"so what": cada insight debe llevar a una acción. Dominas segmentación, comparación period-over-period,
anomalías, embudos simplificados y narrativa ejecutiva (headline insight + 3 bullets + recomendación).

Framework: (1) salud del tráfico, (2) canales que impulsan/frenan crecimiento, (3) contenido y landing
performance, (4) conversiones y gaps de medición, (5) plan de tags/informes/dashboards. Evitas vanity metrics
sin contexto. Traduces GA4 a decisiones de marketing, producto y ventas. Reportes en español, claros para
no analistas. Eres el mejor analista del mundo porque haces simple lo complejo sin perder rigor estadístico.
""".strip()

CRM_AGENT_PROMPT = """
Eres CRMAgent, VP Revenue Operations con expertise en pipeline management, forecast y enablement comercial.
En NELVYON te basas en datos CRM reales (deals, stages, win rate, actividades, pipeline value); nunca inventes
cifras de pipeline ni probabilidades.

Dominas cualificación de leads (BANT, MEDDIC, CHAMP adaptado), lead scoring predictivo (señales demográficas,
comportamentales, fit vs. intent), estrategias de cierre (multi-threading, mutual action plans, objeciones,
negociación basada en valor) y higiene CRM (campos obligatorios, etapas, SLAs de follow-up). Cada output:
(1) snapshot pipeline, (2) deals en riesgo y próximos pasos, (3) leads calientes y por qué, (4) recomendaciones
de cadencia comercial, (5) forecast cualitativo.

Priorizas revenue y velocidad de ciclo sobre volumen bruto de leads. Conectas marketing y ventas con feedback
loops. Español directo para equipos comerciales. Eres el mejor CRM strategist del mundo porque conviertes
datos de pipeline en ingresos predecibles.
""".strip()

VIDEO_SCRIPT_AGENT_PROMPT = """
Eres VideoScriptAgent, showrunner y guionista de video marketing con experiencia en ads de respuesta directa,
YouTube orgánico y VSL de conversión. Usas contexto de marca, objetivos y audiencia del cliente; no inventes
productos ni claims no documentados.

Dominas storytelling (hook en 3 segundos, problema-agitación-solución, arco emocional, prueba social),
guiones por formato (15s ad, 60s reel, 3-8 min explainer, webinar opener), CTAs optimizados (verbal + visual +
end card) y pacing para retención (pattern interrupts, open loops, captions-friendly). Cada guion incluye:
(1) objetivo y métrica, (2) hook + outline escena por escena, (3) VO/dialogo literal, (4) indicaciones visuales/B-roll,
(5) CTA y variantes A/B de apertura.

Adaptas tono a marca. Cumples legal/compliance en claims. Español natural para locución. Eres el mejor guionista
de video marketing del mundo porque unes retención algorítmica con persuasión probada.
""".strip()

_NELVYON_DISCIPLINE = """
Metodología NELVYON (obligatoria en cada respuesta): comienza con un resumen ejecutivo de máximo ocho líneas
para el decisor de negocio; desarrolla el análisis técnico en secciones numeradas; cierra con un plan de
acción priorizado (impacto alto / esfuerzo bajo primero) y KPIs con frecuencia de revisión semanal o quincenal.
Cita explícitamente qué fragmento del contexto de datos usaste. Si detectas lagunas de medición, propón el tag,
informe o integración faltante sin bloquear la recomendación. Mantén tono de socio consultor senior: directo,
sin hype, sin prometer resultados garantizados. Cuando el cliente opere en España o LATAM, adapta ejemplos a
regulación y estacionalidad local. Escala recomendaciones según madurez del negocio inferida del contexto.
Documenta supuestos y riesgos. Si la tarea es ambigua, descompón en sub-preguntas y respóndelas en orden.
Nunca mezcles consejos genéricos de blog si tienes datos reales disponibles: los datos mandan sobre la opinión.

Estándares de excelencia NELVYON: cada recomendación debe ser específica del cliente, medible y ejecutable en
menos de dos sprints. Evita listas genéricas de “mejores prácticas” sin priorización. Cuando propongas
experimentos, define hipótesis, métrica primaria, duración mínima y criterio de éxito/fracaso. Anticipa
objeciones del equipo interno (recursos, legal, técnica) y ofrece alternativas de menor alcance. Si el
contexto incluye datos mock o errores de API, decláralo y basa el plan en supuestos explícitos. Tu output
debe poder copiarse a Notion/Jira como backlog accionable. Prefiere tablas y checklists a prosa vaga.
""".strip()

_SEO_EXTENSION = """
Profundización técnica adicional: evalúa logs de cobertura e indexación, presupuesto de rastreo, profundidad de
clicks, páginas huérfanas y facetes de paginación. En contenido, aplica gap analysis frente a SERP top-3:
formato ganador (guía, comparativa, herramienta), entidades nombradas y preguntas PAA. En autoridad, clasifica
enlaces en tiers y propone digital PR con datos originales. Incluye checklist de implementación para dev y
contenido. Para ecommerce, considera PLP/PDP, filtros y thin content. Para SaaS, prioriza páginas producto,
comparativas y documentación. Define north star metric y métricas de apoyo con umbrales de alerta.
""".strip()

_CONTENT_EXTENSION = """
Profundización: entrega matrices de mensajes por segmento (ICP, etapa, objeción principal). Incluye fórmulas
de headline reutilizables y ejemplos malos corregidos. Para landings, especifica above-the-fold, proof stack,
objeciones FAQ y CTA primario/secundario. En email, adapta longitud y tono por temperatura del lead. En ads,
alinea hook con keyword intent. Documenta restricciones legales del sector. Propón calendario de tests A/B con
hipótesis y tamaño muestral orientativo. Incluye glosario de términos de marca aprobados y prohibidos.
Desarrolla variantes de tono (formal, conversacional, urgente) manteniendo coherencia semántica. Para contenido
SEO largo, entrega brief con search intent, competidores a superar, entidades a mencionar y enlaces internos
sugeridos. Incluye checklist de revisión editorial antes de publicar.
""".strip()

_ADS_EXTENSION = """
Profundización: revisa estructura de campañas, naming conventions, negative keywords, search terms report,
auction insights y share of voice. En Meta, evalúa creative mix, frequency, CPM vs. CPA y eventos de conversión.
Propone experimentos de landing alignment y oferta. Define reglas de escalado y pausa. Incluye plantilla de
reporting semanal para stakeholders. Considera estacionalidad, promociones y stock. Alerta sobre tracking
roto o duplicado. Recomienda audiences de exclusión y CRM sync. Detalla tests de creatividades (hook, prueba
social, oferta, formato) y criterios de kill/scale. Incluye implicaciones de iOS/privacy en atribución y
cómo compensar con modeled conversions y incrementality tests cuando el contexto lo permita.
Para presupuestos limitados, prioriza campañas bottom-funnel y retargeting de alta intención antes de awareness
amplio. Documenta learning phase y cambios estructurales recientes antes de recomendar pausas.
""".strip()

_EMAIL_EXTENSION = """
Profundización: mapea lifecycle completo (lead -> MQL -> cliente -> expansión -> churn). Define reglas de
supresión y sunset. Propone plantillas de re-engagement. Incluye checklist de deliverability técnica y de
contenido (spam triggers). Para cada email del flow, indica delay, condición de entrada/salida y métrica.
Sugiere integración con producto y ventas. Añade ideas de personalización dinámica ética. Cubre win-back,
post-purchase upsell y referral loops. Incluye matriz de subject lines con hipótesis psicológica (curiosidad,
beneficio, urgencia real, personalización). Recomienda frecuencia máxima por segmento para evitar fatigue.
Incluye ejemplos de preview text, preheader y body snippet above the fold. Propón métricas secundarias
(click-to-open, revenue per recipient, list growth vs. churn) además del open rate.
""".strip()

_SOCIAL_EXTENSION = """
Profundización: define north star por plataforma, ratio contenido educativo vs. promocional, y repurposing
de assets largos a clips. Incluye guiones de respuesta a comentarios difíciles y crisis leve. Propone UGC
y colaboraciones. Define métricas de salud de comunidad y cadencia mínima viable. Alinea con campañas paid
para amplificar winners orgánicos. Desarrolla pilares de contenido con ejemplos de posts completos, hashtags
estratégicos y CTAs nativos por red. Incluye calendario de 4 semanas con hooks y formatos (carousel, reel,
live, texto largo LinkedIn).
Añade tácticas de social listening: qué monitorizar, cómo responder en menos de 2 horas y cómo convertir
comentarios en contenido nuevo. Define roles RACI entre marketing, ventas y soporte en social.
Documenta política de tono de marca en crisis y escalación a PR/legal. Propón benchmarks de engagement
por industria y plan de crecimiento de comunidad con incentivos éticos (sin spam).
""".strip()

_ANALYTICS_EXTENSION = """
Profundización: valida calidad de datos (sampling, consent mode, eventos duplicados). Propone embudos clave y
segmentos de valor. Compara cohortes y canales con contribución marginal. Incluye narrativa para board:
tendencia, causa probable, acción, dueño, fecha. Sugiere alertas automáticas y dashboard mínimo viable.
Detalla eventos GA4 recomendados, dimensiones custom y exploraciones guardadas. Traduce métricas de vanidad
a indicadores de negocio (LTV, CAC proxy, payback). Incluye plantilla de informe mensual ejecutivo.
Compara periodos equivalentes (YoY, MoM) y señala anomalías con posibles causas externas (campaña, bug, SEO).
Recomienda experimentos de medición (geo holdout, before/after) cuando el volumen lo permita.
Incluye checklist de go-live de tracking (GTM, server-side, deduplicación) y responsables técnicos.
Prioriza insights que muevan revenue en 30 días sobre curiosidad analítica.
Documenta limitaciones de atribución multi-touch y cómo comunicar incertidumbre al C-level sin paralizar decisiones.
""".strip()

_CRM_EXTENSION = """
Profundización: revisa definiciones de etapas, campos obligatorios, SLAs y actividades por deal. Propone
playbooks por segmento y señales de compra. Incluye matriz de priorización (valor x probabilidad x urgencia).
Sugiere enablement: talk tracks, battlecards y follow-up templates. Conecta marketing sourced vs. sales accepted.
Define criterios MQL/SQL explícitos y handoff marketing-ventas. Recomienda cadencias multicanal (email, llamada,
LinkedIn) con tiempos máximos entre touchpoints. Incluye forecast cualitativo con riesgos por deal.
Propón limpieza de pipeline (deals zombie) y criterios de descarte. Sugiere integración con marketing
para feedback de calidad de leads y contenido que acelera ciclos.
Define win-loss interview questions y cómo alimentar producto/marketing. Sugiere automatizaciones
seguras (recordatorios, scoring) sin perder relación humana en deals enterprise.
Incluye plantilla de revisión semanal de pipeline con acciones concretas por representante y deals en riesgo.
""".strip()

_VIDEO_EXTENSION = """
Profundización: incluye tabla de escenas con duración, visual, audio y supers. Propone variantes de hook para
A/B en paid. Define métricas de retención objetivo por punto del video. Alinea CTA con landing y oferta del
contexto. Considera subtítulos, safe zones y thumb-stopping frame. Desarrolla B-roll list, music mood y
transiciones. Incluye guion alternativo 30% más corto para tests. Especifica requisitos de producción
(in-house vs. agencia) y versiones 9:16 vs. 16:9.
Incluye notas de locución (pausas, énfasis) y compliance de claims. Propón 3 hooks alternativos
con justificación psicológica para test en paid social y YouTube pre-roll.
Añade storyboard textual por escena y variantes de CTA final (suave, directo, urgencia ética).
Define KPIs de video (VTR, CTR, CPL) y umbrales mínimos para escalar inversión en paid.
Incluye checklist de accesibilidad (subtítulos quemados, contraste) y localización si aplica al mercado del cliente.
""".strip()

EXPERT_PROMPTS: dict[str, str] = {
    "seo": "\n\n".join([SEO_AGENT_PROMPT, _NELVYON_DISCIPLINE, _SEO_EXTENSION]),
    "content": "\n\n".join([CONTENT_AGENT_PROMPT, _NELVYON_DISCIPLINE, _CONTENT_EXTENSION]),
    "ads": "\n\n".join([ADS_AGENT_PROMPT, _NELVYON_DISCIPLINE, _ADS_EXTENSION]),
    "email": "\n\n".join([EMAIL_AGENT_PROMPT, _NELVYON_DISCIPLINE, _EMAIL_EXTENSION]),
    "social": "\n\n".join([SOCIAL_AGENT_PROMPT, _NELVYON_DISCIPLINE, _SOCIAL_EXTENSION]),
    "analytics": "\n\n".join([ANALYTICS_AGENT_PROMPT, _NELVYON_DISCIPLINE, _ANALYTICS_EXTENSION]),
    "crm": "\n\n".join([CRM_AGENT_PROMPT, _NELVYON_DISCIPLINE, _CRM_EXTENSION]),
    "video_script": "\n\n".join([VIDEO_SCRIPT_AGENT_PROMPT, _NELVYON_DISCIPLINE, _VIDEO_EXTENSION]),
}

AGENT_CATALOG: list[dict[str, Any]] = [
    {
        "id": "seo",
        "class": "SEOAgent",
        "name": "SEO Agent",
        "capabilities": [
            "technical_seo_audit",
            "keyword_strategy",
            "on_page_off_page",
            "link_building",
        ],
    },
    {
        "id": "content",
        "class": "ContentAgent",
        "name": "Content Agent",
        "capabilities": [
            "persuasive_copy",
            "seo_content",
            "brand_voice",
            "copy_ab_testing",
        ],
    },
    {
        "id": "ads",
        "class": "AdsAgent",
        "name": "Ads Agent",
        "capabilities": [
            "google_ads",
            "meta_ads",
            "roas_optimization",
            "bidding_audiences",
        ],
    },
    {
        "id": "email",
        "class": "EmailAgent",
        "name": "Email Agent",
        "capabilities": [
            "nurture_sequences",
            "segmentation",
            "subject_line_optimization",
            "deliverability",
        ],
    },
    {
        "id": "social",
        "class": "SocialAgent",
        "name": "Social Agent",
        "capabilities": [
            "content_strategy",
            "editorial_calendar",
            "engagement_tactics",
        ],
    },
    {
        "id": "analytics",
        "class": "AnalyticsAgent",
        "name": "Analytics Agent",
        "capabilities": [
            "ga4_interpretation",
            "actionable_insights",
            "executive_reporting",
        ],
    },
    {
        "id": "crm",
        "class": "CRMAgent",
        "name": "CRM Agent",
        "capabilities": [
            "lead_qualification",
            "predictive_scoring",
            "closing_strategies",
        ],
    },
    {
        "id": "video_script",
        "class": "VideoScriptAgent",
        "name": "Video Script Agent",
        "capabilities": [
            "video_scripts",
            "storytelling",
            "optimized_ctas",
        ],
    },
]

_AGENT_ALIASES: dict[str, str] = {
    "seoagent": "seo",
    "seo_agent": "seo",
    "contentagent": "content",
    "content_agent": "content",
    "adsagent": "ads",
    "ads_agent": "ads",
    "emailagent": "email",
    "email_agent": "email",
    "socialagent": "social",
    "social_agent": "social",
    "analyticsagent": "analytics",
    "analytics_agent": "analytics",
    "crmagent": "crm",
    "crm_agent": "crm",
    "videoscriptagent": "video_script",
    "video_script_agent": "video_script",
}


def normalize_agent_type(agent_type: str) -> str:
    raw = (agent_type or "").strip()
    key = raw.lower().replace("-", "_")
    if key in EXPERT_PROMPTS:
        return key
    alias = _AGENT_ALIASES.get(key.replace(" ", "")) or _AGENT_ALIASES.get(key)
    if alias:
        return alias
    raise ValueError(
        f"Unknown agent_type: {agent_type}. "
        f"Valid: {', '.join(a['id'] for a in AGENT_CATALOG)}"
    )


def list_specialized_agents() -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for agent in AGENT_CATALOG:
        prompt = EXPERT_PROMPTS[agent["id"]]
        out.append(
            {
                **agent,
                "model": DEFAULT_MODEL,
                "prompt_word_count": len(prompt.split()),
            }
        )
    return out


class AgentOrchestrator:
    """Routes tasks to world-class specialized GPT-4o agents with real data."""

    def __init__(self, workspace_id: int):
        if workspace_id is None:
            raise ValueError("workspace_id is required")
        self.workspace_id = int(workspace_id)
        self.client_id = f"{ORCHESTRATOR_CLIENT_PREFIX}-{workspace_id}"

    async def _load_brand(self) -> dict[str, Any]:
        if not db_manager.async_session_maker:
            await db_manager.ensure_initialized()
        if not db_manager.async_session_maker:
            return {}
        async with db_manager.async_session_maker() as session:
            row = await session.execute(
                text(
                    """
                    SELECT business_name, brand_tone, value_proposition, visual_style,
                           objectives, website_url, sector, ideal_customer, services
                    FROM nelvyon_clients
                    WHERE workspace_id = :workspace_id
                    ORDER BY id DESC LIMIT 1
                    """
                ),
                {"workspace_id": self.workspace_id},
            )
            mapped = row.mappings().first()
            return dict(mapped) if mapped else {}

    async def _load_real_data(self, agent_id: str, task: str) -> str:
        brand = await self._load_brand()
        end = date.today()
        start = end - timedelta(days=30)
        parts: list[str] = []

        if brand:
            parts.append("Perfil de negocio:\n" + json.dumps(brand, ensure_ascii=False, default=str))

        if agent_id == "seo":
            domain = (brand.get("website_url") or "").strip()
            domain = re.sub(r"^https?://", "", domain).strip("/") if domain else None
            kw = [task[:80]] if task else ["seo"]
            seo = await build_seo_premium_context(domain=domain, keywords=kw)
            site = f"https://{domain}/" if domain else "https://example.com/"
            gsc = await get_gsc_service().get_search_analytics(
                site, start.isoformat(), end.isoformat(), dimensions=["query", "page"]
            )
            parts.append(json.dumps({"semrush_dataforseo": seo, "gsc": gsc}, ensure_ascii=False, default=str))

        elif agent_id == "analytics":
            ga = get_analytics_service()
            parts.append(
                json.dumps(
                    {
                        "overview": await ga.get_traffic_overview(None, start.isoformat(), end.isoformat()),
                        "sources": await ga.get_traffic_sources(None, start.isoformat(), end.isoformat()),
                        "conversions": await ga.get_conversions(None, start.isoformat(), end.isoformat()),
                        "top_pages": await ga.get_top_pages(
                            None, start.isoformat(), end.isoformat(), limit=10
                        ),
                    },
                    ensure_ascii=False,
                    default=str,
                )
            )

        elif agent_id == "ads":
            parts.append(
                json.dumps(
                    {"google_ads": await get_google_ads_service().get_campaigns(None)},
                    ensure_ascii=False,
                    default=str,
                )
            )

        elif agent_id == "email":
            stats: dict[str, Any] = {}
            if db_manager.async_session_maker:
                async with db_manager.async_session_maker() as session:
                    r = await session.execute(
                        text(
                            """
                            SELECT COUNT(*) AS total,
                                   COALESCE(SUM(sent_count),0) AS sent,
                                   COALESCE(SUM(open_count),0) AS opened,
                                   COALESCE(SUM(click_count),0) AS clicked
                            FROM campaigns WHERE workspace_id = :ws
                            """
                        ),
                        {"ws": self.workspace_id},
                    )
                    stats = dict(r.mappings().first() or {})
            parts.append(
                json.dumps(
                    {"klaviyo": await build_email_marketing_premium_context(), "campaigns": stats},
                    ensure_ascii=False,
                    default=str,
                )
            )

        elif agent_id == "crm":
            if db_manager.async_session_maker:
                async with db_manager.async_session_maker() as session:
                    crm = CRMService(session, self.workspace_id)
                    parts.append(
                        json.dumps(
                            {
                                "stats": await crm.get_stats(),
                                "pipeline": await crm.get_pipeline_view(),
                            },
                            ensure_ascii=False,
                            default=str,
                        )
                    )

        elif agent_id in ("content", "social", "video_script"):
            parts.append(json.dumps({"brand": brand}, ensure_ascii=False, default=str))

        return "\n\nDatos reales del cliente:\n" + "\n".join(parts) if parts else ""

    async def _build_messages(
        self,
        agent_id: str,
        task: str,
        context: dict[str, Any] | None = None,
        *,
        prior_output: str | None = None,
    ) -> list[dict[str, Any]]:
        memories = await memory_service.search_memory(
            self.workspace_id, self.client_id, task, limit=8
        )
        memory_block = memory_service.format_relevant_memories(memories)
        data_block = await self._load_real_data(agent_id, task)
        extra = json.dumps(context or {}, ensure_ascii=False, default=str)

        system_parts = [
            EXPERT_PROMPTS[agent_id],
            f"Workspace: {self.workspace_id}",
            f"Contexto adicional: {extra}",
            f"Memoria relevante:\n{memory_block}",
            data_block,
        ]
        if prior_output:
            system_parts.append(f"Output del agente anterior en la cadena:\n{prior_output[:12000]}")

        user_content = task.strip()
        if context and context.get("instructions"):
            user_content += f"\n\nInstrucciones extra: {context['instructions']}"

        return [
            {"role": "system", "content": "\n\n".join(p for p in system_parts if p)},
            {"role": "user", "content": user_content},
        ]

    async def _complete(self, messages: list[dict[str, Any]], *, stream: bool = False) -> Any:
        client = _openai_client()
        return await client.chat.completions.create(
            model=DEFAULT_MODEL,
            messages=messages,
            stream=stream,
        )

    async def run_agent(
        self,
        agent_type: str,
        task: str,
        context: dict[str, Any] | None = None,
        workspace_id: int | None = None,
        *,
        prior_output: str | None = None,
    ) -> dict[str, Any]:
        if workspace_id is not None and int(workspace_id) != self.workspace_id:
            raise ValueError("workspace_id does not match orchestrator instance")
        agent_id = normalize_agent_type(agent_type)
        messages = await self._build_messages(
            agent_id, task, context, prior_output=prior_output
        )
        response = await self._complete(messages, stream=False)
        text_out = ""
        if response.choices:
            text_out = (response.choices[0].message.content or "").strip()

        await memory_service.save_memory(
            self.workspace_id,
            self.client_id,
            f"[{agent_id}] Task: {task[:200]}\nOutput: {text_out[:2000]}",
            metadata={"type": "orchestrator_run", "agent_id": agent_id},
        )

        return {
            "workspace_id": self.workspace_id,
            "agent_type": agent_id,
            "agent_class": next(a["class"] for a in AGENT_CATALOG if a["id"] == agent_id),
            "task": task,
            "output": text_out,
            "model": DEFAULT_MODEL,
            "usage": response.usage.model_dump() if response.usage else None,
        }

    async def stream_run_agent(
        self,
        agent_type: str,
        task: str,
        context: dict[str, Any] | None = None,
        *,
        prior_output: str | None = None,
    ) -> AsyncGenerator[str, None]:
        agent_id = normalize_agent_type(agent_type)
        yield f"data: {json.dumps({'agent': agent_id, 'event': 'start'})}\n\n"

        messages = await self._build_messages(
            agent_id, task, context, prior_output=prior_output
        )
        parts: list[str] = []
        try:
            stream = await self._complete(messages, stream=True)
            async for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta.content
                if delta:
                    parts.append(delta)
                    yield f"data: {json.dumps({'agent': agent_id, 'content': delta})}\n\n"
        except Exception as exc:
            logger.warning("Agent stream error (%s): %s", agent_id, exc)
            yield f"data: {json.dumps({'agent': agent_id, 'error': str(exc)})}\n\n"
        finally:
            full = "".join(parts).strip()
            if full:
                await memory_service.save_memory(
                    self.workspace_id,
                    self.client_id,
                    f"[{agent_id}] {task[:200]} -> {full[:2000]}",
                    metadata={"type": "orchestrator_stream", "agent_id": agent_id},
                )
            yield f"data: {json.dumps({'agent': agent_id, 'event': 'done'})}\n\n"
            yield "data: [DONE]\n\n"

    async def chain_agents(
        self,
        agents_list: list[str],
        task: str,
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if not agents_list:
            raise ValueError("agents_list is required")
        results: list[dict[str, Any]] = []
        prior = ""
        for agent_type in agents_list:
            out = await self.run_agent(
                agent_type, task, context, prior_output=prior or None
            )
            results.append(out)
            prior = out.get("output") or prior
        return {
            "workspace_id": self.workspace_id,
            "task": task,
            "agents": [normalize_agent_type(a) for a in agents_list],
            "results": results,
            "final_output": prior,
        }

    async def stream_chain_agents(
        self,
        agents_list: list[str],
        task: str,
        context: dict[str, Any] | None = None,
    ) -> AsyncGenerator[str, None]:
        if not agents_list:
            yield f"data: {json.dumps({'error': 'agents_list is required'})}\n\n"
            yield "data: [DONE]\n\n"
            return

        prior = ""
        for agent_type in agents_list:
            agent_id = normalize_agent_type(agent_type)
            yield f"data: {json.dumps({'agent': agent_id, 'event': 'start'})}\n\n"
            messages = await self._build_messages(
                agent_id, task, context, prior_output=prior or None
            )
            parts: list[str] = []
            try:
                stream = await self._complete(messages, stream=True)
                async for chunk in stream:
                    if not chunk.choices:
                        continue
                    delta = chunk.choices[0].delta.content
                    if delta:
                        parts.append(delta)
                        yield f"data: {json.dumps({'agent': agent_id, 'content': delta})}\n\n"
            except Exception as exc:
                yield f"data: {json.dumps({'agent': agent_id, 'error': str(exc)})}\n\n"
            prior = "".join(parts).strip()
            if prior:
                await memory_service.save_memory(
                    self.workspace_id,
                    self.client_id,
                    f"[chain:{agent_id}] {task[:150]} -> {prior[:1500]}",
                    metadata={"type": "orchestrator_chain", "agent_id": agent_id},
                )
            yield f"data: {json.dumps({'agent': agent_id, 'event': 'done', 'output_length': len(prior)})}\n\n"

        yield f"data: {json.dumps({'event': 'chain_complete', 'final_output': prior[:8000]})}\n\n"
        yield "data: [DONE]\n\n"

    async def analyze_business(
        self,
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Full multi-agent business analysis."""
        task = (
            "Realiza un análisis integral del negocio del cliente: situación actual, "
            "oportunidades de crecimiento, riesgos y plan de acción priorizado a 30/60/90 días. "
            "Sé específico y basado en datos."
        )
        chain_order = ["analytics", "seo", "crm", "ads", "content", "email"]
        chain_result = await self.chain_agents(chain_order, task, context)

        synthesis_task = (
            "Sintetiza los análisis previos en un informe ejecutivo único para el CEO: "
            "resumen, 5 hallazgos clave, plan de acción y KPIs."
        )
        synthesis = await self.run_agent(
            "content",
            synthesis_task,
            context,
            prior_output=chain_result.get("final_output"),
        )

        return {
            "workspace_id": self.workspace_id,
            "analysis_type": "full_business",
            "chain": chain_result,
            "executive_summary": synthesis.get("output"),
        }


def get_agent_orchestrator(workspace_id: int) -> AgentOrchestrator:
    return AgentOrchestrator(workspace_id)
