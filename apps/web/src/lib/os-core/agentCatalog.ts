import { OS_PREMIUM_SERVICE_IDS } from "../../../../../backend/os-agents/constants";

import type { BusinessVertical, MarketingDiscipline, OsAgentDefinition } from "./types";

const PREMIUM_META: Record<
  string,
  {
    name: string;
    discipline: MarketingDiscipline;
    verticals: BusinessVertical[];
    responsibility: string;
    inputs: string[];
    outputs: string[];
    promptHint: string;
  }
> = {
  seo_premium: {
    name: "SEO Premium",
    discipline: "seo",
    verticals: ["local", "ecommerce", "b2b_saas", "generic"],
    responsibility: "Auditoría técnica, keyword research, contenido on-page, link building y publicación de informes.",
    inputs: ["dominio", "sector", "geo objetivo", "competidores", "CMS"],
    outputs: ["informe SEO 90d", "plan keywords", "fixes on-page", "ZIP entregables"],
    promptHint: "Auditor SEO técnico NELVYON. JSON estructurado, fail-safe offline.",
  },
  ads_premium: {
    name: "Ads Premium",
    discipline: "sem_ads",
    verticals: ["local", "ecommerce", "b2b_saas", "generic"],
    responsibility: "Estructura de campañas Google/Meta, creatividades, audiencias, tests A/B y reporting.",
    inputs: ["presupuesto", "objetivo conversión", "landing URL", "pixel/GA4", "buyer persona"],
    outputs: ["estructura campañas", "copies anuncios", "matriz tests", "informe rendimiento"],
    promptHint: "Estratega paid media NELVYON. ROAS-first, un CTA por funnel.",
  },
  social_media_premium: {
    name: "Social Media Premium",
    discipline: "social",
    verticals: ["local", "ecommerce", "b2b_saas", "info_products"],
    responsibility: "Calendario editorial, copies por red, hashtags, crisis y monitorización competencia.",
    inputs: ["tono marca", "redes activas", "frecuencia", "pilares contenido", "CTA"],
    outputs: ["calendario 30d", "copies IG/LI/TT", "brief creativo", "informe engagement"],
    promptHint: "Social strategist NELVYON. Formato nativo por red.",
  },
  email_marketing_premium: {
    name: "Email Marketing Premium",
    discipline: "email",
    verticals: ["local", "ecommerce", "b2b_saas", "info_products"],
    responsibility: "Secuencias welcome/nurture, campañas puntuales, deliverability y automatizaciones.",
    inputs: ["ICP", "objetivo funnel", "tono", "trigger eventos", "CRM/ESP"],
    outputs: ["secuencia 3-7 emails", "subject lines A/B", "flujo automation", "checklist deliverability"],
    promptHint: "Email lifecycle NELVYON. PAS/AIDA, un CTA por email.",
  },
  contenido_copywriting_premium: {
    name: "Contenido & Copywriting",
    discipline: "content",
    verticals: ["local", "ecommerce", "b2b_saas", "info_products", "generic"],
    responsibility: "Briefs, artículos, landing copy, scripts y propuestas de valor.",
    inputs: ["brief negocio", "keywords", "tono", "formato", "longitud"],
    outputs: ["copy final", "outline", "variantes headline", "meta descriptions"],
    promptHint: "Copywriter NELVYON. Headline ≤12 palabras, beneficio > feature.",
  },
  landing_premium: {
    name: "Landing Premium",
    discipline: "landing_funnel",
    verticals: ["local", "ecommerce", "b2b_saas", "info_products"],
    responsibility: "Estructura de secciones, copy conversión, assets y QA CRO.",
    inputs: ["oferta", "CTA único", "objeciones", "prueba social", "marca"],
    outputs: ["wireframe secciones", "copy hero+FAQ", "checklist CRO", "spec diseño"],
    promptHint: "PM landing NELVYON. Framework PAS/AIDA, CTA único.",
  },
  funnel_premium: {
    name: "Funnel Premium",
    discipline: "cro",
    verticals: ["ecommerce", "b2b_saas", "info_products"],
    responsibility: "Mapa funnel completo, upsells, secuencias retención y optimización conversión.",
    inputs: ["producto", "ticket", "canales tráfico", "CRM", "métricas actuales"],
    outputs: ["mapa funnel", "puntos fricción", "plan tests CRO", "KPIs por etapa"],
    promptHint: "CRO strategist NELVYON. Hipótesis medibles, ICE score.",
  },
  branding_premium: {
    name: "Branding Premium",
    discipline: "branding",
    verticals: ["local", "ecommerce", "b2b_saas", "generic"],
    responsibility: "Brand voice, mensajes clave, propuesta de valor y guía tono.",
    inputs: ["historia marca", "audiencia", "competidores", "valores", "diferenciadores"],
    outputs: ["brand voice doc", "mensajes clave", "elevator pitch", "do/don't copy"],
    promptHint: "Brand strategist NELVYON. Voz consistente, no jerga vacía.",
  },
  consultoria_automatizacion_premium: {
    name: "Automatización & Workflows",
    discipline: "automation",
    verticals: ["b2b_saas", "ecommerce", "agency"],
    responsibility: "Flujos Zapier/Make, triggers CRM, alertas y handoffs entre canales.",
    inputs: ["stack actual", "eventos clave", "SLAs", "owners"],
    outputs: ["diagrama flujo", "lista integraciones", "runbook ops"],
    promptHint: "Automation architect NELVYON. Idempotente, logs obligatorios.",
  },
  reputacion_online_orm_premium: {
    name: "Reputación Online (ORM)",
    discipline: "reputation",
    verticals: ["local", "ecommerce", "generic"],
    responsibility: "Monitorización reseñas, respuestas, alertas y plan mejora rating.",
    inputs: ["Google Business", "Trustpilot", "redes", "SLA respuesta"],
    outputs: ["informe sentiment", "plantillas respuesta", "plan 30d"],
    promptHint: "ORM specialist NELVYON. Tono empático, compliance sector.",
  },
};

function premiumAgents(): OsAgentDefinition[] {
  return OS_PREMIUM_SERVICE_IDS.map((id) => {
    const meta = PREMIUM_META[id];
    if (meta) {
      return {
        id,
        name: meta.name,
        discipline: meta.discipline,
        tier: "premium" as const,
        verticals: meta.verticals,
        responsibility: meta.responsibility,
        inputs: meta.inputs,
        outputs: meta.outputs,
        promptRole: meta.promptHint,
        osServiceId: id,
      };
    }
    const fallbackName = id.replace(/_premium$/, "").replace(/_/g, " ");
    return {
      id,
      name: fallbackName.replace(/\b\w/g, (c) => c.toUpperCase()),
      discipline: "strategy" as MarketingDiscipline,
      tier: "premium" as const,
      verticals: ["generic"] as BusinessVertical[],
      responsibility: `Agente premium OS para ${fallbackName}.`,
      inputs: ["brief cliente", "sector", "objetivos"],
      outputs: ["entregables premium", "informe ejecutivo"],
      osServiceId: id,
    };
  });
}

const SECTOR_AGENTS: OsAgentDefinition[] = [
  {
    id: "sector-seo-keyword-research",
    name: "SEO · Keyword Research",
    discipline: "seo",
    tier: "sector",
    verticals: ["local", "ecommerce", "b2b_saas"],
    responsibility: "Investigación keywords long-tail, intención búsqueda y clusters temáticos.",
    inputs: ["seed keywords", "geo", "competidores", "idioma"],
    outputs: ["mapa keywords", "prioridad dificultad/volumen", "content gaps"],
    sectorPath: "backend/os-agents/sectors/seo",
  },
  {
    id: "sector-seo-content-optimizer",
    name: "SEO · Content Optimizer",
    discipline: "seo",
    tier: "sector",
    verticals: ["local", "ecommerce", "b2b_saas", "info_products"],
    responsibility: "Optimización on-page de URLs existentes: title, H1, schema, internal links.",
    inputs: ["URL", "keyword principal", "contenido actual"],
    outputs: ["checklist on-page", "meta patch", "schema JSON-LD"],
    sectorPath: "backend/os-agents/sectors/seo",
  },
  {
    id: "sector-ads-google",
    name: "Ads · Google Search/Display",
    discipline: "sem_ads",
    tier: "sector",
    verticals: ["local", "ecommerce", "b2b_saas"],
    responsibility: "Estructura campañas Google Ads, grupos anuncios, keywords negativas.",
    inputs: ["presupuesto diario", "landing", "conversiones", "geo"],
    outputs: ["estructura campaña", "copies RSA", "lista negativas"],
    sectorPath: "backend/os-agents/sectors/ads",
  },
  {
    id: "sector-ads-meta",
    name: "Ads · Meta (FB/IG)",
    discipline: "sem_ads",
    tier: "sector",
    verticals: ["local", "ecommerce", "info_products"],
    responsibility: "Campañas Meta: audiencias, creatividades, Advantage+ setup.",
    inputs: ["pixel", "catálogo", "buyer persona", "creativos"],
    outputs: ["estructura ad sets", "copies primary+headline", "UTM plan"],
    sectorPath: "backend/os-agents/sectors/ads",
  },
  {
    id: "sector-social-calendar",
    name: "Social · Calendario Editorial",
    discipline: "social",
    tier: "sector",
    verticals: ["local", "ecommerce", "b2b_saas", "info_products"],
    responsibility: "Calendario 4 semanas con pilares, formatos y CTAs por red.",
    inputs: ["pilares", "frecuencia", "eventos", "tono"],
    outputs: ["calendario CSV/JSON", "briefs por post", "hashtag sets"],
    sectorPath: "backend/os-agents/sectors/social",
  },
  {
    id: "sector-email-welcome",
    name: "Email · Welcome Sequence",
    discipline: "email",
    tier: "sector",
    verticals: ["local", "ecommerce", "b2b_saas", "info_products"],
    responsibility: "Secuencia bienvenida 3-5 emails post-registro o compra.",
    inputs: ["trigger", "tono", "oferta", "objetivo día 7"],
    outputs: ["emails completos", "subjects A/B", "delays horas"],
    sectorPath: "backend/os-agents/sectors/emailmarketing",
  },
  {
    id: "sector-email-nurture",
    name: "Email · Nurture B2B",
    discipline: "email",
    tier: "sector",
    verticals: ["b2b_saas", "info_products"],
    responsibility: "Nurture educativo hacia demo/compra con casos de uso y prueba social.",
    inputs: ["ICP", "pain points", "case studies", "CTA demo"],
    outputs: ["secuencia 5-7 emails", "CTA progression", "scoring leads"],
    sectorPath: "backend/os-agents/sectors/emailmarketing",
  },
  {
    id: "sector-email-abandoned-cart",
    name: "Email · Carrito Abandonado",
    discipline: "email",
    tier: "sector",
    verticals: ["ecommerce"],
    responsibility: "Recuperación carrito 3 toques con urgencia y garantías.",
    inputs: ["productos", "descuento max", "marca", "ESP"],
    outputs: ["3 emails", "subjects", "timing 1h/24h/72h"],
    sectorPath: "backend/os-agents/sectors/emailmarketing",
  },
  {
    id: "sector-analytics-ga4",
    name: "Analytics · GA4 Setup",
    discipline: "analytics",
    tier: "sector",
    verticals: ["local", "ecommerce", "b2b_saas", "generic"],
    responsibility: "Configuración eventos GA4, conversiones, informes ejecutivos.",
    inputs: ["propiedad GA4", "eventos negocio", "funnel steps"],
    outputs: ["mapa eventos", "informe template", "checklist QA tracking"],
    sectorPath: "backend/os-agents/sectors/analytics",
  },
  {
    id: "sector-strategy-growth",
    name: "Estrategia · Plan Crecimiento 90d",
    discipline: "strategy",
    tier: "sector",
    verticals: ["local", "ecommerce", "b2b_saas", "info_products", "agency"],
    responsibility: "Plan trimestral: canales, presupuesto, KPIs y priorización ICE.",
    inputs: ["situación actual", "objetivos", "presupuesto", "equipo"],
    outputs: ["plan 90d", "OKRs", "roadmap canales"],
    sectorPath: "backend/os-agents/sectors/strategy",
  },
];

const AUTONOMOUS_AGENTS: OsAgentDefinition[] = [
  {
    id: "autonomous-pm-landing",
    name: "Autonomous PM · Landing",
    discipline: "landing_funnel",
    tier: "autonomous",
    verticals: ["local", "ecommerce", "b2b_saas"],
    responsibility: "Orquesta pipeline landing: brief → estrategia → copy → diseño → SEO → QA.",
    inputs: ["brief JSON", "sector", "tier"],
    outputs: ["landing publicada", "QA score", "deliverable IDs"],
    promptRole: "agent-pm-landing",
  },
  {
    id: "autonomous-pm-seo",
    name: "Autonomous PM · SEO",
    discipline: "seo",
    tier: "autonomous",
    verticals: ["local", "ecommerce", "b2b_saas"],
    responsibility: "Pipeline SEO: crawl → auditoría → fixes on-page → informe 10 secciones.",
    inputs: ["dominio", "sector", "pages target"],
    outputs: ["informe SEO", "plan 90d", "fixes on-page"],
    promptRole: "agent-pm-seo",
  },
  {
    id: "autonomous-pm-chatbot",
    name: "Autonomous PM · Chatbot",
    discipline: "automation",
    tier: "autonomous",
    verticals: ["local", "ecommerce", "b2b_saas"],
    responsibility: "Pipeline chatbot: persona → intents → KB FAQs → widget embed.",
    inputs: ["brief", "sector", "FAQs mínimas"],
    outputs: ["bot live URL", "KB JSON", "QA score"],
    promptRole: "agent-pm-chatbot",
  },
];

const VERTICAL_AGENT_OVERRIDES: Record<BusinessVertical, string[]> = {
  local: ["seo_premium", "sector-seo-keyword-research", "sector-social-calendar", "sector-email-welcome", "landing_premium"],
  ecommerce: ["ads_premium", "sector-ads-meta", "sector-email-abandoned-cart", "funnel_premium", "contenido_copywriting_premium"],
  b2b_saas: ["sector-email-nurture", "landing_premium", "sector-ads-google", "consultoria_automatizacion_premium"],
  info_products: ["email_marketing_premium", "funnel_premium", "social_media_premium", "contenido_copywriting_premium"],
  marketplace: ["ads_premium", "seo_premium", "sector-ads-meta"],
  agency: ["consultoria_automatizacion_premium", "sector-strategy-growth"],
  generic: ["seo_premium", "ads_premium", "social_media_premium", "email_marketing_premium"],
};

export const OS_AGENT_CATALOG: OsAgentDefinition[] = [
  ...premiumAgents(),
  ...SECTOR_AGENTS,
  ...AUTONOMOUS_AGENTS,
];

export function getAgentById(id: string): OsAgentDefinition | undefined {
  return OS_AGENT_CATALOG.find((a) => a.id === id);
}

export function getAgentsByDiscipline(d: MarketingDiscipline): OsAgentDefinition[] {
  return OS_AGENT_CATALOG.filter((a) => a.discipline === d);
}

export function getAgentsForVertical(v: BusinessVertical): OsAgentDefinition[] {
  const ids = new Set(VERTICAL_AGENT_OVERRIDES[v] ?? VERTICAL_AGENT_OVERRIDES.generic);
  return OS_AGENT_CATALOG.filter((a) => ids.has(a.id));
}

export function getAgentCatalogStats() {
  return {
    total: OS_AGENT_CATALOG.length,
    premium: OS_AGENT_CATALOG.filter((a) => a.tier === "premium").length,
    sector: OS_AGENT_CATALOG.filter((a) => a.tier === "sector").length,
    autonomous: OS_AGENT_CATALOG.filter((a) => a.tier === "autonomous").length,
    disciplines: [...new Set(OS_AGENT_CATALOG.map((a) => a.discipline))].length,
  };
}
