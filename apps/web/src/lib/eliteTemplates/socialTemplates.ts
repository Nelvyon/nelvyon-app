import type { EliteSectorGroup, EliteTemplateCard } from "@/lib/eliteTemplates/types";

export const SOCIAL_OS_PREVIEW = "/os/social-media-premium/preview";

export type SocialElitePreset = EliteTemplateCard & {
  platform: "instagram" | "facebook" | "linkedin" | "tiktok" | "twitter";
  content: string;
  hashtags: string[];
  mediaHint?: string;
};

const presets: SocialElitePreset[] = [
  {
    id: "social-restaurant-promo",
    sector: "restaurant",
    sectorGroup: "local",
    label: "Restaurante · plato del día",
    tagline: "IG/FB · reserva directa",
    templateId: "social-posts-restaurante-v1",
    previewPath: SOCIAL_OS_PREVIEW,
    platform: "instagram",
    content: "🍽️ Plato del día preparado con ingredientes de temporada.\n\nReserva tu mesa — link en bio.",
    hashtags: ["#restaurante", "#platoDelDia", "#gastronomiaLocal"],
    mediaHint: "Foto plato 1080×1080",
  },
  {
    id: "social-clinic-trust",
    sector: "dental",
    sectorGroup: "local",
    label: "Clínica · confianza",
    tagline: "Educación + CTA cita",
    templateId: "social-posts-clinica-v1",
    previewPath: SOCIAL_OS_PREVIEW,
    platform: "instagram",
    content: "✨ Tu sonrisa merece un cuidado sin prisas.\n\nPrimera visita con revisión completa. Escríbenos por DM.",
    hashtags: ["#saludDental", "#clinicaDental", "#sonrisaSana"],
  },
  {
    id: "social-ecom-drop",
    sector: "ecommerce",
    sectorGroup: "ecommerce",
    label: "Ecommerce · lanzamiento",
    tagline: "Stories + feed venta",
    templateId: "social-posts-ecom-v1",
    previewPath: SOCIAL_OS_PREVIEW,
    platform: "instagram",
    content: "🔥 Nuevo drop disponible — stock limitado.\n\nEnvío 24/48h · Compra en el link de la bio.",
    hashtags: ["#nuevo", "#tiendaOnline", "#oferta"],
    mediaHint: "Carrusel producto 1080×1080",
  },
  {
    id: "social-saas-thought",
    sector: "saas",
    sectorGroup: "saas_b2b",
    label: "SaaS · thought leadership",
    tagline: "LinkedIn B2B",
    templateId: "social-posts-saas-b2b-v1",
    previewPath: SOCIAL_OS_PREVIEW,
    platform: "linkedin",
    content: "El crecimiento predecible no viene de más herramientas — viene de un sistema.\n\n¿Tu equipo de marketing opera con datos unificados o con 12 pestañas abiertas?",
    hashtags: ["#SaaS", "#MarketingB2B", "#Growth"],
  },
  {
    id: "social-fitness-trial",
    sector: "fitness",
    sectorGroup: "local",
    label: "Gimnasio · prueba gratis",
    tagline: "Reels / Stories",
    templateId: "social-stories-fitness-v1",
    previewPath: SOCIAL_OS_PREVIEW,
    platform: "tiktok",
    content: "7 días GRATIS 💪 Entrena con nosotros esta semana.\n\nDM \"PRUEBA\" y te activamos el acceso.",
    hashtags: ["#fitness", "#gym", "#entrenamiento"],
    mediaHint: "Vertical 9:16",
  },
  {
    id: "social-realestate-listing",
    sector: "real_estate",
    sectorGroup: "local",
    label: "Inmobiliaria · listing",
    tagline: "LinkedIn + IG",
    templateId: "social-posts-inmobiliaria-v1",
    previewPath: SOCIAL_OS_PREVIEW,
    platform: "linkedin",
    content: "Nueva propiedad disponible en zona premium.\n\n3 hab · 2 baños · terraza · parking.\n\nSolicita visita privada por mensaje directo.",
    hashtags: ["#inmobiliaria", "#vivienda", "#inversion"],
  },
];

export function listSocialElitePresets(group?: EliteSectorGroup): SocialElitePreset[] {
  if (!group) return presets;
  return presets.filter((p) => p.sectorGroup === group);
}

export function getSocialElitePreset(id: string): SocialElitePreset | undefined {
  return presets.find((p) => p.id === id);
}

export function formatSocialPresetContent(preset: SocialElitePreset): string {
  const tags = preset.hashtags.join(" ");
  return `${preset.content}\n\n${tags}`.trim();
}
