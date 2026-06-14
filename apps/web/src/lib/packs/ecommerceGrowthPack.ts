import { PACK_REGISTRY } from "@/lib/packs/packRegistry";
import { buildBaseBrief, runGrowthPack } from "@/lib/packs/packOrchestrator";
import type {
  EcommerceGrowthPackIntake,
  PackReport,
  PackRunRecord,
  SkuRunResult,
} from "@/lib/packs/types";
import { ECOMMERCE_GROWTH_PACK_ID } from "@/lib/packs/types";

const meta = PACK_REGISTRY[ECOMMERCE_GROWTH_PACK_ID];

export function buildEcommerceBrief(intake: EcommerceGrowthPackIntake): Record<string, unknown> {
  const base = buildBaseBrief({ ...intake, sector: "ecommerce" });
  return {
    ...base,
    sector: "ecommerce",
    ecommerce: {
      product_category: intake.product_category,
      avg_order_value: intake.avg_order_value ?? null,
      primary_channel: intake.primary_channel ?? "meta",
      template: "ads-meta-advantage-ecom-v1",
    },
    traffic_source: intake.primary_channel === "google" ? "google_shopping" : "meta_ads",
    cta_type: "purchase",
  };
}

function buildPackReport(params: {
  intake: EcommerceGrowthPackIntake;
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
    pack_id: ECOMMERCE_GROWTH_PACK_ID,
    business_name: params.intake.business_name,
    sector: params.intake.sector,
    completed_at: new Date().toISOString(),
    summary: `${passed.length}/${params.skuResults.length} SKUs + kit Meta Ads + campaña carrito abandonado. Tienda lista para revisión en portal.`,
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
      "Revisar landing y catálogo SEO en portal",
      "Importar kit Meta Ads Advantage+ en Business Manager",
      "Activar secuencia carrito abandonado",
      "Conectar pixel Meta + GA4 ecommerce",
      "Medir ROAS a 14 días post-lanzamiento",
    ],
    portal_path: "/portal",
  };
}

export async function runEcommerceGrowthPack(params: {
  workspaceId: number;
  userId: string;
  intake: EcommerceGrowthPackIntake;
}): Promise<PackRunRecord> {
  const { intake } = params;
  return runGrowthPack({
    workspaceId: params.workspaceId,
    userId: params.userId,
    config: {
      meta,
      intake,
      buildBrief: buildEcommerceBrief,
      primaryCampaign: (i) => ({
        platform: "email",
        campaign_type: "welcome",
        name: `Bienvenida tienda — ${i.business_name}`,
        content: `Secuencia post-compra y bienvenida para ${i.business_name}. Categoría: ${i.product_category}. CTA: ${i.primary_cta}`,
        target_audience: `Compradores ${i.product_category} — ${i.city}`,
        status: "ready",
      }),
      extraCampaigns: [
        {
          stepKey: "saas_campaign_abandoned",
          spec: (i) => ({
            platform: "email",
            campaign_type: "cart_abandonment",
            name: `Carrito abandonado — ${i.business_name}`,
            content: `Recuperación carrito 3-touch: recordatorio + incentivo + última oportunidad. AOV ref: ${i.avg_order_value ?? "N/D"}`,
            target_audience: `Visitantes con carrito activo — ${i.product_category}`,
            status: "ready",
          }),
        },
      ],
      extraDeliverables: [
        ({ intake: i, packRunId }) => ({
          stepKey: "meta_ads_kit",
          title: "Kit Meta Ads Advantage+ Ecommerce",
          type: "json",
          metadata: {
            pack_id: ECOMMERCE_GROWTH_PACK_ID,
            pack_run_id: packRunId,
            template: "ads-meta-advantage-ecom-v1",
            business_name: i.business_name,
            product_category: i.product_category,
            primary_channel: i.primary_channel ?? "meta",
            ad_sets: [
              { name: "Prospecting — Broad", objective: "OUTCOME_SALES", budget_daily_eur: 30 },
              { name: "Retargeting — 7d visitors", objective: "OUTCOME_SALES", budget_daily_eur: 20 },
              { name: "Retargeting — cart abandoners", objective: "OUTCOME_SALES", budget_daily_eur: 15 },
            ],
            creatives: [
              { format: "carousel", hook: i.value_proposition, cta: i.primary_cta },
              { format: "video_15s", hook: "Antes/después producto", cta: i.primary_cta },
            ],
            kpis_to_track: ["ROAS", "CPA", "AOV", "add_to_cart_rate", "purchase_conversion"],
          },
        }),
      ],
      buildReport: buildPackReport,
      projectDescription: (i) =>
        `Ecommerce pack: landing + SEO catálogo + chatbot ventas + Meta Ads para ${i.product_category}`,
    },
  });
}

export function validateEcommerceGrowthIntake(body: unknown): EcommerceGrowthPackIntake | null {
  if (typeof body !== "object" || body === null) return null;
  const o = body as Record<string, unknown>;
  const sectors = new Set(meta.sectors.map((s) => s.id));
  const sector = String(o.sector ?? "ecommerce").trim();
  if (!sectors.has(sector)) return null;
  const business_name = String(o.business_name ?? "").trim();
  const city = String(o.city ?? "").trim();
  const value_proposition = String(o.value_proposition ?? "").trim();
  const primary_cta = String(o.primary_cta ?? "").trim();
  const product_category = String(o.product_category ?? "").trim();
  if (!business_name || !city || !value_proposition || !primary_cta || !product_category) return null;
  const channel = String(o.primary_channel ?? "meta");
  return {
    business_name,
    sector: sector as EcommerceGrowthPackIntake["sector"],
    city,
    country: o.country ? String(o.country) : "ES",
    contact_email: o.contact_email ? String(o.contact_email) : undefined,
    contact_name: o.contact_name ? String(o.contact_name) : undefined,
    website_url: o.website_url ? String(o.website_url) : undefined,
    value_proposition,
    primary_cta,
    product_category,
    avg_order_value: o.avg_order_value ? String(o.avg_order_value) : undefined,
    primary_channel:
      channel === "google" || channel === "organic" ? channel : "meta",
    tier: o.tier === "premium" ? "premium" : "professional",
  };
}
