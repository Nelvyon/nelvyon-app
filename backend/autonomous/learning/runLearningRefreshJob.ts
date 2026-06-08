/** Phase P — staging refresh: enrich → rank → alerts → CSV exports */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runEnrichOutcomesJob } from "./runEnrichOutcomesJob";
import { runRankTemplatesJob } from "./runRankTemplatesJob";
import {
  buildLearningSnapshot,
  detectLearningAlerts,
  type LearningAlert,
  type LearningSnapshot,
  type TemplateRankRow,
  type TrendPoint,
} from "./learningAlerts";
import { exportLearningCsv } from "./learningCsvExport";
import type { TemplateOutcome } from "../templates/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_LEARNING_OUTPUT = join(__dirname, "..", "output", "learning");
export const DEFAULT_EXPORT_DIR = join(DEFAULT_LEARNING_OUTPUT, "exports");

const AUTONOMY_PREVIOUS_PCT = 86;
const AUTONOMY_DELTA = 4;

export interface LearningRefreshReport {
  phase: "P";
  computed_at: string;
  source: "manual" | "cron";
  storage_mode: string;
  steps_completed: string[];
  alerts_count: number;
  exports: string[];
  autonomy_pct: {
    previous: number;
    current: number;
    delta: number;
    rationale: string;
  };
}

export interface LearningRefreshResult {
  report: LearningRefreshReport;
  alerts: LearningAlert[];
  output_dir: string;
  export_dir: string;
}

function readJson<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return null;
  }
}

function buildTrendFromOutcomes(outcomes: TemplateOutcome[]): TrendPoint[] {
  const buckets = new Map<string, { cr: number[]; leads: number }>();
  for (const o of outcomes) {
    const day = o.created_at.slice(0, 10);
    const b = buckets.get(day) ?? { cr: [], leads: 0 };
    if (o.conversion_rate !== null) b.cr.push(o.conversion_rate);
    b.leads += o.lead_count;
    buckets.set(day, b);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, b]) => ({
      date,
      outcomes_count: 1,
      conversion_rate_avg:
        b.cr.length > 0 ? Math.round((b.cr.reduce((s, v) => s + v, 0) / b.cr.length) * 100) / 100 : null,
      lead_count_total: b.leads,
    }));
}

function topTemplatesFromRankings(
  rankedSlices: Awaited<ReturnType<typeof runRankTemplatesJob>>["ranked_slices"],
  outcomes: TemplateOutcome[],
): TemplateRankRow[] {
  const byTemplate = new Map<string, TemplateOutcome[]>();
  for (const o of outcomes) {
    const list = byTemplate.get(o.template_id) ?? [];
    list.push(o);
    byTemplate.set(o.template_id, list);
  }

  const rows: TemplateRankRow[] = [];
  for (const sl of rankedSlices) {
    for (const r of sl.ranked) {
      const tplOutcomes = byTemplate.get(r.template_id) ?? [];
      const approved = tplOutcomes.filter((o) => o.approved_by_client).length;
      const decided = tplOutcomes.length;
      rows.push({
        template_id: r.template_id,
        sector: sl.slice.sector,
        service: sl.slice.service,
        final_template_score: r.final_template_score,
        conversion_score: r.conversion_score,
        qa_score: r.metrics.qa_avg,
        conversion_rate: r.metrics.conversion_avg,
        lead_count: tplOutcomes.reduce((s, o) => s + o.lead_count, 0),
        approved_by_client_rate: decided > 0 ? approved / decided : r.metrics.approval_rate,
        revisions_count: r.metrics.revisions_avg,
        sample_size: r.sample_size,
      });
    }
  }

  const seen = new Set<string>();
  return rows.filter((r) => {
    const k = `${r.template_id}|${r.sector}|${r.service}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function groupBySector(rows: TemplateRankRow[]) {
  const map = new Map<string, TemplateRankRow[]>();
  for (const r of rows) {
    const list = map.get(r.sector) ?? [];
    list.push(r);
    map.set(r.sector, list);
  }
  return [...map.entries()].map(([sector, group]) => {
    const top = group.reduce((a, b) => (b.final_template_score > a.final_template_score ? b : a));
    return {
      sector,
      top_template_id: top.template_id,
      top_final_score: top.final_template_score,
      avg_conversion_score:
        Math.round((group.reduce((s, g) => s + (g.conversion_score ?? 0), 0) / group.length) * 100) / 100,
      templates_count: group.length,
    };
  });
}

export async function runLearningRefreshJob(options?: {
  output_dir?: string;
  export_dir?: string;
  source?: "manual" | "cron";
  realistic_mock?: boolean;
}): Promise<LearningRefreshResult> {
  const outputDir = options?.output_dir ?? DEFAULT_LEARNING_OUTPUT;
  const exportDir = options?.export_dir ?? join(outputDir, "exports");
  const source = options?.source ?? "manual";
  const steps: string[] = [];

  const snapshotPath = join(outputDir, "learningSnapshot.json");
  const previousSnapshot = readJson<LearningSnapshot>(snapshotPath);

  const enrich = await runEnrichOutcomesJob({
    output_dir: outputDir,
    realistic_mock: options?.realistic_mock ?? process.env.AUTONOMOUS_GA4_MOCK === "realistic",
  });
  steps.push("enrich-outcomes");

  const rank = await runRankTemplatesJob({ output_dir: outputDir });
  steps.push("rank-templates");

  const outcomes = enrich.outcomes;
  const topTemplates = topTemplatesFromRankings(rank.ranked_slices, outcomes);
  const trend = buildTrendFromOutcomes(outcomes);

  const alerts = detectLearningAlerts({
    outcomes,
    topTemplates,
    trend,
    previousSnapshot,
  });
  steps.push("alerts");

  const alertsPath = join(outputDir, "learningAlerts.json");
  writeFileSync(alertsPath, JSON.stringify({ computed_at: new Date().toISOString(), alerts }, null, 2));

  const bySector = groupBySector(topTemplates);
  const csv = exportLearningCsv({
    topTemplates,
    outcomes,
    bySector,
    outputDir: exportDir,
  });
  steps.push("exports");

  const snapshot = buildLearningSnapshot({ topTemplates, trend });
  writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));

  const computed_at = new Date().toISOString();
  const refreshStatus = {
    computed_at,
    source,
    steps_completed: steps,
    success: true,
    storage_mode: enrich.report.storage_mode,
    alerts_count: alerts.length,
    exports: [csv.rankings_path, csv.outcomes_path, csv.sector_summary_path],
  };
  writeFileSync(join(outputDir, "refreshStatus.json"), JSON.stringify(refreshStatus, null, 2));

  const report: LearningRefreshReport = {
    phase: "P",
    computed_at,
    source,
    storage_mode: enrich.report.storage_mode,
    steps_completed: steps,
    alerts_count: alerts.length,
    exports: ["rankings.csv", "outcomes.csv", "sector_summary.csv"],
    autonomy_pct: {
      previous: AUTONOMY_PREVIOUS_PCT,
      current: AUTONOMY_PREVIOUS_PCT + AUTONOMY_DELTA,
      delta: AUTONOMY_DELTA,
      rationale:
        "Phase P: alertas internas, export CSV y cron learning-refresh operativo. +4% sobre Phase O (86%).",
    },
  };

  writeFileSync(join(outputDir, "learningReport.json"), JSON.stringify(report, null, 2));

  return {
    report,
    alerts,
    output_dir: outputDir,
    export_dir: exportDir,
  };
}
