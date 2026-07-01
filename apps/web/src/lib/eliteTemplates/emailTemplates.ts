import type { CampaignCreateInput } from "@/features/campaigns/types";

import type { EliteSectorGroup, EliteTemplateCard } from "@/lib/eliteTemplates/types";

export const EMAIL_OS_PREVIEW = "/os/email-marketing-premium/preview";

export type EmailSequenceStep = {
  day: number;
  subject: string;
  goal: string;
};

export type EmailElitePreset = EliteTemplateCard & {
  campaignName: string;
  campaignType: "nurturing" | "conversion" | "retention" | "awareness";
  targetAudience: string;
  contentBrief: string;
  sequence: EmailSequenceStep[];
};

const presets: EmailElitePreset[] = [
  {
    id: "email-local-welcome",
    sector: "restaurant",
    sectorGroup: "local",
    label: "Local · bienvenida",
    tagline: "3 emails: bienvenida → valor → reserva",
    templateId: "email-welcome-local-v1",
    previewPath: EMAIL_OS_PREVIEW,
    campaignName: "Bienvenida · negocio local",
    campaignType: "nurturing",
    targetAudience: "Nuevos contactos en zona de influencia",
    contentBrief: "Plantilla email-welcome-local-v1 · sector:restaurant",
    sequence: [
      { day: 0, subject: "Bienvenido — aquí empieza tu experiencia", goal: "Apertura y confianza" },
      { day: 2, subject: "Lo que nos hace diferentes", goal: "Propuesta de valor" },
      { day: 5, subject: "Reserva tu visita con un clic", goal: "Conversión reserva" },
    ],
  },
  {
    id: "email-local-dental",
    sector: "dental",
    sectorGroup: "local",
    label: "Dental · primera cita",
    tagline: "Educación + CTA cita",
    templateId: "email-welcome-local-v1",
    previewPath: EMAIL_OS_PREVIEW,
    campaignName: "Nurture clínica dental",
    campaignType: "conversion",
    targetAudience: "Leads que solicitaron información",
    contentBrief: "Plantilla email-welcome-local-v1 · sector:dental",
    sequence: [
      { day: 0, subject: "Tu salud dental, sin sorpresas", goal: "Educación" },
      { day: 3, subject: "Primera visita: qué incluye", goal: "Reducir fricción" },
      { day: 7, subject: "Reserva tu cita esta semana", goal: "Cita" },
    ],
  },
  {
    id: "email-local-fitness",
    sector: "fitness",
    sectorGroup: "local",
    label: "Gimnasio · prueba gratis",
    tagline: "Activación membresía",
    templateId: "email-welcome-local-v1",
    previewPath: EMAIL_OS_PREVIEW,
    campaignName: "Prueba gratuita gimnasio",
    campaignType: "conversion",
    targetAudience: "Leads interesados en fitness local",
    contentBrief: "Plantilla email-welcome-local-v1 · sector:fitness",
    sequence: [
      { day: 0, subject: "Tu prueba gratuita está lista", goal: "Activación" },
      { day: 2, subject: "Rutina recomendada para empezar", goal: "Engagement" },
      { day: 5, subject: "Últimos días de prueba — oferta", goal: "Membresía" },
    ],
  },
  {
    id: "email-local-realestate",
    sector: "real_estate",
    sectorGroup: "local",
    label: "Inmobiliaria · valoración",
    tagline: "Captación vendedores",
    templateId: "email-welcome-local-v1",
    previewPath: EMAIL_OS_PREVIEW,
    campaignName: "Valoración gratuita inmueble",
    campaignType: "nurturing",
    targetAudience: "Propietarios interesados en vender",
    contentBrief: "Plantilla email-welcome-local-v1 · sector:real_estate",
    sequence: [
      { day: 0, subject: "Valoración sin compromiso", goal: "Lead magnet" },
      { day: 4, subject: "Cómo vendemos más rápido", goal: "Autoridad" },
      { day: 8, subject: "Agenda tu visita de valoración", goal: "Cita" },
    ],
  },
  {
    id: "email-ecom-welcome",
    sector: "ecommerce",
    sectorGroup: "ecommerce",
    label: "Ecommerce · bienvenida",
    tagline: "Onboarding comprador + 10% primera compra",
    templateId: "email-welcome-ecom-v1",
    previewPath: EMAIL_OS_PREVIEW,
    campaignName: "Bienvenida tienda online",
    campaignType: "nurturing",
    targetAudience: "Nuevos suscriptores y compradores",
    contentBrief: "Plantilla email-welcome-ecom-v1 · sector:ecommerce",
    sequence: [
      { day: 0, subject: "Bienvenido — 10% en tu primera compra", goal: "Primera compra" },
      { day: 3, subject: "Los más vendidos esta semana", goal: "Descubrimiento" },
      { day: 7, subject: "Tu código expira pronto", goal: "Urgencia" },
    ],
  },
  {
    id: "email-ecom-cart",
    sector: "dtc_brand",
    sectorGroup: "ecommerce",
    label: "Carrito abandonado",
    tagline: "Recuperación 1h → 24h → 72h (pack Ecommerce)",
    templateId: "email-cart-abandon-v1",
    previewPath: EMAIL_OS_PREVIEW,
    campaignName: "Recuperación carrito abandonado",
    campaignType: "conversion",
    targetAudience: "Carritos abandonados últimas 72h",
    contentBrief: "Plantilla email-cart-abandon-v1 · sector:dtc_brand",
    sequence: [
      { day: 0, subject: "Olvidaste algo en tu carrito", goal: "Recordatorio 1h" },
      { day: 1, subject: "Tu carrito sigue esperándote", goal: "Recordatorio 24h" },
      { day: 3, subject: "Última oportunidad + envío gratis", goal: "Cierre 72h" },
    ],
  },
  {
    id: "email-ecom-postpurchase",
    sector: "marketplace",
    sectorGroup: "ecommerce",
    label: "Post-compra · upsell",
    tagline: "Cross-sell y reseñas",
    templateId: "email-welcome-ecom-v1",
    previewPath: EMAIL_OS_PREVIEW,
    campaignName: "Post-compra marketplace",
    campaignType: "retention",
    targetAudience: "Compradores últimos 14 días",
    contentBrief: "Plantilla email-welcome-ecom-v1 · sector:marketplace",
    sequence: [
      { day: 1, subject: "Gracias por tu pedido", goal: "Confirmación" },
      { day: 5, subject: "Completa tu look con esto", goal: "Cross-sell" },
      { day: 10, subject: "¿Cómo fue tu experiencia?", goal: "Reseña" },
    ],
  },
  {
    id: "email-saas-nurture",
    sector: "saas_b2b",
    sectorGroup: "saas_b2b",
    label: "SaaS B2B · nurture demo",
    tagline: "Demo → caso de uso → SQL (pack SaaS)",
    templateId: "email-nurture-b2b-v1",
    previewPath: EMAIL_OS_PREVIEW,
    campaignName: "Nurture demo SaaS B2B",
    campaignType: "nurturing",
    targetAudience: "Leads MQL que pidieron demo",
    contentBrief: "Plantilla email-nurture-b2b-v1 · sector:saas_b2b",
    sequence: [
      { day: 0, subject: "Tu demo está confirmada", goal: "Confirmación demo" },
      { day: 3, subject: "Caso de uso en empresas como la tuya", goal: "Prueba social" },
      { day: 7, subject: "¿Listo para el siguiente paso?", goal: "SQL" },
    ],
  },
  {
    id: "email-saas-trial",
    sector: "devtools",
    sectorGroup: "saas_b2b",
    label: "DevTools · activación trial",
    tagline: "PLG onboarding técnico",
    templateId: "email-nurture-b2b-v1",
    previewPath: EMAIL_OS_PREVIEW,
    campaignName: "Activación trial DevTools",
    campaignType: "conversion",
    targetAudience: "Usuarios trial día 0–14",
    contentBrief: "Plantilla email-nurture-b2b-v1 · sector:devtools",
    sequence: [
      { day: 0, subject: "Empieza en 5 minutos", goal: "Activación" },
      { day: 4, subject: "Integra con tu stack", goal: "Aha moment" },
      { day: 10, subject: "Tu trial termina pronto", goal: "Upgrade" },
    ],
  },
  {
    id: "email-saas-fintech",
    sector: "fintech_b2b",
    sectorGroup: "saas_b2b",
    label: "Fintech B2B · compliance",
    tagline: "Enterprise nurture seguro",
    templateId: "email-nurture-b2b-v1",
    previewPath: EMAIL_OS_PREVIEW,
    campaignName: "Nurture enterprise fintech",
    campaignType: "nurturing",
    targetAudience: "CFO y finance leads enterprise",
    contentBrief: "Plantilla email-nurture-b2b-v1 · sector:fintech_b2b",
    sequence: [
      { day: 0, subject: "Seguridad y cumplimiento", goal: "Confianza" },
      { day: 5, subject: "ROI en 90 días", goal: "Business case" },
      { day: 12, subject: "Agenda revisión con nuestro equipo", goal: "Demo enterprise" },
    ],
  },
];

export const EMAIL_FEATURED_PRESET = presets.find((p) => p.id === "email-ecom-cart")!;

export function listEmailElitePresets(group?: EliteSectorGroup): EmailElitePreset[] {
  if (!group) return presets;
  return presets.filter((p) => p.sectorGroup === group);
}

export function getEmailElitePreset(id: string): EmailElitePreset | undefined {
  return presets.find((p) => p.id === id);
}

export function buildSaasCampaniaFromPreset(preset: EmailElitePreset): {
  name: string;
  description: string;
  channel: "email";
  subject: string;
  body: string;
  status: "draft";
} {
  const first = preset.sequence[0];
  const sequenceHtml = preset.sequence
    .map((s) => `<li><strong>D+${s.day}:</strong> ${s.subject} — <em>${s.goal}</em></li>`)
    .join("");
  return {
    name: preset.campaignName,
    description: preset.tagline,
    channel: "email",
    subject: first?.subject ?? preset.campaignName,
    body: `<p>${preset.targetAudience}</p><p>${preset.contentBrief}</p><ul>${sequenceHtml}</ul>`,
    status: "draft",
  };
}

export function buildEmailCampaignFromPreset(
  preset: EmailElitePreset,
  clientId: number,
): CampaignCreateInput {
  const sequenceSummary = preset.sequence
    .map((s) => `D+${s.day}: ${s.subject} (${s.goal})`)
    .join("\n");

  return {
    project_id: clientId,
    client_id: clientId,
    platform: "email",
    campaign_type: preset.campaignType,
    name: preset.campaignName,
    content: `${preset.contentBrief}\n\nSecuencia:\n${sequenceSummary}`,
    target_audience: preset.targetAudience,
    status: "draft",
  };
}
