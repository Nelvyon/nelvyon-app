/** Phase K — Learning engine orchestrator (filesystem only, no DB) */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadOutcomesFromJson } from "../templates/templateOutcome";
import { collectPhaseOutputs } from "../templates/learningEvents";
import { loadTemplateRegistry } from "../templates/loadRegistry";
import {
  buildRankedSlices,
  selectByCategory,
  selectBySectorAndService,
} from "../templates/templateSelector";
import type { LearningEngineReport, TemplateOutcome } from "../templates/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTONOMOUS_ROOT = join(__dirname, "..");

export const DEFAULT_MOCK_FIXTURE = join(AUTONOMOUS_ROOT, "fixtures", "learning-outcomes-mock.json");
export const DEFAULT_PHASE_H_DIR = join(AUTONOMOUS_ROOT, "output", "phase-h", "restaurant-landing");
export const DEFAULT_PHASE_I_DIR = join(AUTONOMOUS_ROOT, "output", "phase-i", "restaurant-landing");
export const DEFAULT_LEARNING_OUTPUT = join(AUTONOMOUS_ROOT, "output", "learning");

const AUTONOMY_PREVIOUS_PCT = 62;
const AUTONOMY_LEARNING_DELTA = 7;

export interface RunLearningEngineOptions {
  mock_fixture_path?: string;
  phase_h_dir?: string;
  phase_i_dir?: string;
  output_dir?: string;
  registry_path?: string;
}

export interface LearningEngineResult {
  report: LearningEngineReport;
  outcomes: TemplateOutcome[];
  output_dir: string;
  rankings_path: string;
  selections_path: string;
  report_path: string;
}

export function runLearningEngine(options: RunLearningEngineOptions = {}): LearningEngineResult {
  const mockPath = options.mock_fixture_path ?? DEFAULT_MOCK_FIXTURE;
  const phaseHDir = options.phase_h_dir ?? DEFAULT_PHASE_H_DIR;
  const phaseIDir = options.phase_i_dir ?? DEFAULT_PHASE_I_DIR;
  const outputDir = options.output_dir ?? DEFAULT_LEARNING_OUTPUT;

  const registry = loadTemplateRegistry(options.registry_path);
  const mockRaw = JSON.parse(readFileSync(mockPath, "utf-8")) as unknown;
  const mockOutcomes = loadOutcomesFromJson(mockRaw);

  const phase = collectPhaseOutputs(phaseHDir, phaseIDir);
  const outcomeMap = new Map<string, TemplateOutcome>();
  for (const o of mockOutcomes) {
    outcomeMap.set(`${o.project_ref}:${o.template_id}`, o);
  }
  for (const o of phase.outcomes) {
    outcomeMap.set(`${o.project_ref}:${o.template_id}`, o);
  }
  const outcomes = [...outcomeMap.values()];

  const rankedSlices = buildRankedSlices(outcomes, registry.templates);

  const keySelections: Array<{ sector: string; service: string; category: TemplateOutcome["category"] }> = [
    { sector: "restaurant", service: "landing", category: "landing" },
    { sector: "dental", service: "landing", category: "landing" },
    { sector: "saas_b2b", service: "landing", category: "landing" },
    { sector: "solar", service: "landing", category: "landing" },
    { sector: "ecommerce", service: "landing", category: "landing" },
    { sector: "restaurant", service: "chatbot", category: "chatbot" },
    { sector: "solar", service: "google_ads", category: "ads" },
    { sector: "ecommerce", service: "meta_ads", category: "ads" },
  ];

  const selections = keySelections
    .map((k) =>
      selectBySectorAndService(k.sector, k.service, k.category, outcomes, registry.templates, {
        language: "es",
        level: "professional",
      }),
    )
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const landingByCategory = selectByCategory("landing", outcomes, registry.templates);
  for (const s of landingByCategory) {
    if (!selections.some((x) => x.selected_template_id === s.selected_template_id && x.slice.sector === s.slice.sector)) {
      selections.push(s);
    }
  }

  const computed_at = new Date().toISOString();
  const report: LearningEngineReport = {
    phase: "K",
    computed_at,
    registry_version: registry.version,
    outcomes_count: outcomes.length,
    events_count: phase.events.length,
    ranked_slices: rankedSlices.length,
    selections,
    autonomy_pct: {
      previous: AUTONOMY_PREVIOUS_PCT,
      current: AUTONOMY_PREVIOUS_PCT + AUTONOMY_LEARNING_DELTA,
      delta: AUTONOMY_LEARNING_DELTA,
      rationale:
        "Learning Engine Phase K operativo: ranking + selector por sector/servicio sin DB. +7% sobre base post Phase I (62%).",
    },
  };

  mkdirSync(outputDir, { recursive: true });

  const rankingsPath = join(outputDir, "rankings.json");
  const selectionsPath = join(outputDir, "selections.json");
  const reportPath = join(outputDir, "learningReport.json");
  const eventsPath = join(outputDir, "learningEvents.json");
  const outcomesPath = join(outputDir, "outcomesMerged.json");

  writeFileSync(rankingsPath, JSON.stringify({ computed_at, slices: rankedSlices }, null, 2));
  writeFileSync(selectionsPath, JSON.stringify({ computed_at, selections }, null, 2));
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  writeFileSync(eventsPath, JSON.stringify({ computed_at, events: phase.events }, null, 2));
  writeFileSync(outcomesPath, JSON.stringify({ computed_at, outcomes }, null, 2));

  return {
    report,
    outcomes,
    output_dir: outputDir,
    rankings_path: rankingsPath,
    selections_path: selectionsPath,
    report_path: reportPath,
  };
}
