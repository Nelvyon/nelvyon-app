import type { TablerIcon } from "@tabler/icons-react";
import {
  IconBrandGoogle,
  IconChartBar,
  IconMail,
  IconPalette,
  IconShare2,
  IconShoppingCart,
  IconSpeakerphone,
  IconUsers,
  IconWebhook,
  IconWorld,
} from "@tabler/icons-react";

export type HomeService = {
  title: string;
  desc: string;
  href: string;
  Icon: TablerIcon;
  placeholderLabel: string;
  group: "captacion" | "marca" | "operacion";
};

export const HOME_SERVICES: HomeService[] = [
  {
    title: "SEO",
    desc: "Estrategia, auditoría y contenidos con pipelines documentados.",
    href: "/seo",
    Icon: IconBrandGoogle,
    placeholderLabel: "SEO",
    group: "captacion",
  },
  {
    title: "Ads",
    desc: "Campañas en Meta, Google y TikTok con operación conectada al CRM.",
    href: "/ads",
    Icon: IconSpeakerphone,
    placeholderLabel: "Ads",
    group: "captacion",
  },
  {
    title: "Branding",
    desc: "Identidad, creatividades y coherencia de marca en todos los canales.",
    href: "/branding",
    Icon: IconPalette,
    placeholderLabel: "Branding",
    group: "marca",
  },
  {
    title: "Desarrollo Web",
    desc: "Sitios y landings con arquitectura orientada a conversión y operación.",
    href: "/os/web-premium/preview",
    Icon: IconWorld,
    placeholderLabel: "Web",
    group: "marca",
  },
  {
    title: "Ecommerce",
    desc: "Tiendas, catálogo y operación comercial integrada a la plataforma.",
    href: "/os/ecommerce-premium/preview",
    Icon: IconShoppingCart,
    placeholderLabel: "Ecommerce",
    group: "marca",
  },
  {
    title: "Automatización",
    desc: "Procesos entre CRM, email, canales y reporting con entregables claros.",
    href: "/servicios",
    Icon: IconWebhook,
    placeholderLabel: "Automatización",
    group: "operacion",
  },
  {
    title: "Email Marketing",
    desc: "Secuencias, newsletters y nurturing con operación conectada al CRM.",
    href: "/os/email-marketing-premium/preview",
    Icon: IconMail,
    placeholderLabel: "Email",
    group: "captacion",
  },
  {
    title: "Redes Sociales",
    desc: "Contenido, calendario editorial y operación social centralizada.",
    href: "/os/social-media-premium/preview",
    Icon: IconShare2,
    placeholderLabel: "Social",
    group: "captacion",
  },
  {
    title: "Analítica y Reporting",
    desc: "Informes, paneles y seguimiento de actividad por canal y campaña.",
    href: "/saas",
    Icon: IconChartBar,
    placeholderLabel: "Reporting",
    group: "operacion",
  },
  {
    title: "CRM / Operación comercial",
    desc: "Pipeline, contactos, fases comerciales y seguimiento unificado.",
    href: "/saas",
    Icon: IconUsers,
    placeholderLabel: "CRM",
    group: "operacion",
  },
];

export const HOME_SERVICE_GROUPS = [
  { id: "captacion" as const, title: "Captación y demanda", desc: "Atraer tráfico, leads y oportunidades con criterio operativo." },
  { id: "marca" as const, title: "Marca y presencia", desc: "Construir confianza visual y digital antes de convertir." },
  { id: "operacion" as const, title: "Operación comercial", desc: "Automatizar, medir y operar el negocio con continuidad." },
];

export const SAAS_CAPABILITIES = [
  { title: "CRM", desc: "Pipeline, contactos y fases comerciales centralizadas." },
  { title: "Automatizaciones", desc: "Workflows entre CRM, email y canales." },
  { title: "Campañas", desc: "Meta, Google y TikTok con seguimiento operativo." },
  { title: "Reporting", desc: "Paneles e informes de actividad por canal." },
  { title: "Integraciones", desc: "Canales, pagos y herramientas conectadas al entorno." },
] as const;

export const INTEGRATIONS_AVAILABLE = [
  "Meta",
  "Google",
  "TikTok",
  "Instagram",
  "LinkedIn",
  "WhatsApp",
  "Email",
  "Stripe",
  "Shopify",
  "Calendario",
  "Reporting",
] as const;

export const INTEGRATIONS_COMING = ["WooCommerce"] as const;
