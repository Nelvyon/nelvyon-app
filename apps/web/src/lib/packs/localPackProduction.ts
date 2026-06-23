import type { AutonomousSku } from "../../../../../backend/autonomous/types";
import type { SimulationResult } from "../../../../../backend/autonomous/types";

import { enrichPackReportWithDemoContent } from "@/lib/packs/packDemoReportContent";
import { getPackDeliverablesCatalog } from "@/lib/packs/packDeliverablesCatalog";
import type { PackDeliverableInput } from "@/lib/packs/packOsDb";
import type { LocalGrowthPackIntake, PackReport } from "@/lib/packs/types";
import { LOCAL_GROWTH_PACK_ID } from "@/lib/packs/types";

export const LOCAL_PACK_CATALOG_TITLES = getPackDeliverablesCatalog(LOCAL_GROWTH_PACK_ID).map(
  (d) => d.title,
);

export function slugFromBusinessName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function resolvePackAppOrigin(): string {
  const raw =
    process.env.FRONTEND_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (!raw) return "http://127.0.0.1:3000";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw.replace(/\/$/, "");
  return `https://${raw.replace(/\/$/, "")}`;
}

export function resolveLandingLiveUrl(intake: LocalGrowthPackIntake, slug: string, origin: string): string {
  if (intake.website_url?.trim()) {
    const url = intake.website_url.trim();
    return url.startsWith("http") ? url : `https://${url}`;
  }
  return `${origin}/api/packs/local/live/${slug}`;
}

export function resolveBotLiveUrl(slug: string, origin: string): string {
  return `${origin}/api/packs/local/bot/${slug}`;
}

export function resolveSeoReportUrl(slug: string, origin: string): string {
  return `${origin}/api/packs/local/seo/${slug}/report`;
}

export function enrichLocalIntake(intake: LocalGrowthPackIntake): LocalGrowthPackIntake & {
  landing_slug: string;
} {
  const landing_slug = slugFromBusinessName(intake.business_name);
  return { ...intake, landing_slug };
}

export function buildLocalSeoReport(intake: LocalGrowthPackIntake, qaScore: number) {
  return {
    business_name: intake.business_name,
    sector: intake.sector,
    city: intake.city,
    qa_score: qaScore,
    generated_at: new Date().toISOString(),
    visibility_score_demo: 78,
    keywords_geo: [
      { term: `${intake.sector} ${intake.city}`, volume_demo: 880, difficulty: "media", intent: "transaccional" },
      { term: `${intake.primary_cta} ${intake.city}`, volume_demo: 320, difficulty: "baja", intent: "alta" },
      { term: `mejor ${intake.sector} cerca de mí`, volume_demo: 1200, difficulty: "alta", intent: "móvil" },
      { term: `${intake.business_name} opiniones`, volume_demo: 90, difficulty: "baja", intent: "marca" },
    ],
    google_business: {
      status: "recomendado",
      completeness_demo: "62%",
      actions: [
        "Completar ficha Google con categoría principal",
        "Subir 8+ fotos de local y equipo",
        "Activar mensajes y botón de reserva",
        "Solicitar 5 reseñas en las primeras 2 semanas",
      ],
    },
    on_page: [
      { page: "/", issue: "Meta title local con ciudad", priority: "high", fix: `Incluir «${intake.city}» y CTA` },
      { page: "/", issue: "Schema LocalBusiness", priority: "medium", fix: "JSON-LD con dirección y horario" },
      { page: "/contacto", issue: "CTA visible móvil sin scroll", priority: "high", fix: "Sticky bar «" + intake.primary_cta + "»" },
      { page: "/servicios", issue: "Página de servicios ausente", priority: "medium", fix: "Landing por servicio estrella" },
    ],
    competitors_demo: [
      { name: `Competidor A · ${intake.city}`, gap: "Más reseñas Google" },
      { name: `Competidor B · ${intake.city}`, gap: "Blog local activo" },
    ],
    plan_30d: [
      { week: 1, action: "Publicar landing live y enviar sitemap" },
      { week: 2, action: "Optimizar ficha Google + 2 posts" },
      { week: 3, action: "Publicar página /servicios + FAQ schema" },
      { week: 4, action: "Revisión rankings y ajuste on-page" },
    ],
    recommendations: [
      { action: "Crear 2 landings barrio/zona", impact: "Captar long-tail geo de baja competencia" },
      { action: "Enlazar desde directorios locales", impact: "Señales NAP y autoridad local" },
    ],
  };
}

export function buildLocalChatbotConfig(intake: LocalGrowthPackIntake) {
  return {
    bot_name: `Asistente ${intake.business_name}`,
    sector: intake.sector,
    city: intake.city,
    primary_cta: intake.primary_cta,
    booking_enabled: true,
    intents: ["hours", "services", "book_appointment", "location", "handoff_human"],
    faqs: [
      {
        q: "¿Cuál es el horario?",
        a: "Atendemos de lunes a sábado. Reserva tu cita online en segundos.",
      },
      {
        q: "¿Cómo reservo una cita?",
        a: `Pulsa "${intake.primary_cta}" en la landing o usa el formulario de este chat.`,
      },
      {
        q: "¿Dónde estáis?",
        a: `Estamos en ${intake.city}. Te enviamos la ubicación exacta al confirmar.`,
      },
    ],
  };
}

export type WelcomeTouch = {
  touch: number;
  delay_hours: number;
  subject: string;
  preview: string;
  body_text: string;
};

export function buildWelcomeEmailSequence(intake: LocalGrowthPackIntake): WelcomeTouch[] {
  const name = intake.contact_name?.trim() || intake.business_name;
  return [
    {
      touch: 1,
      delay_hours: 0,
      subject: `Bienvenido/a a ${intake.business_name}`,
      preview: "Gracias por confiar en nosotros",
      body_text: `Hola ${name},\n\nGracias por dar el primer paso con ${intake.business_name}. En las próximas horas activaremos tu landing y chatbot de citas.\n\nCTA: ${intake.primary_cta}\n\n— Equipo ${intake.business_name}`,
    },
    {
      touch: 2,
      delay_hours: 24,
      subject: `${intake.primary_cta} — te lo ponemos fácil`,
      preview: "Reserva en 2 clics",
      body_text: `Hola ${name},\n\nYa puedes ${intake.primary_cta.toLowerCase()} desde nuestra web. Si tienes dudas, responde a este email.\n\nPropuesta de valor: ${intake.value_proposition}\n\n— ${intake.business_name}`,
    },
    {
      touch: 3,
      delay_hours: 72,
      subject: `Tu sistema local en ${intake.city} está listo`,
      preview: "Revisa tus entregables en el portal",
      body_text: `Hola ${name},\n\nTu pack local incluye landing, SEO, chatbot y campaña de bienvenida. Entra al portal para revisar y aprobar entregables.\n\n— ${intake.business_name}`,
    },
  ];
}

export function buildLocalPackReport(params: {
  intake: LocalGrowthPackIntake;
  skuResults: { sku: string; qa_score: number; passed: boolean }[];
  saasClientId: number;
  saasCampaignId: number;
  landingUrl: string;
  welcomeDispatch: { status: string; touches: number };
}): PackReport {
  const passed = params.skuResults.filter((r) => r.passed);
  const avgQa =
    params.skuResults.length > 0
      ? Math.round(params.skuResults.reduce((a, r) => a + r.qa_score, 0) / params.skuResults.length)
      : 0;

  return enrichPackReportWithDemoContent(
    {
      pack_name: "Pack Crecimiento Local",
      pack_id: LOCAL_GROWTH_PACK_ID,
      business_name: params.intake.business_name,
      sector: params.intake.sector,
      completed_at: new Date().toISOString(),
      summary: `Pack local completado: landing live (${params.landingUrl}), SEO local, chatbot de citas y secuencia bienvenida ${params.welcomeDispatch.touches}-touch (${params.welcomeDispatch.status}).`,
      kpis: {
        deliverables_published: 5,
        avg_qa_score: avgQa,
        skus_passed: passed.length,
        skus_total: params.skuResults.length,
        saas_client_id: params.saasClientId,
        saas_campaign_id: params.saasCampaignId,
        extra_campaigns: 0,
        landing_live_url: params.landingUrl,
        welcome_email_status: params.welcomeDispatch.status,
        welcome_touches: params.welcomeDispatch.touches,
      },
      sku_results: params.skuResults.map((r) => ({
        sku: r.sku,
        qa_score: r.qa_score,
        passed: r.passed,
        escalated: false,
        deliverable_ids: [],
      })),
      next_steps: [
        "Revisar landing live y aprobar en portal",
        "Conectar dominio propio y pixel GA4",
        "Lanzar campaña Google/Meta local (playbook D1)",
        "Activar automatización lead → email → CRM",
      ],
      portal_path: "/portal",
    },
    params.intake,
    params.intake.catalog_focus,
  );
}

export function mapLocalSkuDeliverable(params: {
  sku: AutonomousSku;
  simulation: SimulationResult;
  intake: LocalGrowthPackIntake & { landing_slug: string };
  packRunId: string;
  osClientId: string;
  osProjectId: string;
  workspaceId: number;
}): PackDeliverableInput | null {
  const origin = resolvePackAppOrigin();
  const slug = params.intake.landing_slug;
  const qaScore = params.simulation.project.qa?.score ?? 88;
  const base = {
    workspaceId: params.workspaceId,
    clientId: params.osClientId,
    projectId: params.osProjectId,
    visibility: "client_visible" as const,
    metadata: {
      pack_id: LOCAL_GROWTH_PACK_ID,
      pack_run_id: params.packRunId,
      landing_slug: slug,
      production: true,
    },
  };

  switch (params.sku) {
    case "NELVYON-LANDING":
      return {
        ...base,
        title: "Landing web local",
        type: "url",
        file_url: resolveLandingLiveUrl(params.intake, slug, origin),
        metadata: {
          ...base.metadata,
          sku: params.sku,
          qa_score: qaScore,
        },
      };
    case "NELVYON-SEO":
      return {
        ...base,
        title: "Auditoría SEO local",
        type: "json",
        file_url: resolveSeoReportUrl(slug, origin),
        metadata: {
          ...base.metadata,
          sku: params.sku,
          qa_score: qaScore,
          seo_report: buildLocalSeoReport(params.intake, qaScore),
        },
      };
    case "NELVYON-CHATBOT":
      return {
        ...base,
        title: "Chatbot de citas",
        type: "url",
        file_url: resolveBotLiveUrl(slug, origin),
        metadata: {
          ...base.metadata,
          sku: params.sku,
          qa_score: qaScore,
          bot_config: buildLocalChatbotConfig(params.intake),
          booking_enabled: true,
        },
      };
    default:
      return null;
  }
}

export function containsMockUrl(value: unknown): boolean {
  if (typeof value === "string") return value.includes("mock://");
  if (Array.isArray(value)) return value.some(containsMockUrl);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(containsMockUrl);
  }
  return false;
}
