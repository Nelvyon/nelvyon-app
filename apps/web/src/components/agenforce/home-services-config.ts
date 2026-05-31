import type { TablerIcon } from "@tabler/icons-react";
import {
  IconBrandGoogle,
  IconPalette,
  IconShoppingCart,
  IconSpeakerphone,
  IconWebhook,
  IconWorld,
} from "@tabler/icons-react";

export type HomeService = {
  title: string;
  desc: string;
  href: string;
  Icon: TablerIcon;
  placeholderLabel: string;
};

export const HOME_SERVICES: HomeService[] = [
  {
    title: "SEO",
    desc: "Estrategia, auditoría y contenidos con pipelines documentados.",
    href: "/seo",
    Icon: IconBrandGoogle,
    placeholderLabel: "SEO",
  },
  {
    title: "Ads",
    desc: "Campañas en Meta, Google y TikTok con operación conectada al CRM.",
    href: "/ads",
    Icon: IconSpeakerphone,
    placeholderLabel: "Ads",
  },
  {
    title: "Branding",
    desc: "Identidad, creatividades y coherencia de marca en todos los canales.",
    href: "/branding",
    Icon: IconPalette,
    placeholderLabel: "Branding",
  },
  {
    title: "Desarrollo Web",
    desc: "Sitios y landings con arquitectura orientada a conversión y operación.",
    href: "/os/web-premium/preview",
    Icon: IconWorld,
    placeholderLabel: "Web",
  },
  {
    title: "Ecommerce",
    desc: "Tiendas, catálogo y operación comercial integrada a la plataforma.",
    href: "/os/ecommerce-premium/preview",
    Icon: IconShoppingCart,
    placeholderLabel: "Ecommerce",
  },
  {
    title: "Automatización",
    desc: "Procesos entre CRM, email, canales y reporting con entregables claros.",
    href: "/servicios",
    Icon: IconWebhook,
    placeholderLabel: "Automatización",
  },
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
