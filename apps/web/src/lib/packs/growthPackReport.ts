import type { PackId, PackReport, SkuRunResult } from "@/lib/packs/types";

export function buildGrowthPackReport(params: {
  packName: string;
  packId: PackId;
  intake: { business_name: string; sector: string };
  skuResults: SkuRunResult[];
  saasClientId: number;
  saasCampaignId: number;
  extraCampaignCount: number;
  extraDeliverableCount: number;
  summary: string;
  nextSteps: string[];
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
    pack_name: params.packName,
    pack_id: params.packId,
    business_name: params.intake.business_name,
    sector: params.intake.sector,
    completed_at: new Date().toISOString(),
    summary: params.summary,
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
    next_steps: params.nextSteps,
    portal_path: "/portal",
  };
}
