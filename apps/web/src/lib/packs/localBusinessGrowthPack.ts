import { PACK_REGISTRY } from "@/lib/packs/packRegistry";
import { applyEliteTemplatesToBrief, resolveTemplatesForSector } from "@/lib/packs/packEliteTemplates";
import { buildBaseBrief, runGrowthPack } from "@/lib/packs/packOrchestrator";
import { dbCreatePackDeliverable } from "@/lib/packs/packOsDb";
import {
  buildLocalPackReport,
  buildWelcomeEmailSequence,
  enrichLocalIntake,
  mapLocalSkuDeliverable,
  resolveLandingLiveUrl,
  resolvePackAppOrigin,
} from "@/lib/packs/localPackProduction";
import {
  dispatchLocalWelcomeSequence,
  type WelcomeDispatchResult,
} from "@/lib/packs/localPackWelcomeEmail";
import { updatePackRun } from "@/lib/packs/packRunStore";
import type {
  LocalGrowthPackIntake,
  PackReport,
  PackRunRecord,
  SkuRunResult,
} from "@/lib/packs/types";
import { LOCAL_GROWTH_PACK_ID } from "@/lib/packs/types";

const meta = PACK_REGISTRY[LOCAL_GROWTH_PACK_ID];

export function buildBriefFromIntake(intake: LocalGrowthPackIntake): Record<string, unknown> {
  const enriched = enrichLocalIntake(intake);
  const base = buildBaseBrief({ ...enriched, sector: enriched.sector });
  const origin = resolvePackAppOrigin();
  const landingUrl = resolveLandingLiveUrl(enriched, enriched.landing_slug, origin);

  const withDomain = {
    ...base,
    primary_domain: landingUrl,
    website_url: landingUrl,
    domain: {
      type: intake.website_url ? "custom" : "hosted",
      host: (() => {
        try {
          return new URL(landingUrl).host;
        } catch {
          return `${enriched.landing_slug}.nelvyon-client.test`;
        }
      })(),
    },
    bot_name: `Asistente ${intake.business_name}`,
    openai_cost_bearer: "client",
    landing_slug: enriched.landing_slug,
    handoff: {
      destination: intake.contact_email?.trim() || `hola@${enriched.landing_slug}.nelvyon-client.test`,
    },
    seed_keywords: [
      `${intake.sector} ${intake.city}`,
      intake.primary_cta,
      intake.business_name,
      `mejor ${intake.sector}`,
      `${intake.city} ${intake.sector}`,
    ],
  };

  return applyEliteTemplatesToBrief(withDomain, resolveTemplatesForSector(intake.sector));
}

export async function runLocalBusinessGrowthPack(params: {
  workspaceId: number;
  userId: string;
  intake: LocalGrowthPackIntake;
}): Promise<PackRunRecord> {
  const enriched = enrichLocalIntake(params.intake);
  let welcomeDispatch: WelcomeDispatchResult = {
    status: "skipped",
    touches: 0,
    email_ids: [],
  };

  return runGrowthPack({
    workspaceId: params.workspaceId,
    userId: params.userId,
    config: {
      meta,
      intake: enriched,
      buildBrief: buildBriefFromIntake,
      reportDeliverableTitle: "Informe ejecutivo",
      publishProductionDeliverables: true,
      primaryCampaign: (i) => ({
        platform: "email",
        campaign_type: "welcome_sequence",
        name: `Bienvenida 3-touch — ${i.business_name}`,
        content: JSON.stringify(buildWelcomeEmailSequence(i)),
        target_audience: `${i.sector} — ${i.city}`,
        status: "ready",
      }),
      mapSkuDeliverable: (p) =>
        mapLocalSkuDeliverable({
          sku: p.sku,
          simulation: p.simulation,
          intake: p.intake as LocalGrowthPackIntake & { landing_slug: string },
          packRunId: p.packRunId,
          osClientId: p.osClientId,
          osProjectId: p.osProjectId,
          workspaceId: p.workspaceId,
        }),
      onPackStepsComplete: async (ctx) => {
        welcomeDispatch = await dispatchLocalWelcomeSequence({
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          intake: ctx.intake as LocalGrowthPackIntake,
          campaignId: ctx.saasCampaignId,
        });

        await dbCreatePackDeliverable({
          workspaceId: ctx.workspaceId,
          clientId: ctx.osClientId,
          projectId: ctx.osProjectId,
          title: "Campaña email de bienvenida",
          type: "json",
          visibility: "client_visible",
          metadata: {
            pack_id: LOCAL_GROWTH_PACK_ID,
            pack_run_id: ctx.packRunId,
            production: true,
            sequence_touch_count: welcomeDispatch.touches,
            dispatch_status: welcomeDispatch.status,
            emails: buildWelcomeEmailSequence(ctx.intake as LocalGrowthPackIntake),
            email_queue_ids: welcomeDispatch.email_ids,
          },
        });

        await updatePackRun(ctx.packRunId, {
          intake: { ...ctx.intake, landing_slug: enriched.landing_slug } as typeof ctx.intake,
        });
      },
      buildReport: (p): PackReport => {
        const origin = resolvePackAppOrigin();
        const landingUrl = resolveLandingLiveUrl(
          p.intake as LocalGrowthPackIntake,
          enriched.landing_slug,
          origin,
        );
        return buildLocalPackReport({
          intake: p.intake as LocalGrowthPackIntake,
          skuResults: p.skuResults.map((r) => ({
            sku: r.sku,
            qa_score: r.qa_score,
            passed: r.passed,
          })),
          saasClientId: p.saasClientId,
          saasCampaignId: p.saasCampaignId,
          landingUrl,
          welcomeDispatch,
        });
      },
      projectDescription: (i) =>
        `Pack local: landing + SEO + chatbot para ${i.sector} en ${i.city}`,
    },
  });
}

export function validateLocalGrowthIntake(body: unknown): LocalGrowthPackIntake | null {
  if (typeof body !== "object" || body === null) return null;
  const o = body as Record<string, unknown>;
  const sectors = new Set(meta.sectors.map((s) => s.id));
  const sector = String(o.sector ?? "").trim();
  if (!sectors.has(sector)) return null;
  const business_name = String(o.business_name ?? "").trim();
  const city = String(o.city ?? "").trim();
  const value_proposition = String(o.value_proposition ?? "").trim();
  const primary_cta = String(o.primary_cta ?? "").trim();
  if (!business_name || !city || !value_proposition || !primary_cta) return null;
  return {
    business_name,
    sector: sector as LocalGrowthPackIntake["sector"],
    city,
    country: o.country ? String(o.country) : "ES",
    contact_email: o.contact_email ? String(o.contact_email) : undefined,
    contact_name: o.contact_name ? String(o.contact_name) : undefined,
    website_url: o.website_url ? String(o.website_url) : undefined,
    value_proposition,
    primary_cta,
    tier: o.tier === "premium" ? "premium" : "professional",
  };
}

/** @deprecated use buildReport via runLocalBusinessGrowthPack */
export function buildPackReport(params: {
  intake: LocalGrowthPackIntake;
  skuResults: SkuRunResult[];
  saasClientId: number;
  saasCampaignId: number;
  extraCampaignCount: number;
  extraDeliverableCount: number;
}): PackReport {
  const passed = params.skuResults.filter((r) => r.passed);
  const avgQa =
    params.skuResults.length > 0
      ? Math.round(
          params.skuResults.reduce((a, r) => a + r.qa_score, 0) / params.skuResults.length,
        )
      : 0;
  const deliverables =
    params.skuResults.reduce((a, r) => a + r.deliverable_ids.length, 0) +
    1 +
    params.extraDeliverableCount;

  return {
    pack_name: meta.name,
    pack_id: LOCAL_GROWTH_PACK_ID,
    business_name: params.intake.business_name,
    sector: params.intake.sector,
    completed_at: new Date().toISOString(),
    summary: `${passed.length}/${params.skuResults.length} servicios autónomos entregados con QA ≥ umbral. Landing, SEO y chatbot listos para revisión en portal.`,
    kpis: {
      deliverables_published: deliverables,
      avg_qa_score: avgQa,
      skus_passed: passed.length,
      skus_total: params.skuResults.length,
      saas_client_id: params.saasClientId,
      saas_campaign_id: params.saasCampaignId,
      extra_campaigns: params.extraCampaignCount,
    },
    sku_results: params.skuResults,
    next_steps: [
      "Revisar entregables en el portal del cliente",
      "Conectar dominio propio y pixel de conversión",
      "Activar campaña de bienvenida por email",
      "Programar revisión SEO a 30 días",
    ],
    portal_path: "/portal",
  };
}
