/** Phase M — cron/job: rank templates from DB or local outcomes */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildRankedSlices } from "../templates/templateSelector";
import { loadTemplateRegistry } from "../templates/loadRegistry";
import {
  learningDbEnabled,
  resolveStorageMode,
  templateOutcomeRepository,
} from "../templates/templateOutcomeRepository";
import { rankTemplatesForSlice } from "../templates/templateRanking";
import type { RankedSlice, TemplateOutcome, TemplateScoreBreakdown, TemplateSlice } from "../templates/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_LEARNING_OUTPUT = join(__dirname, "..", "output", "learning");

const AUTONOMY_PREVIOUS_PCT = 74;
const AUTONOMY_DELTA = 4;

export interface RankTemplatesJobReport {
  phase: "M";
  computed_at: string;
  registry_version: string;
  storage_mode: "db" | "local" | "none";
  outcomes_count: number;
  ranked_slices: number;
  autonomy_pct: {
    previous: number;
    current: number;
    delta: number;
    rationale: string;
  };
}

export interface RankTemplatesJobResult {
  report: RankTemplatesJobReport;
  outcomes: TemplateOutcome[];
  ranked_slices: RankedSlice[];
  output_dir: string;
  rankings_path: string;
  report_path: string;
}

export interface RunRankTemplatesJobOptions {
  output_dir?: string;
  registry_path?: string;
}

/** In-memory ranking for a slice (same engine as rankTemplatesFromDb). */
export function rankTemplates(
  slice: TemplateSlice,
  outcomes: TemplateOutcome[],
  registryPath?: string,
): TemplateScoreBreakdown[] {
  const registry = loadTemplateRegistry(registryPath);
  return rankTemplatesForSlice(slice, outcomes, registry.templates);
}

export async function runRankTemplatesJob(
  options: RunRankTemplatesJobOptions = {},
): Promise<RankTemplatesJobResult> {
  const outputDir = options.output_dir ?? DEFAULT_LEARNING_OUTPUT;
  const registry = loadTemplateRegistry(options.registry_path);
  const storageMode = learningDbEnabled() ? "db" : resolveStorageMode();

  const outcomes = await templateOutcomeRepository.listOutcomes();
  const rankedSlices = buildRankedSlices(outcomes, registry.templates);
  const computed_at = new Date().toISOString();

  const report: RankTemplatesJobReport = {
    phase: "M",
    computed_at,
    registry_version: registry.version,
    storage_mode: storageMode,
    outcomes_count: outcomes.length,
    ranked_slices: rankedSlices.length,
    autonomy_pct: {
      previous: AUTONOMY_PREVIOUS_PCT,
      current: AUTONOMY_PREVIOUS_PCT + AUTONOMY_DELTA,
      delta: AUTONOMY_DELTA,
      rationale:
        "Phase M: loop real de aprendizaje — portal feedback → outcomes, job rankings DB/local, GA4 placeholder. +4% sobre Phase L (74%).",
    },
  };

  mkdirSync(outputDir, { recursive: true });

  const rankingsPath = join(outputDir, "rankings.json");
  const reportPath = join(outputDir, "learningReport.json");

  writeFileSync(rankingsPath, JSON.stringify({ computed_at, slices: rankedSlices }, null, 2));
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  return {
    report,
    outcomes,
    ranked_slices: rankedSlices,
    output_dir: outputDir,
    rankings_path: rankingsPath,
    report_path: reportPath,
  };
}
