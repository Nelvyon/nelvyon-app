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
  /** Underlying growth pack for full orchestration (if available). */
  launchPackId?: PackId;
  kickoffPath?: string;
  reportPath?: string;
  problem: string;
  audience: string;
  inputs: string[];
  outputs: string[];
  accent: string;
  estimatedMinutes: number;
};

export const SERVICE_PACK_CATALOG: ServicePackDefinition[] = [
  {
    id: LOCAL_GROWTH_PACK_ID,
    slug: "local-growth",
    name: "Pack Crecimiento Local",
    tagline: "Landing, SEO local y chatbot de citas para negocios de barrio",
    category: "growth",
    verticals: ["local"],
    availability: "available",
    launchPackId: LOCAL_GROWTH_PACK_ID,
    kickoffPath: "/os/packs/local-growth",
    reportPath: "/dashboard/local-growth",
    problem: "Tu negocio local no aparece donde buscan tus clientes ni convierte visitas web en citas.",
    audience: "Restaurantes, clínicas, gimnasios, belleza, inmobiliarias y servicios de proximidad.",
    inputs: ["Nombre del negocio", "Ciudad", "Propuesta de valor", "CTA principal (ej. reservar cita)"],
    outputs: ["Landing publicada", "Informe SEO local", "Chatbot de citas", "Secuencia email bienvenida", "Informe CEO"],
    accent: "from-emerald-500/10 via-card to-card",
    estimatedMinutes: 8,
  },
  {
    id: ECOMMERCE_GROWTH_PACK_ID,
    slug: "ecommerce-growth",
    name: "Pack Crecimiento Ecommerce",
    tagline: "Tienda, SEO catálogo, chatbot ventas y kit Meta Ads",
    category: "growth",
    verticals: ["ecommerce", "marketplace"],
    availability: "available",
    launchPackId: ECOMMERCE_GROWTH_PACK_ID,
    kickoffPath: "/os/packs/ecommerce-growth",
    reportPath: "/dashboard/ecommerce-growth",
    problem: "Tienes tráfico o catálogo pero no un sistema completo de conversión y retargeting.",
    audience: "Tiendas online, DTC y marketplaces que venden producto físico o digital.",
    inputs: ["Nombre marca", "Categoría producto", "Ticket medio", "Canal principal de tráfico"],
    outputs: ["Landing tienda", "SEO catálogo", "Chatbot ventas", "Kit campañas Meta", "Campaña carrito abandonado"],
    accent: "from-violet-500/10 via-card to-card",
    estimatedMinutes: 10,
  },
  {
    id: SAAS_B2B_GROWTH_PACK_ID,
    slug: "saas-b2b-growth",
    name: "Pack Crecimiento SaaS B2B",
    tagline: "Landing PLG, SEO demand gen, bot demo y playbook outbound",
    category: "growth",
    verticals: ["b2b_saas"],
    availability: "available",
    launchPackId: SAAS_B2B_GROWTH_PACK_ID,
    kickoffPath: "/os/packs/saas-b2b-growth",
    reportPath: "/dashboard/saas-b2b-growth",
    problem: "Tu SaaS necesita pipeline predecible: demos, contenido SEO y secuencias que educan al ICP.",
    audience: "SaaS B2B, DevTools y fintech con motion PLG, sales-led o híbrido.",
    inputs: ["Nombre producto", "Título ICP", "Modelo pricing", "Motion comercial"],
    outputs: ["Landing PLG", "Informe SEO B2B", "Bot demo", "Playbook outbound", "Secuencia nurture 5 emails"],
    accent: "from-sky-500/10 via-card to-card",
    estimatedMinutes: 12,
  },
  {
    id: "seo-local-pack",
    slug: "seo-local",
    name: "Pack SEO Local",
    tagline: "Auditoría, keywords geo y plan de contenidos para aparecer en tu ciudad",
    category: "seo",
    verticals: ["local"],
    availability: "beta",
    launchPackId: LOCAL_GROWTH_PACK_ID,
    kickoffPath: "/os/packs/local-growth?focus=seo",
    reportPath: "/dashboard/local-growth",
    problem: "No rankeas en búsquedas locales ni tienes un plan claro de contenidos geo.",
    audience: "Negocios con ubicación física que dependen de Google Maps y búsqueda local.",
    inputs: ["Dominio o web", "Ciudad y zona", "Servicios principales", "3 competidores locales"],
    outputs: ["Auditoría SEO local", "Mapa keywords", "Plan contenidos 30d", "Checklist on-page"],
    accent: "from-teal-500/10 via-card to-card",
    estimatedMinutes: 6,
  },
  {
    id: "meta-ads-pack",
    slug: "meta-ads",
    name: "Pack Campañas Meta Ads",
    tagline: "Estructura, copies y creatividades para Facebook e Instagram",
    category: "ads",
    verticals: ["local", "ecommerce"],
    availability: "beta",
    launchPackId: ECOMMERCE_GROWTH_PACK_ID,
    kickoffPath: "/os/packs/ecommerce-growth?focus=meta",
    reportPath: "/dashboard/ecommerce-growth",
    problem: "Lanzas ads sin estructura clara, copies probados ni alineación con la landing.",
    audience: "Marcas DTC, ecommerce y negocios locales con presupuesto en Meta.",
    inputs: ["Presupuesto mensual", "Objetivo (leads/ventas)", "URL landing", "Buyer persona"],
    outputs: ["Estructura campaña", "5 variantes copy", "Brief creatividades", "Checklist launch"],
    accent: "from-blue-500/10 via-card to-card",
    estimatedMinutes: 5,
  },
  {
    id: "social-calendar-pack",
    slug: "social-calendar",
    name: "Pack Calendario Redes Sociales",
    tagline: "30 días de contenido con copies listos por red",
    category: "social",
    verticals: ["local", "ecommerce", "b2b_saas", "info_products"],
    availability: "coming_soon",
    problem: "Publicas sin calendario ni coherencia entre redes.",
    audience: "Equipos pequeños que necesitan presencia constante sin agencia full-time.",
    inputs: ["Redes activas", "Pilares de contenido", "Frecuencia", "Tono de marca"],
    outputs: ["Calendario 30d", "Copies por post", "Hashtags", "Informe mensual plantilla"],
    accent: "from-pink-500/10 via-card to-card",
    estimatedMinutes: 4,
  },
  {
    id: "email-welcome-nurture",
    slug: "email-welcome-nurture",
    name: "Pack Email Welcome + Nurturing",
    tagline: "Secuencias automáticas desde el primer contacto hasta la conversión",
    category: "email",
    verticals: ["local", "ecommerce", "b2b_saas", "info_products"],
    availability: "beta",
    launchPackId: LOCAL_GROWTH_PACK_ID,
    kickoffPath: "/os/packs/local-growth?focus=email",
    reportPath: "/dashboard/local-growth",
    problem: "Captas leads pero no tienes secuencias que educan y convierten en autopilot.",
    audience: "Negocios con lista email o registros web que quieren automatizar nurturing.",
    inputs: ["Objetivo funnel", "Tono", "Oferta principal", "Trigger (registro/compra)"],
    outputs: ["Secuencia welcome 3-5 emails", "Subjects A/B", "Mapa automation", "Checklist deliverability"],
    accent: "from-amber-500/10 via-card to-card",
    estimatedMinutes: 5,
  },
  {
    id: "content-strategy-pack",
    slug: "content-strategy",
    name: "Pack Estrategia de Contenidos",
    tagline: "Plan editorial 90 días alineado a SEO y negocio",
    category: "content",
    verticals: ["b2b_saas", "info_products", "ecommerce"],
    availability: "coming_soon",
    problem: "Publicas contenido sin estrategia ni keywords que traigan demanda.",
    audience: "Marcas que quieren inbound predecible con blog, LinkedIn o YouTube.",
    inputs: ["Objetivos negocio", "ICP", "Competidores contenido", "Recursos equipo"],
    outputs: ["Plan 90d", "Clusters temáticos", "Briefs por pieza", "KPIs contenido"],
    accent: "from-orange-500/10 via-card to-card",
    estimatedMinutes: 6,
  },
  {
    id: "cro-audit-pack",
    slug: "cro-audit",
    name: "Pack Auditoría CRO",
    tagline: "Detecta fricción en tu funnel y prioriza tests con impacto",
    category: "cro",
    verticals: ["ecommerce", "b2b_saas", "info_products"],
    availability: "coming_soon",
    problem: "Tienes tráfico pero la conversión está por debajo del benchmark.",
    audience: "Landings, checkout y funnels con volumen suficiente para testear.",
    inputs: ["URL funnel", "Tasa conversión actual", "Objetivo", "Herramientas analytics"],
    outputs: ["Auditoría heurística", "Mapa fricción", "Plan tests A/B", "Quick wins 30d"],
    accent: "from-rose-500/10 via-card to-card",
    estimatedMinutes: 5,
  },
  {
    id: "analytics-setup-pack",
    slug: "analytics-setup",
    name: "Pack Setup Analytics",
    tagline: "GA4, eventos y dashboard ejecutivo listos para decidir",
    category: "analytics",
    verticals: ["local", "ecommerce", "b2b_saas", "generic"],
    availability: "coming_soon",
    problem: "No confías en tus datos o no sabes qué eventos medir.",
    audience: "Equipos que empiezan con GA4 o migraron sin plan de medición.",
    inputs: ["Propiedad GA4", "Eventos negocio clave", "Etapas funnel"],
    outputs: ["Mapa eventos", "Informe template", "Checklist QA tracking"],
    accent: "from-slate-500/10 via-card to-card",
    estimatedMinutes: 4,
  },
  {
    id: "brand-voice-pack",
    slug: "brand-voice",
    name: "Pack Voz de Marca",
    tagline: "Mensajes clave, tono y propuestas de valor consistentes",
    category: "brand",
    verticals: ["local", "ecommerce", "b2b_saas", "generic"],
    availability: "coming_soon",
    problem: "Tu comunicación suena genérica o inconsistente entre canales.",
    audience: "Marcas en rebranding o startups definiendo posicionamiento.",
    inputs: ["Historia marca", "Audiencia", "Competidores", "Valores"],
    outputs: ["Brand voice doc", "3 propuestas valor", "Messaging house", "Do/don't copy"],
    accent: "from-indigo-500/10 via-card to-card",
    estimatedMinutes: 5,
  },
  {
    id: "landing-funnel-pack",
    slug: "landing-funnel",
    name: "Pack Landing + Funnel",
    tagline: "Landing de conversión y mapa funnel completo",
    category: "cro",
    verticals: ["info_products", "b2b_saas", "ecommerce"],
    availability: "beta",
    launchPackId: SAAS_B2B_GROWTH_PACK_ID,
    kickoffPath: "/os/packs/saas-b2b-growth?focus=landing",
    reportPath: "/dashboard/saas-b2b-growth",
    problem: "Necesitas una landing que convierta y un funnel claro post-clic.",
    audience: "Lanzamientos, webinars, lead magnets y trials SaaS.",
    inputs: ["Oferta", "CTA único", "Objeciones", "Prueba social"],
    outputs: ["Landing spec + copy", "Thank-you page", "Mapa funnel", "Checklist CRO"],
    accent: "from-cyan-500/10 via-card to-card",
    estimatedMinutes: 7,
  },
];

export function getServicePack(id: string): ServicePackDefinition | undefined {
  return SERVICE_PACK_CATALOG.find((p) => p.id === id);
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
