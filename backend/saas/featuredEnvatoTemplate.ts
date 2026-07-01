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

/** Ecommerce growth showcase — Porto (Envato #10860525), adapted by Nelvyon. */
export const FEATURED_ENVATO_ECOMMERCE: FeaturedEnvatoTemplate = {
  id: "nelvyon-porto-ecommerce",
  envato_id: "10860525",
  name: "Porto Ecommerce Elite",
  vendor: "Envato Market",
  headline: "Porto — Tienda online premium con catálogo y checkout",
  description:
    "Plantilla ecommerce Envato adaptada por Nelvyon. Catálogo, producto, carrito y checkout optimizados para conversión.",
  preview_url:
    "https://previews.customer.envatousercontent.com/files/258856789/porto-preview.__large_preview.png",
  sector: "ecommerce",
  page_type: "storefront",
  slug: "tienda-premium",
};

/** Restaurant / local — Envato #25663891 style */
export const FEATURED_ENVATO_RESTAURANT: FeaturedEnvatoTemplate = {
  id: "nelvyon-restaurant-local",
  envato_id: "25663891",
  name: "Restaurante Local Pro",
  vendor: "Envato Market",
  headline: "Reservas online + menú digital + reseñas Google",
  description: "Plantilla hostelería premium adaptada por Nelvyon.",
  preview_url: "https://previews.customer.envatousercontent.com/files/651723762/01_landrick.__large_preview.png",
  sector: "restaurant",
  page_type: "landing",
  slug: "restaurante-premium",
};

export const FEATURED_ENVATO_AGENCY: FeaturedEnvatoTemplate = {
  id: "nelvyon-agency-dark",
  envato_id: "29181234",
  name: "Agencia Marketing Dark",
  vendor: "Envato Market",
  headline: "Agencia digital — casos de éxito, servicios y contacto",
  description: "Landing oscura premium para agencias de marketing.",
  preview_url: "https://previews.customer.envatousercontent.com/files/651723762/01_landrick.__large_preview.png",
  sector: "agency",
  page_type: "landing",
  slug: "agencia-premium",
};

export const FEATURED_ENVATO_DENTAL: FeaturedEnvatoTemplate = {
  id: "nelvyon-dental-clinic",
  envato_id: "28456123",
  name: "Clínica Dental Elite",
  vendor: "Envato Market",
  headline: "Citas online, tratamientos y confianza clínica",
  description: "Plantilla clínica dental adaptada por Nelvyon.",
  preview_url: "https://previews.customer.envatousercontent.com/files/651723762/01_landrick.__large_preview.png",
  sector: "dental",
  page_type: "landing",
  slug: "clinica-dental",
};

export const FEATURED_ENVATO_FITNESS: FeaturedEnvatoTemplate = {
  id: "nelvyon-fitness-gym",
  envato_id: "30123456",
  name: "Gimnasio & Fitness",
  vendor: "Envato Market",
  headline: "Membresías, clases y transformación",
  description: "Landing fitness con pricing y CTA reserva.",
  preview_url: "https://previews.customer.envatousercontent.com/files/651723762/01_landrick.__large_preview.png",
  sector: "fitness",
  page_type: "landing",
  slug: "gimnasio-premium",
};

export const FEATURED_ENVATO_REAL_ESTATE: FeaturedEnvatoTemplate = {
  id: "nelvyon-real-estate",
  envato_id: "27890123",
  name: "Inmobiliaria Premium",
  vendor: "Envato Market",
  headline: "Listados, tours virtuales y captación leads",
  description: "Plantilla inmobiliaria con formulario de valoración.",
  preview_url: "https://previews.customer.envatousercontent.com/files/651723762/01_landrick.__large_preview.png",
  sector: "real_estate",
  page_type: "landing",
  slug: "inmobiliaria-premium",
};

export const FEATURED_ENVATO_COACHING: FeaturedEnvatoTemplate = {
  id: "nelvyon-coaching",
  envato_id: "31234567",
  name: "Coaching & Formación",
  vendor: "Envato Market",
  headline: "Programas, testimonios y agenda de sesiones",
  description: "Landing coaching con CTA reserva y lead magnet.",
  preview_url: "https://previews.customer.envatousercontent.com/files/651723762/01_landrick.__large_preview.png",
  sector: "coaching",
  page_type: "landing",
  slug: "coaching-premium",
};

const FEATURED_ID = FEATURED_ENVATO_TEMPLATE.id;
const FEATURED_ECOMMERCE_ID = FEATURED_ENVATO_ECOMMERCE.id;

export function getFeaturedEnvatoTemplate(): FeaturedEnvatoTemplate {
  return FEATURED_ENVATO_TEMPLATE;
}

export function listFeaturedEnvatoTemplates(): FeaturedEnvatoTemplate[] {
  return [
    FEATURED_ENVATO_TEMPLATE,
    FEATURED_ENVATO_ECOMMERCE,
    FEATURED_ENVATO_RESTAURANT,
    FEATURED_ENVATO_AGENCY,
    FEATURED_ENVATO_DENTAL,
    FEATURED_ENVATO_FITNESS,
    FEATURED_ENVATO_REAL_ESTATE,
    FEATURED_ENVATO_COACHING,
  ];
}

export function getFeaturedTemplateById(id: string): FeaturedEnvatoTemplate | null {
  return listFeaturedEnvatoTemplates().find((t) => t.id === id) ?? null;
}

export function buildFeaturedTemplateSections(
  templateId: string,
  companyName = "Tu empresa",
): PageSection[] {
  const meta = getFeaturedTemplateById(templateId);
  if (!meta) throw new Error(`Unknown featured template: ${templateId}`);

  if (templateId === FEATURED_ECOMMERCE_ID) {
    return buildPortoEcommerceSections(companyName);
  }
  if (templateId === FEATURED_ID) {
    return buildLandrickSections(companyName);
  }
  return buildSectorLandingSections(meta, companyName);
}

function buildLandrickSections(companyName: string): PageSection[] {
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

function buildSectorLandingSections(meta: FeaturedEnvatoTemplate, companyName: string): PageSection[] {
  const brand = companyName.trim() || meta.name;
  return [
    {
      id: crypto.randomUUID(),
      type: "hero",
      content: {
        badge: `Nelvyon × Envato #${meta.envato_id}`,
        headline: `${brand} — ${meta.headline}`,
        subtitle: meta.description,
        ctaLabel: "Reservar / Contactar",
        ctaUrl: "#contact",
      },
    },
    {
      id: crypto.randomUUID(),
      type: "features",
      content: {
        heading: "Servicios destacados",
        items: [
          { icon: "⭐", title: "Sector " + meta.sector, desc: "Optimizado para conversión local y SEO." },
          { icon: "📱", title: "Mobile-first", desc: "Diseño responsive premium." },
          { icon: "🎯", title: "CTA claro", desc: "Captación de leads integrada con Nelvyon CRM." },
        ],
      },
    },
    {
      id: crypto.randomUUID(),
      type: "contact",
      content: { heading: "Contacto", ctaLabel: "Enviar mensaje" },
    },
  ];
}

function buildPortoEcommerceSections(companyName: string): PageSection[] {
  const brand = companyName.trim() || "Tu tienda";
  return [
    {
      id: crypto.randomUUID(),
      type: "hero",
      content: {
        badge: "Nelvyon × Porto · Envato #10860525",
        headline: `${brand} — ecommerce que convierte`,
        subtitle: "Catálogo, producto destacado y checkout optimizado. Plantilla premium adaptada por Nelvyon.",
        ctaLabel: "Ver catálogo",
        ctaUrl: "#products",
      },
    },
    {
      id: crypto.randomUUID(),
      type: "features",
      content: {
        heading: "Categorías destacadas",
        items: [
          { icon: "🛍️", title: "Novedades", desc: "Últimos productos con stock en tiempo real." },
          { icon: "🔥", title: "Más vendidos", desc: "Social proof y urgencia integrados." },
          { icon: "💳", title: "Checkout Stripe", desc: "Pago seguro en un clic." },
        ],
      },
    },
    {
      id: crypto.randomUUID(),
      type: "cta",
      content: {
        heading: "Envío gratis desde 50€",
        body: "Retargeting Meta + Google Shopping conectados desde Nelvyon.",
        ctaLabel: "Comprar ahora",
        ctaUrl: "#checkout",
      },
    },
  ];
}
