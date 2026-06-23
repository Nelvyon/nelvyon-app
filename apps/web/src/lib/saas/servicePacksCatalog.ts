/** NELVYON SaaS v1.0 — service pack catalog (user-facing). */

import type { BusinessVertical } from "@/lib/os-core/types";
import { getPackOsBinding } from "@/lib/os-core/packOsBridge";
import type { PackId } from "@/lib/packs/types";
import {
  ECOMMERCE_GROWTH_PACK_ID,
  LOCAL_GROWTH_PACK_ID,
  SAAS_B2B_GROWTH_PACK_ID,
} from "@/lib/packs/types";

export type ServicePackCategory =
  | "growth"
  | "seo"
  | "ads"
  | "social"
  | "email"
  | "content"
  | "cro"
  | "analytics"
  | "brand";

export type ServicePackAvailability = "available" | "beta" | "coming_soon";

export type ServicePackDefinition = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: ServicePackCategory;
  verticals: BusinessVertical[];
  availability: ServicePackAvailability;
  benefits: string[];
  launchPackId?: PackId;
  kickoffPath?: string;
  reportPath?: string;
  problem: string;
  audience: string;
  inputs: string[];
  outputs: string[];
  accent: string;
  estimatedMinutes: number;
  demoExample?: string;
};

export const SERVICE_PACK_CATALOG: ServicePackDefinition[] = [
  {
    id: LOCAL_GROWTH_PACK_ID,
    slug: "local-growth",
    name: "Crecimiento Local",
    tagline: "Aparece en Google en tu ciudad y convierte visitas en citas o reservas",
    category: "growth",
    verticals: ["local"],
    availability: "available",
    benefits: [
      "Landing optimizada para móvil con tu CTA principal",
      "SEO local y chatbot de citas 24/7",
      "Secuencia de bienvenida por email",
      "Informe ejecutivo listo para enseñar al cliente",
    ],
    launchPackId: LOCAL_GROWTH_PACK_ID,
    kickoffPath: "/os/packs/local-growth",
    reportPath: "/dashboard/local-growth",
    problem:
      "Tu negocio de barrio no sale cuando te buscan en Google y la web no convierte en llamadas ni reservas.",
    audience: "Restaurantes, clínicas, gimnasios, belleza, inmobiliarias y servicios de proximidad.",
    inputs: ["Nombre del negocio", "Ciudad", "Qué te diferencia", "CTA (reservar, pedir cita, llamar)"],
    outputs: ["Landing publicada", "Informe SEO local", "Chatbot de citas", "3 emails de bienvenida", "Informe CEO"],
    accent: "from-emerald-500/10 via-card to-card",
    estimatedMinutes: 8,
    demoExample: "La Pizzería Napoli · Madrid · Reservar mesa",
  },
  {
    id: ECOMMERCE_GROWTH_PACK_ID,
    slug: "ecommerce-growth",
    name: "Crecimiento Ecommerce",
    tagline: "Tienda que vende, catálogo en Google y retargeting en Meta",
    category: "growth",
    verticals: ["ecommerce", "marketplace"],
    availability: "available",
    benefits: [
      "Landing de tienda con foco en conversión",
      "SEO de catálogo y chatbot de ventas",
      "Kit de campañas Meta Ads listo para activar",
      "Flujo de carrito abandonado configurado",
    ],
    launchPackId: ECOMMERCE_GROWTH_PACK_ID,
    kickoffPath: "/os/packs/ecommerce-growth",
    reportPath: "/dashboard/ecommerce-growth",
    problem: "Tienes producto y tráfico, pero no un sistema que convierta y recupere ventas perdidas.",
    audience: "Tiendas online, marcas DTC y marketplaces con catálogo activo.",
    inputs: ["Nombre de marca", "Categoría de producto", "Ticket medio", "Canal principal (Meta, Google, orgánico)"],
    outputs: ["Landing tienda", "SEO catálogo", "Chatbot ventas", "Kit Meta Ads", "Campaña carrito abandonado"],
    accent: "from-violet-500/10 via-card to-card",
    estimatedMinutes: 10,
    demoExample: "ModaVerde DTC · moda sostenible · Meta Ads",
  },
  {
    id: SAAS_B2B_GROWTH_PACK_ID,
    slug: "saas-b2b-growth",
    name: "Crecimiento SaaS B2B",
    tagline: "Pipeline de demos con landing PLG, SEO y nurture automático",
    category: "growth",
    verticals: ["b2b_saas"],
    availability: "available",
    benefits: [
      "Landing PLG orientada a registro o demo",
      "SEO demand gen para tu ICP",
      "Bot de demo y playbook outbound",
      "Secuencia nurture de 5 emails B2B",
    ],
    launchPackId: SAAS_B2B_GROWTH_PACK_ID,
    kickoffPath: "/os/packs/saas-b2b-growth",
    reportPath: "/dashboard/saas-b2b-growth",
    problem: "Tu SaaS necesita leads cualificados y un funnel claro desde contenido hasta demo cerrada.",
    audience: "SaaS B2B, DevTools y fintech con venta PLG, sales-led o híbrida.",
    inputs: ["Nombre del producto", "Cargo del ICP", "Modelo de pricing", "Motion comercial"],
    outputs: ["Landing PLG", "Informe SEO B2B", "Bot demo", "Playbook outbound", "Nurture 5 emails"],
    accent: "from-sky-500/10 via-card to-card",
    estimatedMinutes: 12,
    demoExample: "FlowMetrics · VP Engineering · trial PLG",
  },
  {
    id: "seo-local-pack",
    slug: "seo-local",
    name: "SEO Local",
    tagline: "Sal en el mapa de tu ciudad: auditoría, keywords y plan de contenidos",
    category: "seo",
    verticals: ["local"],
    availability: "available",
    benefits: [
      "Auditoría SEO geo en lenguaje de negocio",
      "Keywords locales priorizadas con volumen demo",
      "Plan de contenidos 30 días accionable",
      "Se integra en el Pack Crecimiento Local (landing + chatbot + email)",
    ],
    launchPackId: LOCAL_GROWTH_PACK_ID,
    kickoffPath: "/os/packs/local-growth?focus=seo",
    reportPath: "/dashboard/local-growth",
    problem: "Cuando alguien busca tu servicio + tu ciudad, aparece la competencia y tú no.",
    audience: "Negocios con ubicación física: clínicas, talleres, academias, comercios.",
    inputs: ["Web o dominio", "Ciudad y zona", "Servicios estrella", "2–3 competidores locales"],
    outputs: ["Auditoría SEO local", "Mapa de keywords", "Plan contenidos 30d", "Checklist on-page"],
    accent: "from-teal-500/10 via-card to-card",
    estimatedMinutes: 8,
    demoExample: "Clínica Dental Sonrisa · Valencia",
  },
  {
    id: "meta-ads-pack",
    slug: "meta-ads",
    name: "Campañas Meta Ads",
    tagline: "Estructura, copies y creatividades para vender en Facebook e Instagram",
    category: "ads",
    verticals: ["local", "ecommerce"],
    availability: "available",
    benefits: [
      "Estructura de campaña lista para Meta Business",
      "Copies probados para feed y stories",
      "Brief de creatividades para diseño",
      "Incluido en Crecimiento Ecommerce con tienda, SEO y carrito abandonado",
    ],
    launchPackId: ECOMMERCE_GROWTH_PACK_ID,
    kickoffPath: "/os/packs/ecommerce-growth?focus=meta",
    reportPath: "/dashboard/ecommerce-growth",
    problem: "Inviertes en Meta sin estructura clara, mensajes alineados ni landing que convierta el clic.",
    audience: "Ecommerce DTC, tiendas locales con promos y marcas que escalan en paid social.",
    inputs: ["Presupuesto mensual orientativo", "Objetivo (ventas o leads)", "URL de landing", "Buyer persona"],
    outputs: ["Estructura de campaña", "5 variantes de copy", "Brief creatividades", "Checklist de lanzamiento"],
    accent: "from-blue-500/10 via-card to-card",
    estimatedMinutes: 10,
    demoExample: "BeautyBox · 2.000€/mes · ventas DTC",
  },
  {
    id: "email-welcome-nurture",
    slug: "email-welcome-nurture",
    name: "Email Welcome + Nurturing",
    tagline: "Del primer clic al cliente fiel con secuencias automáticas",
    category: "email",
    verticals: ["local", "ecommerce", "b2b_saas", "info_products"],
    availability: "available",
    benefits: [
      "Secuencia welcome de 3 a 5 emails",
      "Subjects listos para test A/B",
      "Mapa de automatización simple",
      "Parte del Pack Crecimiento Local (captación web + chatbot)",
    ],
    launchPackId: LOCAL_GROWTH_PACK_ID,
    kickoffPath: "/os/packs/local-growth?focus=email",
    reportPath: "/dashboard/local-growth",
    problem: "Captas contactos pero no tienes emails que educan, generan confianza y empujan a la acción.",
    audience: "Negocios con formularios web, registros o lista de email sin automatizar.",
    inputs: ["Objetivo del funnel", "Tono de marca", "Oferta principal", "Trigger (registro, compra, lead)"],
    outputs: ["Secuencia welcome", "Subjects A/B", "Mapa automation", "Checklist deliverability"],
    accent: "from-amber-500/10 via-card to-card",
    estimatedMinutes: 8,
    demoExample: "Gimnasio FitBarrio · bienvenida + oferta prueba",
  },
  {
    id: "landing-funnel-pack",
    slug: "landing-funnel",
    name: "Landing + Funnel",
    tagline: "Una landing que convierte y un mapa claro de todo el funnel",
    category: "cro",
    verticals: ["info_products", "b2b_saas", "ecommerce"],
    availability: "available",
    benefits: [
      "Landing con copy de conversión y CTA único",
      "Thank-you page y siguiente paso definido",
      "Mapa funnel TOFU → MOFU → BOFU",
      "Extensión del Pack Crecimiento SaaS B2B (nurture + outbound)",
    ],
    launchPackId: SAAS_B2B_GROWTH_PACK_ID,
    kickoffPath: "/os/packs/saas-b2b-growth?focus=landing",
    reportPath: "/dashboard/saas-b2b-growth",
    problem: "Tienes tráfico o lanzamientos pero la landing no convierte y el post-clic está improvisado.",
    audience: "Webinars, lead magnets, trials SaaS y lanzamientos de producto.",
    inputs: ["Oferta en una frase", "CTA único", "Principal objeción", "Prueba social disponible"],
    outputs: ["Landing + copy", "Thank-you page", "Mapa de funnel", "Checklist CRO"],
    accent: "from-cyan-500/10 via-card to-card",
    estimatedMinutes: 12,
    demoExample: "Webinar «Automatiza tu marketing» · registro gratis",
  },
  {
    id: "social-calendar-pack",
    slug: "social-calendar",
    name: "Calendario Redes Sociales",
    tagline: "30 días de contenido planificado con copies por red",
    category: "social",
    verticals: ["local", "ecommerce", "b2b_saas", "info_products"],
    availability: "coming_soon",
    benefits: [
      "Calendario editorial de 4 semanas",
      "Copies nativos por red",
      "Hashtags y pilares de contenido",
    ],
    problem: "Publicas a pulso sin calendario ni mensaje coherente entre Instagram, LinkedIn y TikTok.",
    audience: "Equipos pequeños que quieren presencia constante sin dedicar horas cada día.",
    inputs: ["Redes activas", "Pilares de contenido", "Frecuencia", "Tono de marca"],
    outputs: ["Calendario 30d", "Copies por post", "Hashtags", "Plantilla informe mensual"],
    accent: "from-pink-500/10 via-card to-card",
    estimatedMinutes: 4,
  },
  {
    id: "content-strategy-pack",
    slug: "content-strategy",
    name: "Estrategia de Contenidos",
    tagline: "Plan editorial 90 días que trae demanda desde Google y redes",
    category: "content",
    verticals: ["b2b_saas", "info_products", "ecommerce"],
    availability: "coming_soon",
    benefits: ["Plan 90 días", "Clusters SEO", "Briefs por artículo", "KPIs de contenido"],
    problem: "Publicas sin estrategia y el contenido no trae leads ni posicionamiento.",
    audience: "Marcas que apuestan por inbound: blog, LinkedIn, YouTube o newsletter.",
    inputs: ["Objetivos de negocio", "ICP", "Competidores de contenido", "Recursos del equipo"],
    outputs: ["Plan 90d", "Clusters temáticos", "Briefs", "KPIs contenido"],
    accent: "from-orange-500/10 via-card to-card",
    estimatedMinutes: 6,
  },
  {
    id: "cro-audit-pack",
    slug: "cro-audit",
    name: "Auditoría CRO",
    tagline: "Encuentra por qué no conviertes y qué testear primero",
    category: "cro",
    verticals: ["ecommerce", "b2b_saas", "info_products"],
    availability: "coming_soon",
    benefits: ["Auditoría heurística", "Mapa de fricción", "Plan de tests A/B", "Quick wins 30d"],
    problem: "Tienes visitas pero la tasa de conversión está por debajo de lo que debería.",
    audience: "Landings, checkout y funnels con volumen para optimizar.",
    inputs: ["URL del funnel", "Conversión actual", "Objetivo", "Herramientas de analytics"],
    outputs: ["Auditoría CRO", "Puntos de fricción", "Plan A/B", "Quick wins"],
    accent: "from-rose-500/10 via-card to-card",
    estimatedMinutes: 5,
  },
  {
    id: "analytics-insights-pack",
    slug: "analytics-insights",
    name: "Analytics Insights",
    tagline: "Un insight accionable desde tu GA4 en menos de 5 minutos",
    category: "analytics",
    verticals: ["local", "ecommerce", "b2b_saas", "generic"],
    availability: "beta",
    benefits: [
      "Canal dominante y distribución de sesiones reales",
      "Detección de landing con gap de conversión",
      "Checklist de eventos GA4 faltantes",
      "Complementa cualquier pack de crecimiento integral",
    ],
    launchPackId: LOCAL_GROWTH_PACK_ID,
    kickoffPath: "/os/packs/analytics-insights",
    reportPath: "/dashboard/analytics-insights",
    problem: "No confías en los datos o no sabes qué optimizar primero en tu web.",
    audience: "Equipos que ya tienen GA4 o quieren el primer informe accionable sin consultoría.",
    inputs: ["Propiedad GA4", "Landing a analizar (opcional)", "Ventana 7/28/90 días"],
    outputs: ["Insight principal", "Informe por canales", "Recomendaciones", "Checklist eventos"],
    accent: "from-slate-500/10 via-card to-card",
    estimatedMinutes: 5,
    demoExample: "Modo demo fixture · o GA4 OAuth conectado",
  },
  {
    id: "analytics-setup-pack",
    slug: "analytics-setup",
    name: "Setup Analytics",
    tagline: "Mide lo que importa: GA4, eventos y dashboard para decidir",
    category: "analytics",
    verticals: ["local", "ecommerce", "b2b_saas", "generic"],
    availability: "coming_soon",
    benefits: ["Mapa de eventos", "Plantilla de informe", "Checklist QA de tracking"],
    problem: "No confías en los datos o no sabes qué eventos configurar en GA4.",
    audience: "Equipos que empiezan con medición o migraron sin plan claro.",
    inputs: ["Propiedad GA4", "Eventos clave del negocio", "Etapas del funnel"],
    outputs: ["Mapa eventos", "Informe template", "Checklist QA"],
    accent: "from-slate-500/10 via-card to-card",
    estimatedMinutes: 4,
  },
  {
    id: "brand-voice-pack",
    slug: "brand-voice",
    name: "Voz de Marca",
    tagline: "Habla con una sola voz en web, ads, email y redes",
    category: "brand",
    verticals: ["local", "ecommerce", "b2b_saas", "generic"],
    availability: "coming_soon",
    benefits: ["Guía de tono", "Propuestas de valor", "Messaging house", "Do/don't de copy"],
    problem: "Tu marca suena distinta en cada canal y no transmites confianza ni diferenciación.",
    audience: "Rebranding, startups definiendo posicionamiento o agencias unificando cliente.",
    inputs: ["Historia de marca", "Audiencia", "Competidores", "Valores"],
    outputs: ["Brand voice", "3 propuestas valor", "Messaging house", "Do/don't"],
    accent: "from-indigo-500/10 via-card to-card",
    estimatedMinutes: 5,
  },
];

export function getServicePack(id: string): ServicePackDefinition | undefined {
  return SERVICE_PACK_CATALOG.find((p) => p.id === id);
}

export function getLaunchableServicePacks(): ServicePackDefinition[] {
  return SERVICE_PACK_CATALOG.filter((p) => p.availability !== "coming_soon");
}

export function getAvailableServicePacks(): ServicePackDefinition[] {
  return SERVICE_PACK_CATALOG.filter((p) => p.availability === "available");
}

export function getServicePacksByCategory(cat: ServicePackCategory): ServicePackDefinition[] {
  return SERVICE_PACK_CATALOG.filter((p) => p.category === cat);
}

export function getServicePackOsSummary(packId: string) {
  const binding = getPackOsBinding(packId);
  if (!binding) return null;
  return {
    agentCount: binding.agentIds.length,
    templateCount: binding.processTemplateIds.length,
    connectorCount: binding.connectorIds.length,
    skus: binding.autonomousSkus ?? [],
  };
}

export const SERVICE_PACK_CATEGORIES: { id: ServicePackCategory; label: string }[] = [
  { id: "growth", label: "Crecimiento integral" },
  { id: "seo", label: "SEO" },
  { id: "ads", label: "Publicidad" },
  { id: "social", label: "Redes sociales" },
  { id: "email", label: "Email marketing" },
  { id: "content", label: "Contenido" },
  { id: "cro", label: "Conversión (CRO)" },
  { id: "analytics", label: "Analítica" },
  { id: "brand", label: "Marca" },
];
