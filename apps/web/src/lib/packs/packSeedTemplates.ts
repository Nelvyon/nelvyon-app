/**
 * Inline seed templates for packOrchestrator.
 * These are the first-choice templates per sector (no file-system access needed in Next.js).
 * The full 200-seed library lives in backend/os-agents/seeds/ for Node.js scripts.
 */

export type SectorTemplate = {
  landing_headline: string;
  landing_subheadline: string;
  meta_title: string;
  meta_desc: string;
  chatbot_greeting: string;
  blog_h1_ideas: string[];
};

const TEMPLATES: Record<string, SectorTemplate> = {
  restaurantes: {
    landing_headline: "Sabor auténtico en el corazón de {{city}}",
    landing_subheadline: "{{value_proposition}} — reserva tu mesa hoy",
    meta_title: "{{business_name}} — Restaurante en {{city}} | Reserva online",
    meta_desc: "{{value_proposition}}. Reserva tu mesa en {{city}} de forma rápida y sencilla.",
    chatbot_greeting: "¡Hola! Soy el asistente de {{business_name}}. ¿Quieres reservar una mesa o ver nuestra carta?",
    blog_h1_ideas: [
      "Los mejores platos de temporada en {{city}}",
      "Por qué {{business_name}} es el restaurante favorito de {{city}}",
      "Guía de gastronomía local en {{city}}",
    ],
  },
  clinicas: {
    landing_headline: "Tu salud en manos de los mejores especialistas de {{city}}",
    landing_subheadline: "{{value_proposition}} — pide cita hoy sin esperas",
    meta_title: "{{business_name}} — Clínica en {{city}} | Pide cita",
    meta_desc: "{{value_proposition}} en {{city}}. Especialistas que escuchan. Pide cita sin esperas.",
    chatbot_greeting: "Hola, soy el asistente de {{business_name}}. ¿Necesitas pedir cita o tienes alguna consulta?",
    blog_h1_ideas: [
      "Cómo elegir el médico adecuado en {{city}}",
      "Medicina preventiva: por qué actuar antes de que sea tarde",
      "Los servicios de {{business_name}} que más valoran nuestros pacientes",
    ],
  },
  estetica: {
    landing_headline: "Luce mejor que nunca con los expertos de {{city}}",
    landing_subheadline: "{{value_proposition}} — resultados visibles desde la primera sesión",
    meta_title: "{{business_name}} — Estética en {{city}} | Reservar tratamiento",
    meta_desc: "{{value_proposition}}. Centro de estética en {{city}} con tratamientos personalizados. Reserva online.",
    chatbot_greeting: "¡Hola! Soy el asistente de {{business_name}}. ¿Te ayudo a reservar un tratamiento o tienes alguna pregunta?",
    blog_h1_ideas: [
      "Los tratamientos de estética más populares en {{city}} este año",
      "Cómo cuidar tu piel en casa entre sesiones",
      "Por qué elegir {{business_name}} para tu rutina de belleza",
    ],
  },
  realestate: {
    landing_headline: "Encuentra tu hogar ideal en {{city}} con expertos de confianza",
    landing_subheadline: "{{value_proposition}} — más de 500 propiedades gestionadas",
    meta_title: "{{business_name}} — Inmobiliaria en {{city}} | Tasación gratuita",
    meta_desc: "{{value_proposition}} en {{city}}. Compramos, vendemos y alquilamos con garantías. Tasación gratuita.",
    chatbot_greeting: "Hola, soy el asistente de {{business_name}}. ¿Buscas comprar, vender o alquilar una propiedad en {{city}}?",
    blog_h1_ideas: [
      "Guía para comprar piso en {{city}} en 2024",
      "Cómo valorar tu propiedad en {{city}} al precio justo",
      "Los barrios más demandados de {{city}} este trimestre",
    ],
  },
  retail: {
    landing_headline: "Calidad y precio que no encontrarás en otro sitio en {{city}}",
    landing_subheadline: "{{value_proposition}} — tu tienda de confianza",
    meta_title: "{{business_name}} — Tienda en {{city}} | Ver catálogo",
    meta_desc: "{{value_proposition}} en {{city}}. Productos seleccionados con atención personalizada. Visítanos hoy.",
    chatbot_greeting: "¡Hola! Soy el asistente de {{business_name}}. ¿Buscas algún producto en concreto?",
    blog_h1_ideas: [
      "Novedades en {{business_name}}: lo que no puedes perderte esta temporada",
      "Cómo encontrar el mejor precio sin sacrificar calidad",
      "Los productos más vendidos en {{city}} según nuestros clientes",
    ],
  },
  ecommerce: {
    landing_headline: "Envío en 24h a toda España — calidad garantizada",
    landing_subheadline: "{{value_proposition}} — devoluciones gratis en 30 días",
    meta_title: "{{business_name}} — Tienda online | Comprar con envío rápido",
    meta_desc: "{{value_proposition}}. Envío en 24h. Devolución gratuita. Compra segura en {{business_name}}.",
    chatbot_greeting: "¡Hola! Soy el asistente de {{business_name}}. ¿En qué producto estás interesado/a hoy?",
    blog_h1_ideas: [
      "Guía de compra: cómo elegir el mejor {{value_proposition}}",
      "Novedades en {{business_name}} que no te puedes perder",
      "Por qué nuestros clientes repiten en {{business_name}}",
    ],
  },
  moda: {
    landing_headline: "Moda que te define — colecciones exclusivas",
    landing_subheadline: "{{value_proposition}} — nueva colección disponible",
    meta_title: "{{business_name}} — Moda online España | Nueva colección",
    meta_desc: "{{value_proposition}}. Moda con diseño, calidad y envío rápido. Descubre la colección en {{business_name}}.",
    chatbot_greeting: "¡Hola! Soy el asistente de {{business_name}}. ¿Te ayudo a encontrar tu look perfecto?",
    blog_h1_ideas: [
      "Las tendencias de moda que arrasan esta temporada",
      "Cómo crear un outfit completo con piezas clave de {{business_name}}",
      "Moda sostenible: nuestra filosofía en {{business_name}}",
    ],
  },
  saasb2b: {
    landing_headline: "{{value_proposition}} — empieza gratis hoy",
    landing_subheadline: "Prueba 14 días sin tarjeta de crédito. ROI positivo en los primeros 30 días.",
    meta_title: "{{business_name}} — Software B2B | Prueba gratis 14 días",
    meta_desc: "{{value_proposition}}. Software B2B para equipos de ventas. Prueba {{business_name}} gratis 14 días.",
    chatbot_greeting: "Hola, soy el asistente de {{business_name}}. ¿Quieres ver una demo o hablar con ventas?",
    blog_h1_ideas: [
      "Cómo {{business_name}} ayuda a cerrar más deals en menos tiempo",
      "La guía definitiva para automatizar tu proceso de ventas B2B",
      "Casos de éxito: empresas que crecen con {{business_name}}",
    ],
  },
  consultoria: {
    landing_headline: "Resultados medibles para tu negocio — no solo estrategia",
    landing_subheadline: "{{value_proposition}} — primera sesión diagnóstico gratuita",
    meta_title: "{{business_name}} — Consultoría en {{city}} | Primera sesión gratis",
    meta_desc: "{{value_proposition}}. Consultoría empresarial en {{city}} orientada a resultados. Primera sesión gratuita.",
    chatbot_greeting: "Hola, soy el asistente de {{business_name}}. ¿En qué reto empresarial puedo ayudarte?",
    blog_h1_ideas: [
      "Los 5 errores más comunes en empresas que quieren crecer",
      "Cómo elegir el consultor adecuado para tu etapa de negocio",
      "Metodología {{business_name}}: resultados en 90 días",
    ],
  },
  fintech: {
    landing_headline: "Finanzas inteligentes para empresas que crecen",
    landing_subheadline: "{{value_proposition}} — abre tu cuenta gratis hoy",
    meta_title: "{{business_name}} — Fintech para empresas | Abre cuenta gratis",
    meta_desc: "{{value_proposition}}. Gestión financiera automatizada para PYMEs y startups. Sin comisiones ocultas.",
    chatbot_greeting: "Hola, soy el asistente de {{business_name}}. ¿En qué puedo ayudarte con tu gestión financiera?",
    blog_h1_ideas: [
      "Cómo mejorar el cashflow de tu empresa en 30 días",
      "Fintech vs banca tradicional: ¿qué elige tu empresa en 2024?",
      "La solución financiera que tu contable también aprecia",
    ],
  },
};

export function getTemplate(sectorId: string): SectorTemplate | null {
  const direct = TEMPLATES[sectorId];
  if (direct) return direct;
  // Try normalized sector id
  const norm = sectorId.toLowerCase().replace(/[^a-z]/g, "");
  for (const [key, tpl] of Object.entries(TEMPLATES)) {
    if (key.replace(/[^a-z]/g, "") === norm) return tpl;
  }
  return null;
}

export function applyTemplate(
  template: SectorTemplate,
  intake: {
    business_name: string;
    city?: string;
    value_proposition?: string;
    primary_cta?: string;
  },
): SectorTemplate {
  function fill(s: string): string {
    return s
      .replace(/\{\{business_name\}\}/g, intake.business_name)
      .replace(/\{\{city\}\}/g, intake.city ?? "tu ciudad")
      .replace(/\{\{value_proposition\}\}/g, intake.value_proposition ?? "calidad y servicio")
      .replace(/\{\{primary_cta\}\}/g, intake.primary_cta ?? "Contáctanos");
  }
  return {
    landing_headline: fill(template.landing_headline),
    landing_subheadline: fill(template.landing_subheadline),
    meta_title: fill(template.meta_title),
    meta_desc: fill(template.meta_desc),
    chatbot_greeting: fill(template.chatbot_greeting),
    blog_h1_ideas: template.blog_h1_ideas.map(fill),
  };
}

/** Get a personalized template for the sector or null if unsupported. */
export function personalizeForSector(
  sectorId: string,
  intake: {
    business_name: string;
    city?: string;
    value_proposition?: string;
    primary_cta?: string;
  },
): (SectorTemplate & { personalized: true; sector_id: string }) | null {
  const tpl = getTemplate(sectorId);
  if (!tpl) return null;
  return { ...applyTemplate(tpl, intake), personalized: true, sector_id: sectorId };
}
