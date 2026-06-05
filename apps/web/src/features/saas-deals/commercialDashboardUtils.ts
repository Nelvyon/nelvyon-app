import type { DealStage, SaasDeal, SaasDealsMetrics, StageMetricsItem } from "./types";

export function sortDealsByUpdatedDesc(deals: SaasDeal[]): SaasDeal[] {
  return [...deals].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function takeRecentWonDeals(deals: SaasDeal[], limit = 5): SaasDeal[] {
  return sortDealsByUpdatedDesc(deals.filter((d) => d.stage === "won")).slice(0, limit);
}

export function takeOpenDeals(deals: SaasDeal[], limit = 5): SaasDeal[] {
  return sortDealsByUpdatedDesc(deals.filter((d) => d.stage !== "won" && d.stage !== "lost")).slice(0, limit);
}

export type StageDistributionRow = StageMetricsItem & {
  label: string;
  sharePct: number;
};

export function buildStageDistribution(
  metrics: SaasDealsMetrics,
  stageLabel: (stage: DealStage) => string,
): StageDistributionRow[] {
  const total = metrics.byStage.reduce((sum, row) => sum + row.count, 0);
  return metrics.byStage.map((row) => ({
    ...row,
    label: stageLabel(row.stage),
    sharePct: total > 0 ? Math.round((row.count / total) * 1000) / 10 : 0,
  }));
}

export function hasCommercialPipelineData(metrics: SaasDealsMetrics): boolean {
  return metrics.byStage.some((row) => row.count > 0);
}
