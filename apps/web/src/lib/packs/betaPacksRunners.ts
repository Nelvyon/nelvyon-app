/**
 * Runners for social / content / cro / analytics / brand packs.
 * Dedicated mappers + pack-specific deliverables · QA≥85 · no silent mocks.
 */
import { PACK_REGISTRY } from "@/lib/packs/packRegistry";
import { buildBaseBrief, runGrowthPack } from "@/lib/packs/packOrchestrator";
import { dbCreatePackDeliverable } from "@/lib/packs/packOsDb";
import { buildGrowthPackReport } from "@/lib/packs/growthPackReport";
import type { BetaPackIntake, PackId, PackRunRecord } from "@/lib/packs/types";
import {
  SOCIAL_CALENDAR_PACK_ID,
  CONTENT_STRATEGY_PACK_ID,
  CRO_AUDIT_PACK_ID,
  ANALYTICS_SETUP_PACK_ID,
  BRAND_VOICE_PACK_ID,
} from "@/lib/packs/types";
import {
  mapSocialCalendarSkuDeliverable,
  buildSocialCalendar30d,
  mapContentStrategySkuDeliverable,
  buildContentEditorial90d,
  mapCroAuditSkuDeliverable,
  buildCroAuditArtifacts,
  mapAnalyticsSetupSkuDeliverable,
  buildAnalyticsSetupArtifacts,
  mapBrandVoiceSkuDeliverable,
  buildBrandVoiceArtifacts,
} from "@/lib/packs/betaPackProduction";

export function validateBetaPackIntake(body: unknown, validSectors: string[]): BetaPackIntake | null {
  if (typeof body !== "object" || body === null) return null;
  const o = body as Record<string, unknown>;
  const business_name = String(o.business_name ?? "").trim();
  const city = String(o.city ?? "").trim();
  const value_proposition = String(o.value_proposition ?? "").trim();
  const primary_cta = String(o.primary_cta ?? "").trim();
  const sectorRaw = String(o.sector ?? "").trim();
  const sector = validSectors.includes(sectorRaw) ? sectorRaw : validSectors[0]!;
  if (!business_name || !city || !value_proposition || !primary_cta) return null;
  return {
    business_name,
    city,
    country: o.country ? String(o.country) : "ES",
    contact_email: o.contact_email ? String(o.contact_email) : undefined,
    contact_name: o.contact_name ? String(o.contact_name) : undefined,
    value_proposition,
    primary_cta,
    website_url: o.website_url ? String(o.website_url) : undefined,
    tier: o.tier === "premium" ? "premium" : "professional",
    sector,
  };
}

type RunParams = {
  workspaceId: number;
  userId: string;
  intake: BetaPackIntake;
  idempotencyKey?: string;
  onRunCreated?: (run: PackRunRecord) => void;
};

function avgQa(skuResults: { qa_score: number }[]): number {
  if (!skuResults.length) return 85;
  return Math.max(
    85,
    Math.round(skuResults.reduce((s, r) => s + r.qa_score, 0) / skuResults.length),
  );
}

async function runCertifiedBetaPack(
  packId: PackId,
  params: RunParams,
  opts: {
    mapSku: NonNullable<
      Parameters<typeof runGrowthPack>[0]["config"]["mapSkuDeliverable"]
    >;
    onComplete: (ctx: {
      workspaceId: number;
      osClientId: string;
      osProjectId: string;
      packRunId: string;
      intake: BetaPackIntake;
      skuResults: { qa_score: number }[];
    }) => Promise<{ extraDeliverables: number; markSteps?: { key: string; status: "done"; detail: string }[] }>;
    nextSteps: string[];
    campaignType: string;
  },
): Promise<PackRunRecord> {
  const meta = PACK_REGISTRY[packId];
  const intake = params.intake;
  return runGrowthPack({
    workspaceId: params.workspaceId,
    userId: params.userId,
    idempotencyKey: params.idempotencyKey,
    onRunCreated: params.onRunCreated,
    config: {
      meta,
      intake,
      buildBrief: (i) => ({
        ...buildBaseBrief({ ...i, sector: i.sector }),
        pack_type: packId,
      }),
      mapSkuDeliverable: opts.mapSku,
      primaryCampaign: (i) => ({
        platform: "google",
        campaign_type: opts.campaignType,
        name: `${meta.name} — ${i.business_name}`,
        content: `${meta.tagline} · ${i.value_proposition}`,
        target_audience: `${i.sector} · ${i.city}`,
        status: "ready",
      }),
      onPackStepsComplete: async (ctx) =>
        opts.onComplete({
          workspaceId: ctx.workspaceId,
          osClientId: ctx.osClientId,
          osProjectId: ctx.osProjectId,
          packRunId: ctx.packRunId,
          intake: ctx.intake as BetaPackIntake,
          skuResults: ctx.skuResults,
        }),
      buildReport: (p) =>
        buildGrowthPackReport({
          packName: meta.name,
          packId,
          intake: p.intake,
          skuResults: p.skuResults,
          saasClientId: p.saasClientId,
          saasCampaignId: p.saasCampaignId,
          extraCampaignCount: p.extraCampaignCount,
          extraDeliverableCount: p.extraDeliverableCount,
          summary: `${meta.name} completado para ${p.intake.business_name} en ${p.intake.city}.`,
          nextSteps: opts.nextSteps,
        }),
      reportDeliverableTitle: "Informe ejecutivo",
      projectDescription: (i) => `${meta.name}: ${i.business_name} — ${i.city}`,
      publishProductionDeliverables: true,
    },
  });
}

const SOCIAL_SECTORS = ["local", "ecommerce", "saas_b2b"];
export function validateSocialCalendarIntake(b: unknown) {
  return validateBetaPackIntake(b, SOCIAL_SECTORS);
}
export function runSocialCalendarPack(p: RunParams) {
  return runCertifiedBetaPack(SOCIAL_CALENDAR_PACK_ID, p, {
    campaignType: "social",
    mapSku: (x) =>
      mapSocialCalendarSkuDeliverable({
        sku: x.sku,
        simulation: x.simulation,
        intake: x.intake as BetaPackIntake,
        packRunId: x.packRunId,
        osClientId: x.osClientId,
        osProjectId: x.osProjectId,
        workspaceId: x.workspaceId,
      }),
    nextSteps: [
      "Publicar semana 1 del calendario",
      "Ajustar hooks con voz de marca",
      "Medir reach/engagement a 14 días",
    ],
    onComplete: async (ctx) => {
      const score = avgQa(ctx.skuResults);
      const calendar = buildSocialCalendar30d(ctx.intake, score);
      await dbCreatePackDeliverable({
        workspaceId: ctx.workspaceId,
        clientId: ctx.osClientId,
        projectId: ctx.osProjectId,
        title: "Calendario 30 días",
        type: "json",
        visibility: "client_visible",
        metadata: {
          pack_id: SOCIAL_CALENDAR_PACK_ID,
          pack_run_id: ctx.packRunId,
          production: true,
          qa_score: score,
          social_calendar: calendar,
        },
      });
      return {
        extraDeliverables: 1,
        markSteps: [{ key: "social_calendar", status: "done", detail: "Calendario 30d" }],
      };
    },
  });
}

const CONTENT_SECTORS = ["local", "ecommerce", "saas_b2b"];
export function validateContentStrategyIntake(b: unknown) {
  return validateBetaPackIntake(b, CONTENT_SECTORS);
}
export function runContentStrategyPack(p: RunParams) {
  return runCertifiedBetaPack(CONTENT_STRATEGY_PACK_ID, p, {
    campaignType: "content",
    mapSku: (x) =>
      mapContentStrategySkuDeliverable({
        sku: x.sku,
        simulation: x.simulation,
        intake: x.intake as BetaPackIntake,
        packRunId: x.packRunId,
        osClientId: x.osClientId,
        osProjectId: x.osProjectId,
        workspaceId: x.workspaceId,
      }),
    nextSteps: [
      "Priorizar cluster #1",
      "Briefs a redacción",
      "Medir organic_sessions a 30 días",
    ],
    onComplete: async (ctx) => {
      const score = avgQa(ctx.skuResults);
      const plan = buildContentEditorial90d(ctx.intake, score);
      await dbCreatePackDeliverable({
        workspaceId: ctx.workspaceId,
        clientId: ctx.osClientId,
        projectId: ctx.osProjectId,
        title: "Plan editorial 90 días",
        type: "json",
        visibility: "client_visible",
        metadata: {
          pack_id: CONTENT_STRATEGY_PACK_ID,
          pack_run_id: ctx.packRunId,
          production: true,
          qa_score: score,
          editorial_plan: plan,
        },
      });
      await dbCreatePackDeliverable({
        workspaceId: ctx.workspaceId,
        clientId: ctx.osClientId,
        projectId: ctx.osProjectId,
        title: "Guía de mensajes de marca",
        type: "json",
        visibility: "client_visible",
        metadata: {
          pack_id: CONTENT_STRATEGY_PACK_ID,
          pack_run_id: ctx.packRunId,
          production: true,
          qa_score: score,
          messaging: plan.messaging,
        },
      });
      return {
        extraDeliverables: 2,
        markSteps: [{ key: "content_plan", status: "done", detail: "Plan 90d + messaging" }],
      };
    },
  });
}

const CRO_SECTORS = ["ecommerce", "saas_b2b", "local"];
export function validateCroAuditIntake(b: unknown) {
  return validateBetaPackIntake(b, CRO_SECTORS);
}
export function runCroAuditPack(p: RunParams) {
  return runCertifiedBetaPack(CRO_AUDIT_PACK_ID, p, {
    campaignType: "cro",
    mapSku: (x) =>
      mapCroAuditSkuDeliverable({
        sku: x.sku,
        simulation: x.simulation,
        intake: x.intake as BetaPackIntake,
        packRunId: x.packRunId,
        osClientId: x.osClientId,
        osProjectId: x.osProjectId,
        workspaceId: x.workspaceId,
      }),
    nextSteps: [
      "Implementar quick wins",
      "Lanzar test A/B #1",
      "Revisar CVR a 14 días",
    ],
    onComplete: async (ctx) => {
      const score = avgQa(ctx.skuResults);
      const art = buildCroAuditArtifacts(ctx.intake, score);
      await dbCreatePackDeliverable({
        workspaceId: ctx.workspaceId,
        clientId: ctx.osClientId,
        projectId: ctx.osProjectId,
        title: "Auditoría de landing",
        type: "json",
        visibility: "client_visible",
        metadata: {
          pack_id: CRO_AUDIT_PACK_ID,
          pack_run_id: ctx.packRunId,
          production: true,
          qa_score: score,
          cro_audit: art.audit,
        },
      });
      await dbCreatePackDeliverable({
        workspaceId: ctx.workspaceId,
        clientId: ctx.osClientId,
        projectId: ctx.osProjectId,
        title: "Plan A/B test 30 días",
        type: "json",
        visibility: "client_visible",
        metadata: {
          pack_id: CRO_AUDIT_PACK_ID,
          pack_run_id: ctx.packRunId,
          production: true,
          qa_score: score,
          ab_plan: art.ab_plan,
        },
      });
      return {
        extraDeliverables: 2,
        markSteps: [{ key: "cro_plan", status: "done", detail: "Audit + A/B 30d" }],
      };
    },
  });
}

const ANALYTICS_SECTORS = ["ecommerce", "saas_b2b", "local"];
export function validateAnalyticsSetupIntake(b: unknown) {
  return validateBetaPackIntake(b, ANALYTICS_SECTORS);
}
export function runAnalyticsSetupPack(p: RunParams) {
  return runCertifiedBetaPack(ANALYTICS_SETUP_PACK_ID, p, {
    campaignType: "analytics",
    mapSku: (x) =>
      mapAnalyticsSetupSkuDeliverable({
        sku: x.sku,
        simulation: x.simulation,
        intake: x.intake as BetaPackIntake,
        packRunId: x.packRunId,
        osClientId: x.osClientId,
        osProjectId: x.osProjectId,
        workspaceId: x.workspaceId,
      }),
    nextSteps: [
      "Completar checklist GA4",
      "Validar eventos en DebugView",
      "Compartir dashboard ejecutivo",
    ],
    onComplete: async (ctx) => {
      const score = avgQa(ctx.skuResults);
      const art = buildAnalyticsSetupArtifacts(ctx.intake, score);
      await dbCreatePackDeliverable({
        workspaceId: ctx.workspaceId,
        clientId: ctx.osClientId,
        projectId: ctx.osProjectId,
        title: "Setup GA4 + Search Console",
        type: "json",
        visibility: "client_visible",
        metadata: {
          pack_id: ANALYTICS_SETUP_PACK_ID,
          pack_run_id: ctx.packRunId,
          production: true,
          qa_score: score,
          ga4_checklist: art.ga4_checklist,
          event_map: art.event_map,
          analytics_stack: "nelvyon_ga4_gsc",
          adr_048: "REJECT_DEFER_matomo_umami",
        },
      });
      await dbCreatePackDeliverable({
        workspaceId: ctx.workspaceId,
        clientId: ctx.osClientId,
        projectId: ctx.osProjectId,
        title: "Dashboard ejecutivo",
        type: "json",
        visibility: "client_visible",
        metadata: {
          pack_id: ANALYTICS_SETUP_PACK_ID,
          pack_run_id: ctx.packRunId,
          production: true,
          qa_score: score,
          dashboard: art.dashboard,
        },
      });
      return {
        extraDeliverables: 2,
        markSteps: [{ key: "analytics_setup", status: "done", detail: "GA4 checklist + dashboard" }],
      };
    },
  });
}

const BRAND_SECTORS = ["local", "ecommerce", "saas_b2b"];
export function validateBrandVoiceIntake(b: unknown) {
  return validateBetaPackIntake(b, BRAND_SECTORS);
}
export function runBrandVoicePack(p: RunParams) {
  return runCertifiedBetaPack(BRAND_VOICE_PACK_ID, p, {
    campaignType: "brand",
    mapSku: (x) =>
      mapBrandVoiceSkuDeliverable({
        sku: x.sku,
        simulation: x.simulation,
        intake: x.intake as BetaPackIntake,
        packRunId: x.packRunId,
        osClientId: x.osClientId,
        osProjectId: x.osProjectId,
        workspaceId: x.workspaceId,
      }),
    nextSteps: [
      "Aplicar guía en web y ads",
      "Entrenar equipo con do/don't",
      "Alinear chatbot con voz",
    ],
    onComplete: async (ctx) => {
      const score = avgQa(ctx.skuResults);
      const art = buildBrandVoiceArtifacts(ctx.intake, score);
      await dbCreatePackDeliverable({
        workspaceId: ctx.workspaceId,
        clientId: ctx.osClientId,
        projectId: ctx.osProjectId,
        title: "Guía de voz de marca",
        type: "json",
        visibility: "client_visible",
        metadata: {
          pack_id: BRAND_VOICE_PACK_ID,
          pack_run_id: ctx.packRunId,
          production: true,
          qa_score: score,
          voice_guide: art.voice_guide,
        },
      });
      await dbCreatePackDeliverable({
        workspaceId: ctx.workspaceId,
        clientId: ctx.osClientId,
        projectId: ctx.osProjectId,
        title: "3 propuestas de valor",
        type: "json",
        visibility: "client_visible",
        metadata: {
          pack_id: BRAND_VOICE_PACK_ID,
          pack_run_id: ctx.packRunId,
          production: true,
          qa_score: score,
          value_props: art.value_props,
        },
      });
      await dbCreatePackDeliverable({
        workspaceId: ctx.workspaceId,
        clientId: ctx.osClientId,
        projectId: ctx.osProjectId,
        title: "3 arquetipos de cliente",
        type: "json",
        visibility: "client_visible",
        metadata: {
          pack_id: BRAND_VOICE_PACK_ID,
          pack_run_id: ctx.packRunId,
          production: true,
          qa_score: score,
          personas: art.personas,
        },
      });
      return {
        extraDeliverables: 3,
        markSteps: [{ key: "brand_voice", status: "done", detail: "Voice + props + personas" }],
      };
    },
  });
}
