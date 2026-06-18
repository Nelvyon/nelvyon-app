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
] as const;
