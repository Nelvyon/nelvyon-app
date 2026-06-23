import { enrichBriefWithPackLibrary } from "@/lib/packs/packTemplateLibrary";
import { PACK_REGISTRY } from "@/lib/packs/packRegistry";
import { applyEliteTemplatesToBrief, resolveTemplatesForSector } from "@/lib/packs/packEliteTemplates";
import { buildBaseBrief, runGrowthPack } from "@/lib/packs/packOrchestrator";
import { parseCatalogFocus } from "@/lib/packs/parseCatalogFocus";
import { dbCreatePackDeliverable } from "@/lib/packs/packOsDb";
import {
  buildNurtureEmailSequence,
  buildOutboundPlaybook,
  buildSaasB2bPackReport,
  buildSaasB2bSeoReport,
  enrichSaasB2bIntake,
  mapSaasB2bSkuDeliverable,
  resolvePackAppOrigin,
  resolveSaasLandingLiveUrl,
  resolveSaasPlaybookUrl,
  resolveSaasSeoReportUrl,
} from "@/lib/packs/saasB2bPackProduction";
import {
  dispatchSaasB2bNurtureSequence,
  type NurtureDispatchResult,
} from "@/lib/packs/saasB2bPackNurtureEmail";
import { updatePackRun } from "@/lib/packs/packRunStore";
import type { PackReport, PackRunRecord, SaasB2bGrowthPackIntake } from "@/lib/packs/types";
import { SAAS_B2B_GROWTH_PACK_ID } from "@/lib/packs/types";

const meta = PACK_REGISTRY[SAAS_B2B_GROWTH_PACK_ID];

export function buildSaasB2bBrief(intake: SaasB2bGrowthPackIntake): Record<string, unknown> {
  const enriched = enrichSaasB2bIntake(intake);
  const base = buildBaseBrief({ ...enriched, sector: enriched.sector });
  const origin = resolvePackAppOrigin();
  const landingUrl = resolveSaasLandingLiveUrl(enriched, enriched.landing_slug, origin);

  const withB2b = {
    ...base,
    primary_domain: landingUrl,
    website_url: landingUrl,
    sector: enriched.sector,
    landing_slug: enriched.landing_slug,
    b2b: {
      icp_title: intake.icp_title,
      pricing_model: intake.pricing_model ?? "subscription",
      sales_motion: intake.sales_motion ?? "hybrid",
    },
    traffic_source: "linkedin_ads",
    cta_type: "demo_request",
    bot_name: `Demo Bot — ${intake.business_name}`,
    handoff: {
      destination: intake.contact_email?.trim() || `hola@${enriched.landing_slug}.nelvyon-client.test`,
    },
  };
  return enrichBriefWithPackLibrary(
    applyEliteTemplatesToBrief(withB2b, resolveTemplatesForSector(intake.sector)),
    { pack_id: SAAS_B2B_GROWTH_PACK_ID, sector: intake.sector },
  );
}

export async function runSaasB2bGrowthPack(params: {
  workspaceId: number;
  userId: string;
  intake: SaasB2bGrowthPackIntake;
}): Promise<PackRunRecord> {
  const enriched = enrichSaasB2bIntake(params.intake);
  let nurtureDispatch: NurtureDispatchResult = {
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
      buildBrief: buildSaasB2bBrief,
      reportDeliverableTitle: "Informe ejecutivo",
      publishProductionDeliverables: true,
      primaryCampaign: (i) => ({
        platform: "email",
        campaign_type: "nurturing",
        name: `Nurture B2B — ${i.business_name}`,
        content: JSON.stringify(buildNurtureEmailSequence(i)),
        target_audience: `${i.icp_title} — ${i.city}`,
        status: "ready",
      }),
      mapSkuDeliverable: (p) =>
        mapSaasB2bSkuDeliverable({
          sku: p.sku,
          simulation: p.simulation,
          intake: p.intake as SaasB2bGrowthPackIntake & { landing_slug: string },
          packRunId: p.packRunId,
          osClientId: p.osClientId,
          osProjectId: p.osProjectId,
          workspaceId: p.workspaceId,
        }),
      extraDeliverables: [
        ({ intake: i, packRunId }) => {
          const origin = resolvePackAppOrigin();
          const slug = enrichSaasB2bIntake(i).landing_slug;
          return {
            stepKey: "outbound_playbook",
            title: "Playbook outbound / ABM",
            type: "json",
            file_url: resolveSaasPlaybookUrl(slug, origin),
            metadata: {
              pack_id: SAAS_B2B_GROWTH_PACK_ID,
              pack_run_id: packRunId,
              landing_slug: slug,
              production: true,
              playbook: buildOutboundPlaybook(i),
            },
          };
        },
      ],
      onPackStepsComplete: async (ctx) => {
        nurtureDispatch = await dispatchSaasB2bNurtureSequence({
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          intake: ctx.intake as SaasB2bGrowthPackIntake,
          campaignId: ctx.saasCampaignId,
        });

        await dbCreatePackDeliverable({
          workspaceId: ctx.workspaceId,
          clientId: ctx.osClientId,
          projectId: ctx.osProjectId,
          title: "Secuencia nurture B2B",
          type: "json",
          visibility: "client_visible",
          metadata: {
            pack_id: SAAS_B2B_GROWTH_PACK_ID,
            pack_run_id: ctx.packRunId,
            production: true,
            sequence_touch_count: nurtureDispatch.touches,
            dispatch_status: nurtureDispatch.status,
            emails: buildNurtureEmailSequence(ctx.intake as SaasB2bGrowthPackIntake),
            email_queue_ids: nurtureDispatch.email_ids,
          },
        });

        const intake = ctx.intake as SaasB2bGrowthPackIntake;
        const seoSku = ctx.skuResults.find((r) => r.sku === "NELVYON-SEO");
        if (!seoSku?.deliverable_ids?.length) {
          const origin = resolvePackAppOrigin();
          const qaScore = seoSku?.qa_score ?? 88;
          await dbCreatePackDeliverable({
            workspaceId: ctx.workspaceId,
            clientId: ctx.osClientId,
            projectId: ctx.osProjectId,
            title: "SEO demand gen",
            type: "json",
            file_url: resolveSaasSeoReportUrl(enriched.landing_slug, origin),
            visibility: "client_visible",
            metadata: {
              pack_id: SAAS_B2B_GROWTH_PACK_ID,
              pack_run_id: ctx.packRunId,
              landing_slug: enriched.landing_slug,
              production: true,
              sku: "NELVYON-SEO",
              qa_score: qaScore,
              seo_report: buildSaasB2bSeoReport(intake, qaScore),
            },
          });
        }

        await updatePackRun(ctx.packRunId, {
          intake: { ...ctx.intake, landing_slug: enriched.landing_slug } as typeof ctx.intake,
        });
      },
      buildReport: (p): PackReport => {
        const origin = resolvePackAppOrigin();
        const landingUrl = resolveSaasLandingLiveUrl(
          p.intake as SaasB2bGrowthPackIntake,
          enriched.landing_slug,
          origin,
        );
        return buildSaasB2bPackReport({
          intake: p.intake as SaasB2bGrowthPackIntake,
          skuResults: p.skuResults.map((r) => ({
            sku: r.sku,
            qa_score: r.qa_score,
            passed: r.passed,
          })),
          saasClientId: p.saasClientId,
          saasCampaignId: p.saasCampaignId,
          landingUrl,
          nurtureDispatch,
        });
      },
      projectDescription: (i) =>
        `SaaS B2B pack: landing + SEO demand gen + demo bot + outbound para ICP ${i.icp_title}`,
    },
  });
}

export function validateSaasB2bGrowthIntake(body: unknown): SaasB2bGrowthPackIntake | null {
  if (typeof body !== "object" || body === null) return null;
  const o = body as Record<string, unknown>;
  const sectors = new Set(meta.sectors.map((s) => s.id));
  const sector = String(o.sector ?? "saas_b2b").trim();
  if (!sectors.has(sector)) return null;
  const business_name = String(o.business_name ?? "").trim();
  const city = String(o.city ?? "").trim();
  const value_proposition = String(o.value_proposition ?? "").trim();
  const primary_cta = String(o.primary_cta ?? "").trim();
  const icp_title = String(o.icp_title ?? "").trim();
  if (!business_name || !city || !value_proposition || !primary_cta || !icp_title) return null;
  const pricing = String(o.pricing_model ?? "subscription");
  const motion = String(o.sales_motion ?? "hybrid");
  return {
    business_name,
    sector: sector as SaasB2bGrowthPackIntake["sector"],
    city,
    country: o.country ? String(o.country) : "ES",
    contact_email: o.contact_email ? String(o.contact_email) : undefined,
    contact_name: o.contact_name ? String(o.contact_name) : undefined,
    website_url: o.website_url ? String(o.website_url) : undefined,
    value_proposition,
    primary_cta,
    icp_title,
    pricing_model:
      pricing === "usage" || pricing === "hybrid" ? pricing : "subscription",
    sales_motion:
      motion === "plg" || motion === "sales_led" ? motion : "hybrid",
    tier: o.tier === "premium" ? "premium" : "professional",
    catalog_focus: parseCatalogFocus(o.catalog_focus),
  };
}
