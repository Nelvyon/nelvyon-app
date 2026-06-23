/**
 * Demo script structure for sales — reference for /packs Monday walkthrough.
 * Not shown in UI; consumed by docs and internal tooling.
 */

export type DemoStep = {
  order: number;
  screen: string;
  url: string;
  say: string;
  action: string;
  example?: string;
};

export const DEMO_MONDAY_SCRIPT: DemoStep[] = [
  {
    order: 1,
    screen: "Login",
    url: "/login",
    say: "NELVYON es tu agencia de marketing digital con IA: eliges un pack, das un brief corto y recibes entregables listos.",
    action: "Iniciar sesión con usuario demo",
    example: "qa-audit-20260612@nelvyon.test",
  },
  {
    order: 2,
    screen: "Catálogo SaaS",
    url: "/packs",
    say: "Aquí el cliente ve 12 servicios claros — sin agentes ni tecnicismos. Cada pack dice qué problema resuelve y qué recibe.",
    action: "Mostrar filtros: Crecimiento integral, SEO, Ads, Email",
  },
  {
    order: 3,
    screen: "Detalle pack local",
    url: "/packs/local-growth",
    say: "Pack Crecimiento Local: para negocios de barrio que quieren aparecer en Google y convertir visitas en citas.",
    action: "Leer beneficios y pulsar Empezar ahora",
  },
  {
    order: 4,
    screen: "Kickoff 1 clic",
    url: "/os/packs/local-growth",
    say: "Un clic y NELVYON provisiona CRM, campaña, proyecto OS y ejecuta landing, SEO y chatbot.",
    action: "Lanzar con plantilla demo (1 clic)",
    example: "Plantilla restaurante / clínica dental",
  },
  {
    order: 5,
    screen: "Progreso",
    url: "/os/packs/local-growth",
    say: "El cliente puede cerrar la pantalla; el OS trabaja por detrás con agentes y plantillas internas.",
    action: "Mostrar checklist de pasos hasta completado",
  },
  {
    order: 6,
    screen: "Informe CEO",
    url: "/dashboard/local-growth",
    say: "Informe ejecutivo: entregables publicados, calidad, emails welcome y enlace al portal del cliente.",
    action: "Abrir portal y CRM cliente",
  },
  {
    order: 7,
    screen: "Cerebro OS (solo interno)",
    url: "/os/packs",
    say: "Vista operativa: aquí lanzamos packs con provisionado completo. El cliente nunca necesita entrar.",
    action: "Mostrar Growth Packs OS vs /packs",
  },
  {
    order: 8,
    screen: "API OS catalog",
    url: "/api/os/core/catalog?view=summary",
    say: "38 agentes, 100 plantillas de proceso, conectores — el cerebro invisible que alimenta cada pack.",
    action: "Llamar con cookie de sesión (Postman o DevTools)",
  },
];

export const DEMO_PACK_LAUNCHES = [
  {
    name: "Pack Crecimiento Local",
    catalogUrl: "/packs/local-growth",
    kickoffUrl: "/os/packs/local-growth",
    reportUrl: "/dashboard/local-growth",
    launch: "1 clic — plantilla demo restaurante/dental",
    vertical: "Negocio local",
  },
  {
    name: "Pack Crecimiento Ecommerce",
    catalogUrl: "/packs/ecommerce-growth",
    kickoffUrl: "/os/packs/ecommerce-growth",
    reportUrl: "/dashboard/ecommerce-growth",
    launch: "1 clic — plantilla DTC + Meta Ads kit",
    vertical: "Ecommerce",
  },
  {
    name: "Pack Crecimiento SaaS B2B",
    catalogUrl: "/packs/saas-b2b-growth",
    kickoffUrl: "/os/packs/saas-b2b-growth",
    reportUrl: "/dashboard/saas-b2b-growth",
    launch: "1 clic — plantilla DevTools PLG",
    vertical: "SaaS B2B",
  },
  {
    name: "Pack SEO Local",
    catalogUrl: "/packs/seo-local",
    kickoffUrl: "/os/packs/local-growth?focus=seo",
    reportUrl: "/dashboard/local-growth",
    launch: "1 clic en kickoff (mismo motor Local)",
    vertical: "Local / SEO",
  },
  {
    name: "Pack Campañas Meta Ads",
    catalogUrl: "/packs/meta-ads",
    kickoffUrl: "/os/packs/ecommerce-growth?focus=meta",
    reportUrl: "/dashboard/ecommerce-growth",
    launch: "1 clic — canal Meta preseleccionado",
    vertical: "Ecommerce / Ads",
  },
  {
    name: "Pack Email Welcome + Nurturing",
    catalogUrl: "/packs/email-welcome-nurture",
    kickoffUrl: "/os/packs/local-growth?focus=email",
    reportUrl: "/dashboard/local-growth",
    launch: "1 clic — incluye secuencia welcome",
    vertical: "Local / Email",
  },
  {
    name: "Pack Landing + Funnel",
    catalogUrl: "/packs/landing-funnel",
    kickoffUrl: "/os/packs/saas-b2b-growth?focus=landing",
    reportUrl: "/dashboard/saas-b2b-growth",
    launch: "1 clic — plantilla SaaS B2B",
    vertical: "SaaS / CRO",
  },
  {
    name: "Pack Analytics Insights",
    catalogUrl: "/packs/analytics-insights",
    kickoffUrl: "/os/packs/analytics-insights",
    reportUrl: "/dashboard/analytics-insights",
    launch: "1 clic demo fixture · o GA4 OAuth",
    vertical: "Analytics / GA4",
  },
] as const;

/** Guiones alternativos por audiencia — mismos 7 packs, distinto orden y narrativa. */
export type DemoAudience = "agency" | "saas_b2b" | "local_business";

export type DemoScript = {
  audience: DemoAudience;
  title: string;
  duration_minutes: number;
  hook: string;
  steps: DemoStep[];
  packs_highlighted: string[];
};

export const DEMO_SCRIPT_LOCAL_BUSINESS: DemoScript = {
  audience: "local_business",
  title: "Negocio local — de Google a cita reservada",
  duration_minutes: 8,
  hook: "Un restaurante o clínica que quiere salir en Google y llenar agenda.",
  packs_highlighted: [
    "Pack Crecimiento Local",
    "Pack SEO Local",
    "Pack Email Welcome + Nurturing",
  ],
  steps: [
    {
      order: 1,
      screen: "Catálogo",
      url: "/packs",
      say: "Elige el pack que encaja: integral Local o solo SEO si ya tienes web.",
      action: "Filtrar categoría Crecimiento o SEO",
    },
    {
      order: 2,
      screen: "SEO Local",
      url: "/packs/seo-local",
      say: "El pack SEO usa el mismo motor que Crecimiento Local — en el informe verás cómo encaja con landing y chatbot.",
      action: "Empezar ahora → kickoff con ?focus=seo",
    },
    {
      order: 3,
      screen: "Kickoff 1 clic",
      url: "/os/packs/local-growth?focus=seo",
      say: "Un clic: plantilla restaurante o clínica. Sin brief largo.",
      action: "Lanzar con plantilla demo",
      example: "La Pizzería Napoli · Madrid",
    },
    {
      order: 4,
      screen: "Informe detallado",
      url: "/dashboard/local-growth",
      say: "Informe con secciones SEO, conversión y email — recomendaciones accionables listas para el dueño del negocio.",
      action: "Mostrar panel padre/hijo y sección SEO resaltada",
    },
    {
      order: 5,
      screen: "Portal cliente",
      url: "/portal",
      say: "El cliente revisa landing, informe SEO y chatbot sin entrar al OS.",
      action: "Abrir entregables publicados",
    },
  ],
};

export const DEMO_SCRIPT_SAAS_B2B: DemoScript = {
  audience: "saas_b2b",
  title: "SaaS B2B — de visita a demo agendada",
  duration_minutes: 10,
  hook: "Un SaaS PLG que necesita MQLs cualificados y funnel claro hasta demo.",
  packs_highlighted: [
    "Pack Crecimiento SaaS B2B",
    "Pack Landing + Funnel",
    "Analytics Insights",
  ],
  steps: [
    {
      order: 1,
      screen: "Catálogo",
      url: "/packs/saas-b2b-growth",
      say: "Pack integral: landing PLG, SEO demand gen, bot de demo, nurture y outbound.",
      action: "Leer beneficios y lanzar",
    },
    {
      order: 2,
      screen: "Kickoff DevTools",
      url: "/os/packs/saas-b2b-growth",
      say: "Plantilla DevTools — ICP VP Engineering, motion PLG.",
      action: "Lanzar con plantilla demo (1 clic)",
    },
    {
      order: 3,
      screen: "Landing + Funnel",
      url: "/packs/landing-funnel",
      say: "Si el cliente solo quiere CRO: pack especializado que muestra en el informe cómo conecta con nurture y outbound del pack padre.",
      action: "Comparar kickoff ?focus=landing",
    },
    {
      order: 4,
      screen: "Informe B2B",
      url: "/dashboard/saas-b2b-growth",
      say: "Secciones PLG, nurture, outbound — métricas demo de pipeline y conversiones.",
      action: "Scroll informe detallado + próximos pasos",
    },
    {
      order: 5,
      screen: "Analytics Insights",
      url: "/os/packs/analytics-insights",
      say: "Fase 2: insight real desde GA4 — canal dominante y landing con gap de conversión.",
      action: "Lanzar demo fixture o GA4 conectado",
    },
  ],
};

export const DEMO_SCRIPT_AGENCY: DemoScript = {
  audience: "agency",
  title: "Agencia — catálogo, 3 verticales, un OS",
  duration_minutes: 12,
  hook: "Vendes packs como producto: local, ecommerce y B2B con el mismo motor y portal white-label ready.",
  packs_highlighted: [
    "Pack Crecimiento Local",
    "Pack Crecimiento Ecommerce",
    "Pack Campañas Meta Ads",
    "Analytics Insights",
  ],
  steps: [
    {
      order: 1,
      screen: "Login + catálogo",
      url: "/packs",
      say: "12 servicios en lenguaje de negocio — tú eliges el vertical del cliente en 30 segundos.",
      action: "Mostrar filtros y packs beta Analytics",
    },
    {
      order: 2,
      screen: "Ecommerce + Meta",
      url: "/packs/meta-ads",
      say: "Meta Ads es especializado pero corre el motor Ecommerce — informe unificado para enseñar kit ads + tienda.",
      action: "Kickoff ecommerce ?focus=meta",
    },
    {
      order: 3,
      screen: "Informe ecommerce",
      url: "/dashboard/ecommerce-growth",
      say: "ROAS demo, carrito abandonado, secciones Meta resaltadas — entrega lista para el cliente final.",
      action: "Mostrar complemento pack padre",
    },
    {
      order: 4,
      screen: "OS operativo",
      url: "/os/packs",
      say: "Tu equipo opera aquí; el cliente solo ve /packs y portal.",
      action: "Comparar vistas operador vs cliente",
    },
    {
      order: 5,
      screen: "Preflight + OS catalog",
      url: "/api/os/core/catalog?view=summary",
      say: "Antes de cada demo: script preflight 60s — login, kickoff, catalog API.",
      action: "node scripts/staging-demo-preflight.mjs",
    },
  ],
};

export const DEMO_AUDIENCE_SCRIPTS: Record<DemoAudience, DemoScript> = {
  local_business: DEMO_SCRIPT_LOCAL_BUSINESS,
  saas_b2b: DEMO_SCRIPT_SAAS_B2B,
  agency: DEMO_SCRIPT_AGENCY,
};

export function getDemoScript(audience: DemoAudience): DemoScript {
  return DEMO_AUDIENCE_SCRIPTS[audience];
}
