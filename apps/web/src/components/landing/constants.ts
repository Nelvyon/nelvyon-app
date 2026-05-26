import { BRAND } from "./shared";

/** @deprecated Use BRAND from ./shared */
export const COLORS = {
  bg: BRAND.bg,
  bgAlt: BRAND.bgAlt,
  card: BRAND.card,
  cardBorder: BRAND.cardBorder,
  primary: BRAND.blue,
  cyan: BRAND.cyan,
  heroGradEnd: BRAND.heroGradEnd,
} as const;

export const LINKS = {
  register: "/register",
  login: "/login",
  precios: "/precios",
  plataforma: "/saas/dashboard",
  contacto: "/contacto",
} as const;

export const STATS = [
  { value: "+10.000", label: "clientes" },
  { value: "25+", label: "servicios" },
  { value: "193", label: "sectores" },
  { value: "24/7", label: "automatizado" },
] as const;

export const TABS = [
  {
    id: "captar",
    label: "Captar",
    title: "Atrae clientes desde el primer día",
    description:
      "SEO, publicidad y presencia digital coordinados por la plataforma para llenar tu embudo sin depender de agencias.",
    features: [
      "SEO y posicionamiento orgánico",
      "Publicidad IA en Google y Meta",
      "Web Builder con diseño profesional",
      "Captación de leads multicanal",
      "Chat en web para conversión",
      "Redes sociales automatizadas",
      "Google Ads optimizado",
      "Meta Ads con creatividades IA",
    ],
  },
  {
    id: "nutrir",
    label: "Nutrir",
    title: "Convierte interés en oportunidades",
    description:
      "Secuencias inteligentes que mantienen el contacto caliente hasta que esté listo para comprar.",
    features: [
      "Email Marketing avanzado",
      "WhatsApp Business integrado",
      "SMS Marketing",
      "CRM con historial completo",
      "Seguimiento automático",
      "Lead scoring con IA",
    ],
  },
  {
    id: "cerrar",
    label: "Cerrar",
    title: "Cierra más ventas en menos tiempo",
    description:
      "Herramientas de venta integradas para que tu equipo cierre sin fricción.",
    features: [
      "Presupuestos IA personalizados",
      "Video llamadas integradas",
      "Dialer con grabación",
      "Pipeline de ventas visual",
      "Firma digital de contratos",
    ],
  },
  {
    id: "fidelizar",
    label: "Fidelizar",
    title: "Retén y multiplica el valor de cada cliente",
    description:
      "Postventa automatizada que genera reseñas, referidos y compras recurrentes.",
    features: [
      "Email postventa automatizado",
      "Reseñas automáticas en Google",
      "Programa de fidelización",
      "Encuestas NPS",
    ],
  },
  {
    id: "escalar",
    label: "Escalar",
    title: "Escala con datos, no con intuición",
    description:
      "Analytics y optimización continua para duplicar lo que funciona.",
    features: [
      "Analytics avanzado en tiempo real",
      "Reportes ejecutivos automáticos",
      "A/B testing integrado",
      "Optimización con tecnología IA",
    ],
  },
] as const;

export const COMPARISON_ROWS = [
  { tool: "SEO y posicionamiento", competitor: "Semrush, Ahrefs", price: "€199/mes" },
  { tool: "Publicidad IA Google+Meta", competitor: "Agencia", price: "€500/mes" },
  { tool: "Email Marketing", competitor: "Klaviyo, Mailchimp", price: "€99/mes" },
  { tool: "CRM y pipeline", competitor: "HubSpot, Salesforce", price: "€169/mes" },
  { tool: "Web Builder", competitor: "Webflow, WordPress", price: "€49/mes" },
  { tool: "Redes sociales", competitor: "Hootsuite, Buffer", price: "€79/mes" },
  { tool: "Dialer y llamadas", competitor: "Aircall, Twilio", price: "€99/mes" },
  { tool: "Video y contenido IA", competitor: "Runway, Canva Pro", price: "€49/mes" },
  { tool: "Analytics avanzado", competitor: "AgencyAnalytics", price: "€79/mes" },
] as const;

export const SERVICES = [
  { name: "SEO Premium", desc: "Posicionamiento orgánico con informes claros" },
  { name: "Google Ads IA", desc: "Campañas optimizadas automáticamente" },
  { name: "Meta Ads IA", desc: "Creatividades y audiencias con IA" },
  { name: "Email Marketing", desc: "Secuencias y newsletters profesionales" },
  { name: "CRM Avanzado", desc: "Pipeline, contactos y actividades" },
  { name: "Web Builder", desc: "Webs listas para convertir" },
  { name: "Social Media", desc: "Publicación y calendario unificado" },
  { name: "Video IA", desc: "Vídeos cortos para ads y redes" },
  { name: "Voz IA", desc: "Llamadas y asistentes de voz" },
  { name: "WhatsApp", desc: "Mensajes y automatizaciones" },
  { name: "SMS Marketing", desc: "Campañas SMS con opt-out" },
  { name: "Dialer", desc: "Llamadas salientes integradas" },
  { name: "Leads", desc: "Captación y enriquecimiento" },
  { name: "Presupuestos IA", desc: "CPQ y propuestas automáticas" },
  { name: "Analytics", desc: "Métricas y dashboards en vivo" },
  { name: "TikTok Ads", desc: "Campañas en TikTok con IA" },
  { name: "Snapchat Ads", desc: "Publicidad en Snapchat" },
  { name: "PR Digital", desc: "Notas de prensa con IA" },
  { name: "LinkedIn Outreach", desc: "Prospección B2B automatizada" },
  { name: "Email Warmup", desc: "Calentamiento de dominio" },
  { name: "Contenido IA", desc: "Copy e imágenes para campañas" },
  { name: "Landing Pages", desc: "Páginas de aterrizaje rápidas" },
  { name: "Funnel Builder", desc: "Embudos visuales sin código" },
  { name: "Reseñas automáticas", desc: "Más reseñas en Google" },
  { name: "Firma digital", desc: "Contratos firmados online" },
] as const;

export const STEPS = [
  {
    n: "01",
    title: "Describe tu negocio",
    desc: "Sector, objetivos y tono en 2 minutos",
  },
  {
    n: "02",
    title: "La plataforma trabaja",
    desc: "Campañas, contenido, web y redes sin esperas",
  },
  {
    n: "03",
    title: "Ves resultados reales",
    desc: "Dashboard en vivo con leads, ventas y conversiones",
  },
] as const;

export const TESTIMONIALS: { name: string; company: string; text: string }[] = [];

export const PLANS = [
  {
    name: "Starter",
    price: "€97",
    period: "/mes",
    users: "Hasta 3 usuarios",
    features: ["Servicios básicos", "Web Builder", "Email + CRM", "Soporte por email"],
    cta: "Elegir plan",
    highlight: false,
  },
  {
    name: "Growth",
    price: "€297",
    period: "/mes",
    users: "Hasta 10 usuarios",
    features: [
      "Todos los servicios",
      "Analytics avanzado",
      "Publicidad IA",
      "Soporte prioritario",
    ],
    cta: "Elegir plan",
    highlight: true,
  },
  {
    name: "Elite",
    price: "€797",
    period: "/mes",
    users: "Usuarios ilimitados",
    features: [
      "Account manager dedicado",
      "SLA prioritario",
      "Acceso API",
      "White-label disponible",
    ],
    cta: "Elegir plan",
    highlight: false,
  },
] as const;

export const INTEGRATIONS = [
  "Google",
  "Meta",
  "TikTok",
  "Shopify",
  "Stripe",
  "WhatsApp",
  "LinkedIn",
  "Slack",
  "Zapier",
  "HubSpot",
  "Mailchimp",
  "WordPress",
  "Klaviyo",
  "Twilio",
  "OpenAI",
  "Canva",
  "Notion",
  "Calendly",
] as const;

export const MISSION_PILLARS = [
  { icon: "◆", title: "TODO EN UNO", desc: "25 herramientas en una sola suscripción" },
  { icon: "◇", title: "IA DE VERDAD", desc: "Automatización que ejecuta, no solo sugiere" },
  { icon: "○", title: "SIN EQUIPO", desc: "Opera como una gran empresa sin contratar agencia" },
] as const;
