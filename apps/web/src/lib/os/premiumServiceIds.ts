/** Premium OS service identifiers (client-safe; keep in sync with backend/os-agents/constants.ts). */
export const OS_PREMIUM_SERVICE_IDS = [
  "web_premium",
  "ecommerce_premium",
  "seo_premium",
  "ads_premium",
  "branding_premium",
  "voz_premium",
  "bots_premium",
  "personal_digital_premium",
  "advisor_empresarial_premium",
  "canales_comunicaciones_premium",
  "social_media_premium",
  "email_marketing_premium",
  "contenido_copywriting_premium",
  "video_multimedia_premium",
  "3d_contenido_inmersivo_premium",
  "fotografia_producto_premium",
  "diseno_grafico_creatividades_premium",
  "consultoria_automatizacion_premium",
  "integraciones_apis_premium",
  "mantenimiento_web_premium",
  "reputacion_online_orm_premium",
  "formacion_capacitacion_digital_premium",
  "influencer_marketing_premium",
  "landing_premium",
  "funnel_premium",
] as const;

export type OsPremiumServiceId = (typeof OS_PREMIUM_SERVICE_IDS)[number];

export function isPremiumServiceId(id: string): boolean {
  return (OS_PREMIUM_SERVICE_IDS as readonly string[]).includes(id);
}
