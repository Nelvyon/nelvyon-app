import type { PageSection } from "./SaasWebBuilderService";

export type FeaturedEnvatoTemplate = {
  id: string;
  envato_id: string;
  name: string;
  vendor: string;
  headline: string;
  description: string;
  preview_url: string;
  sector: string;
  page_type: string;
  slug: string;
};

/** Committed showcase template — Landrick SaaS (Envato #59963825), adapted by Nelvyon. */
export const FEATURED_ENVATO_TEMPLATE: FeaturedEnvatoTemplate = {
  id: "nelvyon-landrick-saas",
  envato_id: "59963825",
  name: "Landrick SaaS Pro",
  vendor: "Envato Market",
  headline: "Landrick — SaaS & Software Landing Premium",
  description:
    "Plantilla premium Envato adaptada oficialmente por Nelvyon. Hero, features, pricing, testimonios y CTA — lista para publicar.",
  preview_url:
    "https://previews.customer.envatousercontent.com/files/651723762/01_landrick.__large_preview.png",
  sector: "saas_b2b",
  page_type: "landing",
  slug: "inicio-premium",
};

const FEATURED_ID = FEATURED_ENVATO_TEMPLATE.id;

export function getFeaturedEnvatoTemplate(): FeaturedEnvatoTemplate {
  return FEATURED_ENVATO_TEMPLATE;
}

export function listFeaturedEnvatoTemplates(): FeaturedEnvatoTemplate[] {
  return [FEATURED_ENVATO_TEMPLATE];
}

export function buildFeaturedTemplateSections(
  templateId: string,
  companyName = "Tu empresa",
): PageSection[] {
  if (templateId !== FEATURED_ID) {
    throw new Error(`Unknown featured template: ${templateId}`);
  }

  const brand = companyName.trim() || "Tu empresa";

  return [
    {
      id: crypto.randomUUID(),
      type: "hero",
      content: {
        badge: "Plataforma oficial Nelvyon · Plantilla premium",
        headline: `${brand} — marketing con IA de clase mundial`,
        subtitle:
          "Todo en uno: CRM, email, funnels, automatizaciones y agentes IA. Diseño premium inspirado en Landrick (Envato #59963825), adaptado por Nelvyon.",
        ctaLabel: "Empezar gratis",
        ctaUrl: "/auth/register",
        secondaryCtaLabel: "Ver demo",
        secondaryCtaUrl: "#features",
        stats: [
          { value: "59+", label: "Módulos SaaS" },
          { value: "193", label: "Agentes IA" },
          { value: "24+", label: "Plantillas workflow" },
        ],
      },
    },
    {
      id: crypto.randomUUID(),
      type: "text",
      content: {
        heading: "Confían en nosotros",
        body: "Meta · Google · Stripe · WhatsApp · Shopify — integraciones nativas en un solo panel.",
      },
    },
    {
      id: crypto.randomUUID(),
      type: "features",
      content: {
        heading: "Todo lo que necesitas para crecer",
        items: [
          { icon: "👥", title: "CRM & Pipeline", desc: "Contactos, deals y copilot IA por registro." },
          { icon: "📧", title: "Email & Secuencias", desc: "Campañas visuales y drip multicanal." },
          { icon: "⚡", title: "Workflows", desc: "24+ automatizaciones oficiales importables." },
          { icon: "🚀", title: "Funnels & Forms", desc: "Captación, NPS y embudos sin código." },
          { icon: "🤖", title: "Agentes IA", desc: "Especialistas por sector ejecutando tareas reales." },
          { icon: "📊", title: "Analytics CEO", desc: "KPIs, ROAS y salud de cuenta en vivo." },
        ],
      },
    },
    {
      id: crypto.randomUUID(),
      type: "text",
      content: {
        heading: "Cómo funciona",
        body: "1. Importa esta plantilla · 2. Conecta integraciones en /saas/setup · 3. Lanza campañas y automatizaciones el mismo día.",
      },
    },
    {
      id: crypto.randomUUID(),
      type: "cta",
      content: {
        heading: "Planes desde 97€/mes — sin permanencia",
        body: "Starter, Pro y Agency. Todo incluido. Cancela cuando quieras.",
        ctaLabel: "Ver precios",
        ctaUrl: "/pricing",
      },
    },
    {
      id: crypto.randomUUID(),
      type: "text",
      content: {
        heading: "Lo que dicen nuestros clientes",
        body:
          "\"Centralicé CRM, email y automatizaciones en Nelvyon. En una semana tenía funnels, secuencias y pipeline operativos.\" — CEO, Agencia Digital",
      },
    },
    {
      id: crypto.randomUUID(),
      type: "cta",
      content: {
        heading: "¿Listo para el siguiente nivel?",
        body: "Tu landing premium ya está montada. Publica y empieza a captar leads hoy.",
        ctaLabel: "Publicar y captar leads",
        ctaUrl: "#contact",
      },
    },
    {
      id: crypto.randomUUID(),
      type: "contact",
      content: {
        heading: "Contacta con nosotros",
        ctaLabel: "Enviar mensaje",
      },
    },
  ];
}
