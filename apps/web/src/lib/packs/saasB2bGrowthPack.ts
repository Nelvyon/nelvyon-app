import { PACK_REGISTRY } from "@/lib/packs/packRegistry";
import { buildBaseBrief, runGrowthPack } from "@/lib/packs/packOrchestrator";
import type {
  PackReport,
  PackRunRecord,
  SaasB2bGrowthPackIntake,
  SkuRunResult,
} from "@/lib/packs/types";
import { SAAS_B2B_GROWTH_PACK_ID } from "@/lib/packs/types";

const meta = PACK_REGISTRY[SAAS_B2B_GROWTH_PACK_ID];

export function buildSaasB2bBrief(intake: SaasB2bGrowthPackIntake): Record<string, unknown> {
  const base = buildBaseBrief({ ...intake, sector: "saas_b2b" });
  return {
    ...base,
    sector: "saas_b2b",
    b2b: {
      icp_title: intake.icp_title,
      pricing_model: intake.pricing_model ?? "subscription",
      sales_motion: intake.sales_motion ?? "hybrid",
    },
    traffic_source: "linkedin_ads",
    cta_type: "demo_request",
  };
}

function buildPackReport(params: {
  intake: SaasB2bGrowthPackIntake;
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
    pack_id: SAAS_B2B_GROWTH_PACK_ID,
    business_name: params.intake.business_name,
    sector: params.intake.sector,
    completed_at: new Date().toISOString(),
    summary: `${passed.length}/${params.skuResults.length} SKUs + playbook outbound ABM. Landing SaaS y demo bot listos en portal.`,
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
      "Revisar landing y posicionamiento en portal",
      "Activar secuencia nurture B2B en panel SaaS",
      "Ejecutar playbook outbound con ICP definido",
      "Conectar CRM para tracking MQL → SQL",
      "Medir demo requests y pipeline a 30 días",
    ],
    portal_path: "/portal",
  };
}

export async function runSaasB2bGrowthPack(params: {
  workspaceId: number;
  userId: string;
  intake: SaasB2bGrowthPackIntake;
}): Promise<PackRunRecord> {
  const { intake } = params;
  return runGrowthPack({
    workspaceId: params.workspaceId,
    userId: params.userId,
    config: {
      meta,
      intake,
      buildBrief: buildSaasB2bBrief,
      primaryCampaign: (i) => ({
        platform: "email",
        campaign_type: "nurturing",
        name: `Nurture B2B — ${i.business_name}`,
        content: `Secuencia 5-touch: problema → caso de uso → demo → prueba social → CTA demo. ICP: ${i.icp_title}`,
        target_audience: `${i.icp_title} — ${i.city}`,
        status: "ready",
      }),
      extraDeliverables: [
        ({ intake: i, packRunId }) => ({
          stepKey: "outbound_playbook",
          title: "Playbook Outbound / ABM B2B",
          type: "json",
          metadata: {
            pack_id: SAAS_B2B_GROWTH_PACK_ID,
            pack_run_id: packRunId,
            business_name: i.business_name,
            icp_title: i.icp_title,
            sales_motion: i.sales_motion ?? "hybrid",
            pricing_model: i.pricing_model ?? "subscription",
            sequences: [
              {
                name: "LinkedIn connect + value",
                touches: 3,
                channel: "linkedin",
              },
              {
                name: "Email cold — problem agitation",
                touches: 4,
                channel: "email",
              },
              {
                name: "ABM account list — tier 1",
                touches: 5,
                channel: "multi",
              },
            ],
            kpis_to_track: [
              "demo_requests",
              "mql_to_sql_rate",
              "pipeline_created_eur",
              "reply_rate",
              "trial_signups",
            ],
          },
        }),
      ],
      buildReport: buildPackReport,
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
  };
}
