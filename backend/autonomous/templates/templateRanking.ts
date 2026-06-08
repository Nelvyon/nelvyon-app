/** Ranking engine — conversion, quality, usage, reliability, final_template_score */

import { aggregateOutcomes, clampScore } from "./templateOutcome";
import type {
  TemplateBaselineScores,
  TemplateOutcome,
  TemplateRegistryEntry,
  TemplateScoreBreakdown,
  TemplateSlice,
} from "./types";

const COLD_START_MIN_SAMPLES = 3;
const COLD_START_PENALTY = 5;

/** Map GA4-style conversion % (e.g. 8.2) to 0–100 score (25% ≈ 100). */
function conversionPercentToScore(crPercent: number): number {
  return clampScore(Math.min(100, crPercent * 4));
}

/** Sector conversion benchmarks when no measured CR (0–100). */
const SECTOR_BENCHMARK: Record<string, number> = {
  restaurant: 78,
  dental: 72,
  legal: 65,
  fitness: 70,
  beauty: 74,
  real_estate: 68,
  ecommerce: 76,
  solar: 71,
  coaching: 73,
  saas_b2b: 80,
  general: 70,
};

function logNormUses(n: number, maxUses: number): number {
  if (maxUses <= 0) return 0;
  return clampScore((Math.log1p(n) / Math.log1p(maxUses)) * 100);
}

export function computeQualityScore(
  agg: ReturnType<typeof aggregateOutcomes>,
  baseline: TemplateBaselineScores,
  coldBlend: number,
): number {
  const fromData =
    agg.sample_size > 0
      ? clampScore(0.65 * agg.qa_avg + 0.2 * (agg.first_pass_rate * 100) + 0.15 * (agg.rating_avg ?? 4) * 20)
      : baseline.quality_score;

  let score = coldBlend * fromData + (1 - coldBlend) * baseline.quality_score;

  if (agg.qa_avg > 0 && agg.qa_avg < 70) score = Math.min(score, 69);
  if (agg.sample_size > 0 && agg.qa_std > 12) score -= 3;

  return clampScore(score);
}

export function computeConversionScore(
  agg: ReturnType<typeof aggregateOutcomes>,
  baseline: TemplateBaselineScores,
  sector: string,
  coldBlend: number,
): number {
  let fromData: number;
  const benchmark = SECTOR_BENCHMARK[sector] ?? SECTOR_BENCHMARK.general;
  const hasConversionRate = agg.conversion_measured >= 1 && agg.conversion_avg !== null;
  const hasLeadSignal = agg.sample_size > 0 && agg.lead_total > 0;

  if (hasConversionRate) {
    const revisionPenalty = Math.min(15, agg.revisions_avg * 4);
    const leadsPerOutcome = agg.lead_total / agg.sample_size;
    const leadBoost = hasLeadSignal ? Math.min(6, Math.log1p(leadsPerOutcome) * 2.5) : 0;
    const crScore = conversionPercentToScore(agg.conversion_avg as number);
    fromData = clampScore(
      0.5 * crScore +
        0.2 * (agg.qa_avg * 0.5) +
        0.15 * (agg.first_pass_rate * 100) +
        0.15 * Math.max(0, 100 - revisionPenalty) +
        leadBoost,
    );
  } else if (hasLeadSignal) {
    const leadsPerOutcome = agg.lead_total / agg.sample_size;
    const leadScore = clampScore(42 + Math.log1p(leadsPerOutcome) * 14);
    fromData = clampScore(0.55 * leadScore + 0.45 * benchmark);
  } else {
    fromData = clampScore(0.4 * (agg.qa_avg * 0.55) + 0.35 * (agg.first_pass_rate * 100) + 0.25 * benchmark);
  }

  const score = coldBlend * fromData + (1 - coldBlend) * baseline.conversion_score;
  return clampScore(score);
}

export function computeUsageScore(
  agg: ReturnType<typeof aggregateOutcomes>,
  baseline: TemplateBaselineScores,
  maxUses: number,
  coldBlend: number,
): number {
  const usesNorm = logNormUses(agg.sample_size, maxUses);
  const approvalPct = clampScore(agg.approval_rate * 100);
  const revisionPenalty = clampScore(Math.max(0, 100 - agg.revisions_avg * 20));
  const firstPassPct = clampScore(agg.first_pass_rate * 100);

  const fromData =
    agg.sample_size > 0
      ? clampScore(
          0.2 * usesNorm + 0.25 * firstPassPct + 0.3 * approvalPct + 0.15 * revisionPenalty + 0.1 * 80,
        )
      : baseline.usage_score;

  return clampScore(coldBlend * fromData + (1 - coldBlend) * baseline.usage_score);
}

export function computeReliabilityScore(
  agg: ReturnType<typeof aggregateOutcomes>,
  baseline: TemplateBaselineScores,
  coldBlend: number,
): number {
  let fromData = 100;

  if (agg.sample_size > 0) {
    fromData -= agg.reject_rate * 0.35;
    fromData -= Math.min(40, agg.revisions_avg * 8);
    fromData -= Math.min(15, agg.qa_std * 1.5);
    if (agg.qa_avg >= 85 && agg.reject_rate === 0) fromData += 5;
    fromData = clampScore(fromData);
  } else {
    fromData = baseline.reliability_score;
  }

  return clampScore(coldBlend * fromData + (1 - coldBlend) * baseline.reliability_score);
}

export function computeFinalTemplateScore(
  quality: number,
  conversion: number,
  usage: number,
  reliability: number,
  coldStart: boolean,
): number {
  let final = clampScore(
    0.28 * quality + 0.27 * conversion + 0.22 * usage + 0.23 * reliability,
  );
  if (coldStart) final = clampScore(final - COLD_START_PENALTY);
  return final;
}

export function rankTemplate(
  templateId: string,
  outcomes: TemplateOutcome[],
  entry: TemplateRegistryEntry,
  maxUses: number,
  sector: string,
): TemplateScoreBreakdown {
  const agg = aggregateOutcomes(outcomes);
  const coldStart = agg.sample_size < COLD_START_MIN_SAMPLES;
  const coldBlend = Math.min(1, agg.sample_size / COLD_START_MIN_SAMPLES);

  const quality_score = computeQualityScore(agg, entry.baseline_scores, coldBlend);
  const conversion_score = computeConversionScore(agg, entry.baseline_scores, sector, coldBlend);
  const usage_score = computeUsageScore(agg, entry.baseline_scores, maxUses, coldBlend);
  const reliability_score = computeReliabilityScore(agg, entry.baseline_scores, coldBlend);
  const final_template_score = computeFinalTemplateScore(
    quality_score,
    conversion_score,
    usage_score,
    reliability_score,
    coldStart,
  );

  return {
    template_id: templateId,
    sample_size: agg.sample_size,
    cold_start: coldStart,
    conversion_score,
    quality_score,
    usage_score,
    reliability_score,
    final_template_score,
    metrics: {
      qa_avg: agg.qa_avg,
      approval_rate: agg.approval_rate,
      reject_rate: agg.reject_rate,
      revisions_avg: agg.revisions_avg,
      conversion_avg: agg.conversion_avg,
      first_pass_rate: agg.first_pass_rate,
    },
  };
}

export function rankTemplatesForSlice(
  slice: TemplateSlice,
  allOutcomes: TemplateOutcome[],
  registryEntries: TemplateRegistryEntry[],
): TemplateScoreBreakdown[] {
  const candidates = registryEntries.filter((t) => {
    if (t.status !== "active") return false;
    if (t.category !== slice.category) return false;
    if (!t.sectors.includes(slice.sector) && !t.sectors.includes("general")) return false;
    if (!t.services.includes(slice.service)) return false;
    if (slice.objective && !t.objectives.includes(slice.objective)) return false;
    if (slice.channel && !t.channels.includes(slice.channel)) return false;
    if (slice.language && !t.languages.includes(slice.language)) return false;
    if (slice.level && !t.levels.includes(slice.level)) return false;
    return true;
  });

  const maxUses = Math.max(
    1,
    ...candidates.map((t) => allOutcomes.filter((o) => o.template_id === t.id).length),
  );

  const ranked = candidates.map((entry) => {
    const templateOutcomes = allOutcomes.filter(
      (o) =>
        o.template_id === entry.id &&
        o.category === slice.category &&
        (o.sector === slice.sector || slice.sector === "general"),
    );
    return rankTemplate(entry.id, templateOutcomes, entry, maxUses, slice.sector);
  });

  ranked.sort((a, b) => {
    if (b.final_template_score !== a.final_template_score) {
      return b.final_template_score - a.final_template_score;
    }
    if (b.conversion_score !== a.conversion_score) return b.conversion_score - a.conversion_score;
    if (b.quality_score !== a.quality_score) return b.quality_score - a.quality_score;
    return b.sample_size - a.sample_size;
  });

  return ranked;
}

export function discoverSlices(
  outcomes: TemplateOutcome[],
  registryEntries: TemplateRegistryEntry[],
): TemplateSlice[] {
  const key = (s: TemplateSlice) =>
    `${s.category}|${s.sector}|${s.service}|${s.objective ?? "*"}|${s.channel ?? "*"}|${s.language ?? "*"}|${s.level ?? "*"}`;

  const map = new Map<string, TemplateSlice>();

  for (const o of outcomes) {
    const slice: TemplateSlice = {
      category: o.category,
      sector: o.sector,
      service: o.service,
      objective: o.objective,
      channel: o.channel,
      language: o.language,
      level: o.level,
    };
    map.set(key(slice), slice);
  }

  for (const t of registryEntries) {
    if (t.status !== "active") continue;
    for (const sector of t.sectors) {
      for (const service of t.services) {
        const slice: TemplateSlice = {
          category: t.category,
          sector,
          service,
          objective: t.objectives[0],
          channel: t.channels[0],
          language: t.languages[0],
          level: t.levels[0],
        };
        map.set(key(slice), slice);
      }
    }
  }

  return [...map.values()];
}
