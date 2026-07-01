import type { SaasDeal } from "./SaasDealsService";

/** Stage win rates calibrated from B2B SaaS benchmarks (historical prior). */
const STAGE_WIN_PRIOR: Record<string, number> = {
  lead: 0.05,
  qualified: 0.15,
  proposal: 0.35,
  negotiation: 0.55,
  won: 1,
  lost: 0,
};

export type MlForecastResult = {
  forecastValue: number;
  forecastConfidence: number;
  stageWinRates: Record<string, number>;
  method: "weighted_ml_v1";
};

function isOpenStage(stage: string): boolean {
  return stage !== "won" && stage !== "lost";
}

/** Blend deal probability with historical stage conversion (ML-style weighted forecast). */
export function computeMlDealForecast(deals: SaasDeal[]): MlForecastResult {
  const stageCounts = new Map<string, { total: number; won: number }>();
  for (const d of deals) {
    const cur = stageCounts.get(d.stage) ?? { total: 0, won: 0 };
    cur.total += 1;
    if (d.stage === "won") cur.won += 1;
    stageCounts.set(d.stage, cur);
  }

  const stageWinRates: Record<string, number> = {};
  for (const [stage, prior] of Object.entries(STAGE_WIN_PRIOR)) {
    const hist = stageCounts.get(stage);
    if (hist && hist.total >= 5) {
      stageWinRates[stage] = Math.min(1, hist.won / hist.total);
    } else {
      stageWinRates[stage] = prior;
    }
  }

  let forecastValue = 0;
  let weightedConfidence = 0;
  let openWeight = 0;

  for (const d of deals) {
    if (!isOpenStage(d.stage)) continue;
    const stageRate = stageWinRates[d.stage] ?? STAGE_WIN_PRIOR[d.stage] ?? 0.1;
    const dealProb = Math.min(1, Math.max(0, d.probability / 100));
    const blended = dealProb * 0.6 + stageRate * 0.4;
    forecastValue += d.value * blended;
    weightedConfidence += blended;
    openWeight += 1;
  }

  const forecastConfidence =
    openWeight > 0 ? Math.round((weightedConfidence / openWeight) * 1000) / 10 : 0;

  return {
    forecastValue: Math.round(forecastValue * 100) / 100,
    forecastConfidence,
    stageWinRates,
    method: "weighted_ml_v1",
  };
}
