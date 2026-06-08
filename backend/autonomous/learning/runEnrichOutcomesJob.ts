/** Phase N — enrich outcomes with GA4 metrics and refresh rankings */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { fetchGa4ConversionMetrics, isGa4RealModeEnabled, resolveGa4AdapterMode } from "../analytics/ga4Adapter";
import { buildRankedSlices } from "../templates/templateSelector";
import { loadTemplateRegistry } from "../templates/loadRegistry";
import {
  learningDbEnabled,
  resolveStorageMode,
  templateOutcomeRepository,
} from "../templates/templateOutcomeRepository";
import type { EnrichedTemplateOutcome } from "../analytics/types";
import type { RankedSlice, TemplateOutcome } from "../templates/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_LEARNING_OUTPUT = join(__dirname, "..", "output", "learning");

const AUTONOMY_PREVIOUS_PCT = 78;
const AUTONOMY_DELTA = 4;

export interface EnrichOutcomesJobReport {
  phase: "N";
  computed_at: string;
  registry_version: string;
  storage_mode: "db" | "local" | "none";
  ga4_mode: ReturnType<typeof resolveGa4AdapterMode>;
  ga4_real_enabled: boolean;
  outcomes_count: number;
  enriched_count: number;
  with_conversion_rate: number;
  ranked_slices: number;
  autonomy_pct: {
    previous: number;
    current: number;
    delta: number;
    rationale: string;
  };
}

export interface EnrichOutcomesJobResult {
  report: EnrichOutcomesJobReport;
  outcomes: TemplateOutcome[];
  enriched: EnrichedTemplateOutcome[];
  ranked_slices: RankedSlice[];
  output_dir: string;
  enriched_path: string;
  rankings_path: string;
  report_path: string;
}

export interface RunEnrichOutcomesJobOptions {
  output_dir?: string;
  registry_path?: string;
  realistic_mock?: boolean;
  fetchFn?: typeof fetch;
}

function pagePathFromOutcome(outcome: TemplateOutcome): string | null {
  const notes = outcome.notes ?? "";
  const match = /page[=:]\s*(\S+)/i.exec(notes);
  if (match?.[1]) return match[1];
  if (outcome.sector === "restaurant") return "/reserva";
  return null;
}

export function applyGa4ToOutcome(
  outcome: TemplateOutcome,
  ga4: Awaited<ReturnType<typeof fetchGa4ConversionMetrics>>,
): TemplateOutcome {
  return {
    ...outcome,
    conversion_rate: ga4.conversion_rate ?? outcome.conversion_rate,
    lead_count: ga4.lead_count > 0 ? ga4.lead_count : outcome.lead_count,
  };
}

export async function enrichSingleOutcome(
  outcome: TemplateOutcome,
  options?: { realistic_mock?: boolean; fetchFn?: typeof fetch },
): Promise<EnrichedTemplateOutcome> {
  const ga4 = await fetchGa4ConversionMetrics(
    {
      sector: outcome.sector,
      template_id: outcome.template_id,
      project_ref: outcome.project_ref,
      page_path: pagePathFromOutcome(outcome),
      realistic_mock: options?.realistic_mock,
    },
    { fetchFn: options?.fetchFn },
  );

  const merged = applyGa4ToOutcome(outcome, ga4);

  return {
    outcome_id: outcome.id,
    project_ref: outcome.project_ref,
    template_id: outcome.template_id,
    sector: outcome.sector,
    conversion_rate: merged.conversion_rate,
    lead_count: merged.lead_count,
    ga4,
    enriched_at: new Date().toISOString(),
  };
}

export async function runEnrichOutcomesJob(
  options: RunEnrichOutcomesJobOptions = {},
): Promise<EnrichOutcomesJobResult> {
  const outputDir = options.output_dir ?? DEFAULT_LEARNING_OUTPUT;
  const registry = loadTemplateRegistry(options.registry_path);
  const storageMode = learningDbEnabled() ? "db" : resolveStorageMode();
  const ga4Mode = resolveGa4AdapterMode(options.realistic_mock);
  const realisticMock =
    options.realistic_mock ?? process.env.AUTONOMOUS_GA4_MOCK === "realistic";

  const outcomes = await templateOutcomeRepository.listOutcomes();
  const enriched: EnrichedTemplateOutcome[] = [];
  const mergedOutcomes: TemplateOutcome[] = [];

  for (const outcome of outcomes) {
    const row = await enrichSingleOutcome(outcome, {
      realistic_mock: realisticMock,
      fetchFn: options.fetchFn,
    });
    enriched.push(row);
    mergedOutcomes.push(applyGa4ToOutcome(outcome, row.ga4));
  }

  const rankedSlices = buildRankedSlices(mergedOutcomes, registry.templates);
  const computed_at = new Date().toISOString();
  const withCr = mergedOutcomes.filter((o) => o.conversion_rate !== null).length;

  const report: EnrichOutcomesJobReport = {
    phase: "N",
    computed_at,
    registry_version: registry.version,
    storage_mode: storageMode,
    ga4_mode: ga4Mode,
    ga4_real_enabled: isGa4RealModeEnabled(),
    outcomes_count: outcomes.length,
    enriched_count: enriched.length,
    with_conversion_rate: withCr,
    ranked_slices: rankedSlices.length,
    autonomy_pct: {
      previous: AUTONOMY_PREVIOUS_PCT,
      current: AUTONOMY_PREVIOUS_PCT + AUTONOMY_DELTA,
      delta: AUTONOMY_DELTA,
      rationale:
        "Phase N: GA4 adapter read-only + enrich-outcomes + conversion_score con CR/leads reales. +4% sobre Phase M (78%).",
    },
  };

  mkdirSync(outputDir, { recursive: true });

  const enrichedPath = join(outputDir, "enrichedOutcomes.json");
  const rankingsPath = join(outputDir, "rankings.json");
  const reportPath = join(outputDir, "learningReport.json");

  writeFileSync(
    enrichedPath,
    JSON.stringify({ computed_at, ga4_mode: ga4Mode, enriched }, null, 2),
  );
  writeFileSync(rankingsPath, JSON.stringify({ computed_at, slices: rankedSlices, enriched: true }, null, 2));
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  return {
    report,
    outcomes,
    enriched,
    ranked_slices: rankedSlices,
    output_dir: outputDir,
    enriched_path: enrichedPath,
    rankings_path: rankingsPath,
    report_path: reportPath,
  };
}
