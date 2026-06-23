import type { AutonomousSku } from "../../../../../backend/autonomous/types";
import type { SimulationResult } from "../../../../../backend/autonomous/types";

import { enrichPackReportWithDemoContent } from "@/lib/packs/packDemoReportContent";
import { getPackDeliverablesCatalog } from "@/lib/packs/packDeliverablesCatalog";
import {
  containsMockUrl,
  resolvePackAppOrigin,
  slugFromBusinessName,
} from "@/lib/packs/localPackProduction";
import type { PackDeliverableInput } from "@/lib/packs/packOsDb";
import type { PackReport, SaasB2bGrowthPackIntake } from "@/lib/packs/types";
import { SAAS_B2B_GROWTH_PACK_ID } from "@/lib/packs/types";

export { containsMockUrl, resolvePackAppOrigin, slugFromBusinessName };

export const SAAS_B2B_PACK_CATALOG_TITLES = getPackDeliverablesCatalog(SAAS_B2B_GROWTH_PACK_ID).map(
  (d) => d.title,
);

export function enrichSaasB2bIntake(intake: SaasB2bGrowthPackIntake): SaasB2bGrowthPackIntake & {
  landing_slug: string;
} {
  const landing_slug = slugFromBusinessName(intake.business_name);
  return { ...intake, landing_slug };
}

export function resolveSaasLandingLiveUrl(
  intake: SaasB2bGrowthPackIntake,
  slug: string,
  origin: string,
): string {
  if (intake.website_url?.trim()) {
    const url = intake.website_url.trim();
    return url.startsWith("http") ? url : `https://${url}`;
  }
  return `${origin}/api/packs/saas-b2b/live/${slug}`;
}

export function resolveSaasBotLiveUrl(slug: string, origin: string): string {
  return `${origin}/api/packs/saas-b2b/bot/${slug}`;
}

export function resolveSaasSeoReportUrl(slug: string, origin: string): string {
  return `${origin}/api/packs/saas-b2b/seo/${slug}/report`;
}

export function resolveSaasPlaybookUrl(slug: string, origin: string): string {
  return `${origin}/api/packs/saas-b2b/playbook/${slug}`;
}

export function buildSaasB2bSeoReport(intake: SaasB2bGrowthPackIntake, qaScore: number) {
  return {
    business_name: intake.business_name,
    sector: intake.sector,
    icp_title: intake.icp_title,
    city: intake.city,
    qa_score: qaScore,
    generated_at: new Date().toISOString(),
    keywords_demand_gen: [
      `${intake.icp_title} software`,
      `SaaS ${intake.business_name}`,
      `${intake.value_proposition} B2B`,
      `demo ${intake.business_name}`,
      `alternativas ${intake.sector}`,
    ],
    content_pillars: [
      "Problema del ICP y coste de inacción",
      "Comparativa vs status quo",
      "Caso de uso por rol (champion / economic buyer)",
      "ROI y time-to-value",
    ],
    plan_30d: [
      "Publicar landing PLG con CTA demo",
      "Indexar páginas comparativa y pricing",
      "Activar nurture B2B post-lead",
      "Medir MQL → demo a 30 días",
    ],
    production: true,
  };
}

export function buildSaasDemoBotConfig(intake: SaasB2bGrowthPackIntake) {
  return {
    bot_name: `Demo Bot — ${intake.business_name}`,
    sector: intake.sector,
    icp_title: intake.icp_title,
    primary_cta: intake.primary_cta,
    demo_qualification: true,
    booking_enabled: true,
    intents: ["product_overview", "qualify_icp", "book_demo", "pricing", "handoff_ae"],
    faqs: [
      {
        q: "¿Para quién es el producto?",
        a: `Diseñado para ${intake.icp_title}. ${intake.value_proposition}`,
      },
      {
        q: "¿Cómo solicito una demo?",
        a: `Pulsa "${intake.primary_cta}" o completa el formulario de calificación.`,
      },
      {
        q: "¿Hay prueba gratuita?",
        a: "Podemos orientarte según tu caso: demo guiada o trial según encaje ICP.",
      },
    ],
  };
}

export function buildOutboundPlaybook(intake: SaasB2bGrowthPackIntake) {
  return {
    business_name: intake.business_name,
    icp_title: intake.icp_title,
    sales_motion: intake.sales_motion ?? "hybrid",
    pricing_model: intake.pricing_model ?? "subscription",
    sequences: [
      { name: "LinkedIn connect + value", touches: 3, channel: "linkedin" },
      { name: "Email cold — problem agitation", touches: 4, channel: "email" },
      { name: "ABM account list — tier 1", touches: 5, channel: "multi" },
    ],
    kpis_to_track: [
      "demo_requests",
      "mql_to_sql_rate",
      "pipeline_created_eur",
      "reply_rate",
      "trial_signups",
    ],
    production: true,
    generated_at: new Date().toISOString(),
  };
}

export type NurtureTouch = {
  touch: number;
  delay_hours: number;
  subject: string;
  preview: string;
  body_text: string;
};

export function buildNurtureEmailSequence(intake: SaasB2bGrowthPackIntake): NurtureTouch[] {
  const name = intake.contact_name?.trim() || intake.business_name;
  return [
    {
      touch: 1,
      delay_hours: 0,
      subject: `El reto de ${intake.icp_title} en 2026`,
      preview: "Por qué importa ahora",
      body_text: `Hola ${name},\n\n${intake.value_proposition}\n\nSi lideras equipos como ${intake.icp_title}, este es el primer paso.\n\n— ${intake.business_name}`,
    },
    {
      touch: 2,
      delay_hours: 48,
      subject: "Caso de uso real (5 min de lectura)",
      preview: "Cómo equipos similares lo resuelven",
      body_text: `Hola ${name},\n\nCompartimos un caso alineado con tu rol: ${intake.icp_title}.\n\nCTA: ${intake.primary_cta}\n\n— ${intake.business_name}`,
    },
    {
      touch: 3,
      delay_hours: 96,
      subject: `Agenda tu demo — ${intake.business_name}`,
      preview: "15 min, sin compromiso",
      body_text: `Hola ${name},\n\n¿Te encaja una demo corta? ${intake.primary_cta}.\n\n— Equipo ${intake.business_name}`,
    },
    {
      touch: 4,
      delay_hours: 144,
      subject: "Prueba social B2B",
      preview: "Resultados de clientes SaaS",
      body_text: `Hola ${name},\n\nEmpresas B2B como la tuya usan ${intake.business_name} para acelerar pipeline.\n\n— ${intake.business_name}`,
    },
    {
      touch: 5,
      delay_hours: 192,
      subject: "Último recordatorio demo",
      preview: "¿Seguimos en contacto?",
      body_text: `Hola ${name},\n\nCerramos el ciclo nurture. Si aún tiene sentido, ${intake.primary_cta.toLowerCase()}.\n\n— ${intake.business_name}`,
    },
  ];
}

export function mapSaasB2bSkuDeliverable(params: {
  sku: AutonomousSku;
  simulation: SimulationResult;
  intake: SaasB2bGrowthPackIntake & { landing_slug: string };
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
      pack_id: SAAS_B2B_GROWTH_PACK_ID,
      pack_run_id: params.packRunId,
      landing_slug: slug,
      production: true,
    },
  };

  switch (params.sku) {
    case "NELVYON-LANDING":
      return {
        ...base,
        title: "Landing product-led",
        type: "url",
        file_url: resolveSaasLandingLiveUrl(params.intake, slug, origin),
        metadata: { ...base.metadata, sku: params.sku, qa_score: qaScore },
      };
    case "NELVYON-SEO":
      return {
        ...base,
        title: "SEO demand gen",
        type: "json",
        file_url: resolveSaasSeoReportUrl(slug, origin),
        metadata: {
          ...base.metadata,
          sku: params.sku,
          qa_score: qaScore,
          seo_report: buildSaasB2bSeoReport(params.intake, qaScore),
        },
      };
    case "NELVYON-CHATBOT":
      return {
        ...base,
        title: "Bot de demo / calificación",
        type: "url",
        file_url: resolveSaasBotLiveUrl(slug, origin),
        metadata: {
          ...base.metadata,
          sku: params.sku,
          qa_score: qaScore,
          bot_config: buildSaasDemoBotConfig(params.intake),
          demo_qualification: true,
        },
      };
    default:
      return null;
  }
}

export function buildSaasB2bPackReport(params: {
  intake: SaasB2bGrowthPackIntake;
  skuResults: { sku: string; qa_score: number; passed: boolean }[];
  saasClientId: number;
  saasCampaignId: number;
  landingUrl: string;
  nurtureDispatch: { status: string; touches: number };
}): PackReport {
  const passed = params.skuResults.filter((r) => r.passed);
  const avgQa =
    params.skuResults.length > 0
      ? Math.round(params.skuResults.reduce((a, r) => a + r.qa_score, 0) / params.skuResults.length)
      : 0;

  return enrichPackReportWithDemoContent(
    {
      pack_name: "Pack Crecimiento SaaS B2B",
      pack_id: SAAS_B2B_GROWTH_PACK_ID,
      business_name: params.intake.business_name,
      sector: params.intake.sector,
      completed_at: new Date().toISOString(),
      summary: `Pack SaaS B2B completado: landing PLG (${params.landingUrl}), SEO demand gen, bot de demo y nurture ${params.nurtureDispatch.touches}-touch (${params.nurtureDispatch.status}). ICP: ${params.intake.icp_title}.`,
      kpis: {
        deliverables_published: 6,
        avg_qa_score: avgQa,
        skus_passed: passed.length,
        skus_total: params.skuResults.length,
        saas_client_id: params.saasClientId,
        saas_campaign_id: params.saasCampaignId,
        extra_campaigns: 0,
        landing_live_url: params.landingUrl,
        nurture_email_status: params.nurtureDispatch.status,
        nurture_touches: params.nurtureDispatch.touches,
      },
      sku_results: params.skuResults.map((r) => ({
        sku: r.sku,
        qa_score: r.qa_score,
        passed: r.passed,
        escalated: false,
        deliverable_ids: [],
      })),
      next_steps: [
        "Revisar landing PLG y aprobar en portal",
        "Activar secuencia nurture B2B en panel SaaS",
        "Ejecutar playbook outbound con ICP definido",
        "Conectar CRM para tracking MQL → SQL",
        "Medir demo requests y pipeline a 30 días",
      ],
      portal_path: "/portal",
    },
    params.intake,
    params.intake.catalog_focus,
  );
}
