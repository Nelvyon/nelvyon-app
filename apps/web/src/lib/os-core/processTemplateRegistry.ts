import type { BusinessVertical, ProcessTemplate, ProcessTemplateCategory } from "./types";

type TemplateSeed = {
  category: ProcessTemplateCategory;
  prefix: string;
  discipline: ProcessTemplate["discipline"];
  verticals: BusinessVertical[];
  agentIds: string[];
  stepPattern: string[];
  deliverablePattern: string;
  variants: { suffix: string; name: string; description: string; hours: number }[];
};

const SEEDS: TemplateSeed[] = [
  {
    category: "seo",
    prefix: "seo",
    discipline: "seo",
    verticals: ["local", "ecommerce", "b2b_saas", "generic"],
    agentIds: ["seo_premium", "sector-seo-keyword-research", "sector-seo-content-optimizer"],
    stepPattern: ["Brief SEO", "Crawl técnico", "Keyword research", "Auditoría on-page", "Plan contenidos", "Informe ejecutivo"],
    deliverablePattern: "Informe + plan acción",
    variants: [
      { suffix: "audit-technical", name: "Auditoría SEO técnica", description: "Crawl, indexación, Core Web Vitals, robots/sitemap.", hours: 8 },
      { suffix: "audit-local", name: "Auditoría SEO local", description: "Google Business, NAP, citas locales, map pack.", hours: 6 },
      { suffix: "audit-ecommerce", name: "Auditoría SEO ecommerce", description: "Facets, thin content, categorías, schema product.", hours: 10 },
      { suffix: "content-plan-30d", name: "Plan contenidos 30 días", description: "Calendario editorial SEO con keywords y briefs.", hours: 6 },
      { suffix: "content-plan-90d", name: "Plan contenidos 90 días", description: "Clusters temáticos, pillar pages, internal linking.", hours: 12 },
      { suffix: "onpage-url-batch", name: "Optimización on-page (lote URLs)", description: "Title, meta, H1, schema por URL priorizada.", hours: 4 },
      { suffix: "onpage-new-landing", name: "On-page landing conversión", description: "SEO + CRO para landing de campaña.", hours: 5 },
      { suffix: "keyword-research-local", name: "Keyword research local", description: "Long-tail geo + servicios barrio/ciudad.", hours: 3 },
      { suffix: "keyword-research-b2b", name: "Keyword research B2B", description: "Intent comercial, comparativas, bottom funnel.", hours: 5 },
      { suffix: "link-building-outreach", name: "Plan link building", description: "Prospectos, anchors, plantillas outreach.", hours: 8 },
      { suffix: "report-monthly", name: "Informe SEO mensual", description: "Rankings, tráfico, acciones completadas, next steps.", hours: 3 },
      { suffix: "report-quarterly", name: "Informe SEO trimestral", description: "Review 90d, ROI orgánico, roadmap Q+1.", hours: 6 },
      { suffix: "schema-local-business", name: "Schema LocalBusiness", description: "JSON-LD local + FAQ + breadcrumbs.", hours: 2 },
      { suffix: "schema-saas", name: "Schema SaaS/Product", description: "SoftwareApplication, FAQ, Organization.", hours: 2 },
      { suffix: "competitor-gap", name: "Gap analysis competidores", description: "Keywords y contenidos donde compiten y tú no.", hours: 5 },
    ],
  },
  {
    category: "ads",
    prefix: "ads",
    discipline: "sem_ads",
    verticals: ["local", "ecommerce", "b2b_saas"],
    agentIds: ["ads_premium", "sector-ads-google", "sector-ads-meta"],
    stepPattern: ["Brief campaña", "Investigación audiencia", "Estructura", "Creatividades", "Tracking QA", "Launch checklist"],
    deliverablePattern: "Estructura campaña + copies",
    variants: [
      { suffix: "google-search-local", name: "Google Search local", description: "Campaña servicios locales con extensiones y geo.", hours: 4 },
      { suffix: "google-search-b2b", name: "Google Search B2B", description: "Keywords bottom funnel, lead gen, formularios.", hours: 5 },
      { suffix: "google-pmax-ecommerce", name: "Performance Max ecommerce", description: "Feed, assets, audiencias señal.", hours: 6 },
      { suffix: "meta-leads-local", name: "Meta Ads leads local", description: "Formularios instantáneos + creatividades UGC.", hours: 4 },
      { suffix: "meta-catalog-dtc", name: "Meta catalog DTC", description: "Dynamic ads, retargeting, lookalikes.", hours: 5 },
      { suffix: "meta-awareness-b2b", name: "Meta awareness B2B", description: "Top funnel LinkedIn-style en Meta para SaaS.", hours: 4 },
      { suffix: "tiktok-ugc", name: "TikTok UGC ads", description: "Hooks 3s, scripts, variantes creativas.", hours: 5 },
      { suffix: "linkedin-abm", name: "LinkedIn ABM", description: "Cuentas objetivo, mensajes, lead gen forms.", hours: 6 },
      { suffix: "ab-test-matrix", name: "Matriz tests A/B", description: "Hipótesis, variantes, métricas éxito, duración.", hours: 3 },
      { suffix: "creative-brief-5", name: "Brief creatividades (5 variantes)", description: "Angles, hooks, CTAs para diseño/video.", hours: 3 },
      { suffix: "audience-research", name: "Investigación audiencias", description: "Personas, intereses, exclusiones, tamaños.", hours: 4 },
      { suffix: "report-weekly", name: "Reporte paid semanal", description: "Spend, CPA, ROAS, recomendaciones.", hours: 2 },
      { suffix: "report-monthly", name: "Reporte paid mensual", description: "Review canal, presupuesto Q+1, winners/losers.", hours: 4 },
      { suffix: "landing-ads-alignment", name: "Alineación landing ↔ ads", description: "Message match, UTMs, velocidad post-click.", hours: 3 },
      { suffix: "remarketing-setup", name: "Setup remarketing", description: "Audiencias web, carrito, CRM custom.", hours: 4 },
    ],
  },
  {
    category: "social",
    prefix: "social",
    discipline: "social",
    verticals: ["local", "ecommerce", "b2b_saas", "info_products"],
    agentIds: ["social_media_premium", "sector-social-calendar"],
    stepPattern: ["Pilares contenido", "Calendario", "Copies", "Assets brief", "Publicación checklist"],
    deliverablePattern: "Calendario + copies",
    variants: [
      { suffix: "calendar-30d-local", name: "Calendario 30d local", description: "IG + FB negocio barrio, promos y reseñas.", hours: 4 },
      { suffix: "calendar-30d-ecommerce", name: "Calendario 30d ecommerce", description: "Product drops, UGC, ofertas, stories.", hours: 5 },
      { suffix: "calendar-30d-b2b", name: "Calendario 30d B2B LinkedIn", description: "Thought leadership, casos, hiring.", hours: 4 },
      { suffix: "calendar-30d-info", name: "Calendario 30d info-products", description: "Tips, webinars, testimonios, lanzamientos.", hours: 4 },
      { suffix: "copy-instagram-10", name: "10 copies Instagram", description: "Captions + hashtags + CTA por post.", hours: 3 },
      { suffix: "copy-linkedin-8", name: "8 posts LinkedIn", description: "Hooks profesionales, carruseles, polls.", hours: 3 },
      { suffix: "copy-tiktok-12", name: "12 scripts TikTok", description: "15-45s, trend-safe, CTA soft.", hours: 4 },
      { suffix: "copy-twitter-x-15", name: "15 tweets/X threads", description: "Hilos educativos + engagement bait ético.", hours: 3 },
      { suffix: "hashtag-research", name: "Research hashtags", description: "Sets por pilar, volumen, banned list.", hours: 2 },
      { suffix: "crisis-response", name: "Plan respuesta crisis", description: "Escenarios, tono, aprobaciones, plantillas.", hours: 4 },
      { suffix: "competitor-monitor", name: "Monitor competencia social", description: "Benchmark frecuencia, formatos, engagement.", hours: 3 },
      { suffix: "ugc-brief", name: "Brief UGC creators", description: "Do/don't, scripts, derechos imagen.", hours: 3 },
      { suffix: "community-faq", name: "FAQ comunidad", description: "Respuestas estándar DMs y comentarios.", hours: 2 },
      { suffix: "report-monthly", name: "Informe social mensual", description: "Reach, engagement, top posts, next tests.", hours: 3 },
    ],
  },
  {
    category: "email",
    prefix: "email",
    discipline: "email",
    verticals: ["local", "ecommerce", "b2b_saas", "info_products"],
    agentIds: ["email_marketing_premium", "sector-email-welcome", "sector-email-nurture", "sector-email-abandoned-cart"],
    stepPattern: ["Objetivo funnel", "Segmentación", "Copy secuencia", "QA deliverability", "Automation map"],
    deliverablePattern: "Secuencia emails + automation",
    variants: [
      { suffix: "welcome-3-local", name: "Welcome 3 emails local", description: "Bienvenida, CTA reserva, prueba social local.", hours: 3 },
      { suffix: "welcome-5-ecommerce", name: "Welcome 5 emails ecommerce", description: "Onboarding tienda, bestsellers, descuento.", hours: 4 },
      { suffix: "nurture-5-b2b", name: "Nurture 5 emails B2B", description: "Educación → demo → case study → urgency.", hours: 5 },
      { suffix: "nurture-7-info", name: "Nurture 7 emails info-product", description: "Valor gratis → webinar → oferta → bonus.", hours: 6 },
      { suffix: "abandoned-cart-3", name: "Carrito abandonado 3 toques", description: "1h / 24h / 72h con urgencia y FAQ.", hours: 3 },
      { suffix: "winback-3", name: "Win-back inactivos", description: "Reactivación clientes 90d sin compra.", hours: 3 },
      { suffix: "launch-sequence", name: "Secuencia lanzamiento", description: "Teaser → apertura → recordatorio → cierre.", hours: 5 },
      { suffix: "newsletter-monthly", name: "Newsletter mensual", description: "Estructura fija: novedades, tip, CTA.", hours: 2 },
      { suffix: "promo-flash", name: "Campaña promo flash", description: "Email único + SMS opcional, countdown.", hours: 2 },
      { suffix: "post-purchase", name: "Post-compra + review", description: "Gracias, upsell, solicitud reseña.", hours: 3 },
      { suffix: "onboarding-saas", name: "Onboarding SaaS trial", description: "Activación feature, aha moment, upgrade.", hours: 4 },
      { suffix: "deliverability-audit", name: "Auditoría deliverability", description: "SPF/DKIM/DMARC, warm-up, list hygiene.", hours: 3 },
      { suffix: "segmentation-map", name: "Mapa segmentación", description: "Tags, triggers, reglas RFM.", hours: 4 },
      { suffix: "re-engagement", name: "Re-engagement sunset", description: "Último chance antes de limpiar lista.", hours: 2 },
    ],
  },
  {
    category: "landing_funnel",
    prefix: "landing",
    discipline: "landing_funnel",
    verticals: ["local", "ecommerce", "b2b_saas", "info_products"],
    agentIds: ["landing_premium", "funnel_premium", "autonomous-pm-landing"],
    stepPattern: ["Brief oferta", "Wireframe secciones", "Copy", "Assets", "CRO QA"],
    deliverablePattern: "Landing spec + copy",
    variants: [
      { suffix: "local-service", name: "Landing servicio local", description: "Hero, servicios, mapa, reseñas, formulario.", hours: 5 },
      { suffix: "ecommerce-collection", name: "Landing colección DTC", description: "Hero producto, beneficios, social proof, checkout.", hours: 5 },
      { suffix: "saas-plg-trial", name: "Landing PLG trial SaaS", description: "Propuesta valor, features, pricing teaser, signup.", hours: 6 },
      { suffix: "webinar-registration", name: "Landing registro webinar", description: "Agenda, speaker bio, countdown, form.", hours: 4 },
      { suffix: "lead-magnet", name: "Landing lead magnet", description: "PDF/checklist gate, thank-you page.", hours: 4 },
      { suffix: "thank-you-upsell", name: "Thank-you + upsell", description: "Confirmación + OTO one-time offer.", hours: 3 },
      { suffix: "pricing-page", name: "Pricing page SaaS", description: "3 tiers, FAQ, comparativa, CTA demo.", hours: 5 },
      { suffix: "comparison-page", name: "Página comparativa vs competidor", description: "Tabla features, migración, garantía.", hours: 5 },
      { suffix: "funnel-map-full", name: "Mapa funnel completo", description: "TOFU→MOFU→BOFU con KPIs por etapa.", hours: 6 },
      { suffix: "checkout-optimization", name: "Optimización checkout", description: "Fricción, trust badges, guest checkout.", hours: 4 },
      { suffix: "cro-audit-landing", name: "Auditoría CRO landing", description: "Heurísticas, heatmap hypothesis, tests.", hours: 4 },
      { suffix: "ab-test-landing", name: "Plan A/B landing", description: "Variantes hero, CTA, social proof.", hours: 3 },
    ],
  },
  {
    category: "brand",
    prefix: "brand",
    discipline: "branding",
    verticals: ["local", "ecommerce", "b2b_saas", "generic"],
    agentIds: ["branding_premium", "contenido_copywriting_premium"],
    stepPattern: ["Discovery", "Competencia", "Propuesta valor", "Tono voz", "Mensajes clave"],
    deliverablePattern: "Brand voice doc",
    variants: [
      { suffix: "voice-guide", name: "Guía brand voice", description: "Personalidad, do/don't, ejemplos por canal.", hours: 6 },
      { suffix: "value-prop-3", name: "3 propuestas de valor", description: "Variantes headline + subhead para test.", hours: 3 },
      { suffix: "messaging-house", name: "Messaging house", description: "Pilar mensajes, proof points, objeciones.", hours: 5 },
      { suffix: "elevator-pitch", name: "Elevator pitch 30/60/120s", description: "Versiones oral y escrita.", hours: 2 },
      { suffix: "tagline-options", name: "10 opciones tagline", description: "Memorable, diferenciador, testeable.", hours: 2 },
      { suffix: "persona-3", name: "3 buyer personas", description: "Jobs, pains, gains, canales.", hours: 4 },
      { suffix: "competitive-positioning", name: "Mapa posicionamiento", description: "2x2 vs competidores, white space.", hours: 4 },
      { suffix: "tone-social", name: "Tono por red social", description: "IG vs LI vs email: matices y ejemplos.", hours: 3 },
    ],
  },
  {
    category: "deliverable",
    prefix: "deliverable",
    discipline: "strategy",
    verticals: ["generic", "agency"],
    agentIds: ["sector-strategy-growth"],
    stepPattern: ["Contexto", "Análisis", "Recomendaciones", "Plan acción", "Checklist entrega"],
    deliverablePattern: "Documento ejecutivo",
    variants: [
      { suffix: "brief-campaign", name: "Brief campaña", description: "Objetivo, audiencia, mensaje, KPIs, budget.", hours: 2 },
      { suffix: "brief-creative", name: "Brief creativo", description: "Referencias, mandatories, formatos, deadlines.", hours: 2 },
      { suffix: "checklist-launch", name: "Checklist lanzamiento", description: "Pre-flight ads, tracking, legal, QA.", hours: 1 },
      { suffix: "checklist-seo-onpage", name: "Checklist SEO on-page", description: "25 puntos por URL antes de publicar.", hours: 1 },
      { suffix: "checklist-email-send", name: "Checklist pre-envío email", description: "Links, UTM, preview, spam test.", hours: 1 },
      { suffix: "action-plan-30d", name: "Plan acción 30 días", description: "Semana a semana, owners, métricas.", hours: 3 },
      { suffix: "action-plan-90d", name: "Plan acción 90 días", description: "Trimestre completo marketing mix.", hours: 5 },
      { suffix: "report-executive", name: "Informe ejecutivo mensual", description: "1 pager CEO: resultados, aprendizajes, ask.", hours: 3 },
      { suffix: "report-channel-deep-dive", name: "Deep dive canal", description: "Análisis profundo un canal (SEO/Ads/etc).", hours: 4 },
      { suffix: "kickoff-agenda", name: "Agenda kickoff cliente", description: "60min: objetivos, datos, próximos pasos.", hours: 1 },
      { suffix: "status-update-weekly", name: "Status update semanal", description: "Plantilla email interno/cliente.", hours: 1 },
      { suffix: "retro-campaign", name: "Retrospectiva campaña", description: "Qué funcionó, qué no, next tests.", hours: 2 },
    ],
  },
  {
    category: "saas_ops",
    prefix: "saas-ops",
    discipline: "automation",
    verticals: ["agency", "b2b_saas"],
    agentIds: ["consultoria_automatizacion_premium"],
    stepPattern: ["Trigger", "Validación datos", "Ejecución OS", "Notificación", "Log auditoría"],
    deliverablePattern: "Runbook interno",
    variants: [
      { suffix: "onboarding-user", name: "Onboarding usuario SaaS", description: "Alta tenant, welcome, checklist primer pack.", hours: 2 },
      { suffix: "onboarding-client", name: "Alta cliente agencia", description: "CRM + OS client + portal invite.", hours: 2 },
      { suffix: "launch-campaign", name: "Lanzamiento campaña", description: "Kickoff pack → SKUs → deliverables portal.", hours: 3 },
      { suffix: "monthly-review", name: "Revisión mensual cliente", description: "KPIs, entregables, renovación, upsell.", hours: 3 },
      { suffix: "incident-email-fail", name: "Runbook fallo email", description: "SES down, cola retry, comunicación cliente.", hours: 1 },
      { suffix: "incident-ads-api", name: "Runbook fallo API ads", description: "Token expirado, fallback manual report.", hours: 1 },
      { suffix: "qa-pack-run", name: "QA post pack run", description: "Checklist QA score, portal, CEO metrics.", hours: 2 },
      { suffix: "handoff-sales-cs", name: "Handoff ventas → CS", description: "Contexto cliente, expectativas, riesgos.", hours: 1 },
      { suffix: "renewal-playbook", name: "Playbook renovación", description: "30/60/90 días antes vencimiento.", hours: 2 },
      { suffix: "upsell-pack", name: "Playbook upsell pack", description: "Señales uso, pack recomendado, script.", hours: 2 },
    ],
  },
];

function buildTemplates(): ProcessTemplate[] {
  const out: ProcessTemplate[] = [];
  for (const seed of SEEDS) {
    for (const v of seed.variants) {
      out.push({
        id: `${seed.prefix}-${v.suffix}`,
        category: seed.category,
        name: v.name,
        description: v.description,
        discipline: seed.discipline,
        verticals: seed.verticals,
        agentIds: seed.agentIds,
        steps: seed.stepPattern,
        deliverables: [`${v.name}: ${seed.deliverablePattern}`],
        estimatedHours: v.hours,
      });
    }
  }
  return out;
}

export const OS_PROCESS_TEMPLATES: ProcessTemplate[] = buildTemplates();

export function getProcessTemplateById(id: string): ProcessTemplate | undefined {
  return OS_PROCESS_TEMPLATES.find((t) => t.id === id);
}

export function getProcessTemplatesByCategory(c: ProcessTemplateCategory): ProcessTemplate[] {
  return OS_PROCESS_TEMPLATES.filter((t) => t.category === c);
}

export function getProcessTemplatesForVertical(v: BusinessVertical): ProcessTemplate[] {
  return OS_PROCESS_TEMPLATES.filter((t) => t.verticals.includes(v) || t.verticals.includes("generic"));
}

export function getProcessTemplateStats() {
  const byCategory = {} as Record<ProcessTemplateCategory, number>;
  for (const t of OS_PROCESS_TEMPLATES) {
    byCategory[t.category] = (byCategory[t.category] ?? 0) + 1;
  }
  return { total: OS_PROCESS_TEMPLATES.length, byCategory };
}
