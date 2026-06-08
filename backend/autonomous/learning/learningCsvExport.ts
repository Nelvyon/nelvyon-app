/** Phase P — CSV exports for learning dashboard */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { TemplateOutcome } from "../templates/types";
import type { TemplateRankRow } from "./learningAlerts";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowsToCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  return lines.join("\n") + "\n";
}

export interface LearningCsvExportResult {
  rankings_path: string;
  outcomes_path: string;
  sector_summary_path: string;
  export_dir: string;
}

export function exportLearningCsv(params: {
  topTemplates: TemplateRankRow[];
  outcomes: TemplateOutcome[];
  bySector: Array<{
    sector: string | null;
    top_template_id: string;
    top_final_score: number;
    avg_conversion_score: number;
    templates_count: number;
  }>;
  outputDir: string;
}): LearningCsvExportResult {
  mkdirSync(params.outputDir, { recursive: true });

  const rankingsRows = params.topTemplates.map((t) => ({
    template_id: t.template_id,
    sector: t.sector,
    service: t.service,
    final_template_score: t.final_template_score,
    conversion_score: t.conversion_score ?? "",
    qa_score: t.qa_score,
    conversion_rate: t.conversion_rate ?? "",
    lead_count: t.lead_count,
    approved_by_client_rate: t.approved_by_client_rate,
    revisions_count: t.revisions_count,
    sample_size: t.sample_size,
  }));

  const outcomesRows = params.outcomes.map((o) => ({
    id: o.id,
    project_ref: o.project_ref,
    template_id: o.template_id,
    sector: o.sector,
    service: o.service,
    category: o.category,
    qa_score: o.qa_score,
    approved_by_client: o.approved_by_client,
    revisions_count: o.revisions_count,
    conversion_rate: o.conversion_rate ?? "",
    lead_count: o.lead_count,
    result_status: o.result_status,
    created_at: o.created_at,
  }));

  const sectorRows = params.bySector.map((s) => ({
    sector: s.sector ?? "",
    top_template_id: s.top_template_id,
    top_final_score: s.top_final_score,
    avg_conversion_score: s.avg_conversion_score,
    templates_count: s.templates_count,
  }));

  const rankings_path = join(params.outputDir, "rankings.csv");
  const outcomes_path = join(params.outputDir, "outcomes.csv");
  const sector_summary_path = join(params.outputDir, "sector_summary.csv");

  writeFileSync(
    rankings_path,
    rowsToCsv(
      [
        "template_id",
        "sector",
        "service",
        "final_template_score",
        "conversion_score",
        "qa_score",
        "conversion_rate",
        "lead_count",
        "approved_by_client_rate",
        "revisions_count",
        "sample_size",
      ],
      rankingsRows,
    ),
  );

  writeFileSync(
    outcomes_path,
    rowsToCsv(
      [
        "id",
        "project_ref",
        "template_id",
        "sector",
        "service",
        "category",
        "qa_score",
        "approved_by_client",
        "revisions_count",
        "conversion_rate",
        "lead_count",
        "result_status",
        "created_at",
      ],
      outcomesRows,
    ),
  );

  writeFileSync(
    sector_summary_path,
    rowsToCsv(
      ["sector", "top_template_id", "top_final_score", "avg_conversion_score", "templates_count"],
      sectorRows,
    ),
  );

  return { rankings_path, outcomes_path, sector_summary_path, export_dir: params.outputDir };
}
