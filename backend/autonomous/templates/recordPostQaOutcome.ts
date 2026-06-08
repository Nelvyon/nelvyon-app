/** Phase L — record template outcome after autonomous QA (DB or local JSON) */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { AutonomousProject, QaResult } from "../types";
import { skuToTemplateContext } from "./pipelineTemplateSelector";
import {
  learningDbEnabled,
  resolveStorageMode,
  templateOutcomeRepository,
  type RecordOutcomeInput,
} from "./templateOutcomeRepository";
import type { ResultStatus, TemplateOutcome } from "./types";
import { normalizeOutcome } from "./templateOutcome";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTCOMES_SNAPSHOT_DIR = join(__dirname, "..", "output", "learning", "pipeline-outcomes");

export interface PostQaRecordResult {
  stored: "db" | "local" | "json_only";
  outcome: TemplateOutcome;
  id?: string;
}

function parseWorkspaceId(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function resultStatusFromQa(qa: QaResult, phase?: string): ResultStatus {
  if (qa.passed) return phase === "I" ? "published_internal" : "qa_passed";
  return "qa_failed";
}

export function buildOutcomeFromProject(
  project: AutonomousProject,
  qa: QaResult,
  templateId: string,
  extra?: { phase?: string; combined_qa_score?: number },
): TemplateOutcome {
  const ctx = skuToTemplateContext(project.sku);
  const sector = project.sector ?? String(project.brief.sector ?? "general");
  const qaScore = extra?.combined_qa_score ?? qa.score;

  return normalizeOutcome({
    id: `pipeline-${project.project_id}-${project.retry_count}`,
    project_ref: project.project_id,
    template_id: templateId,
    category: ctx.category,
    sector,
    service: ctx.service,
    objective: String(project.brief.objective ?? "lead_gen"),
    channel: String(project.brief.channel ?? "web"),
    language: String(project.brief.language ?? "es"),
    level: project.tier,
    qa_score: qaScore,
    approved_by_client: false,
    revisions_count: project.retry_count,
    conversion_rate: null,
    lead_count: 0,
    client_rating: null,
    delivery_time_hours: 4,
    result_status: resultStatusFromQa(qa, extra?.phase),
    notes: `Phase L pipeline QA attempt ${project.retry_count + 1}`,
    created_at: new Date().toISOString(),
  });
}

export async function recordPostQaOutcome(params: {
  project: AutonomousProject;
  qa: QaResult;
  templateId: string;
  extra?: { phase?: string; combined_qa_score?: number };
}): Promise<PostQaRecordResult> {
  const outcome = buildOutcomeFromProject(params.project, params.qa, params.templateId, params.extra);
  const input: RecordOutcomeInput = {
    workspace_id: parseWorkspaceId(params.project.os_refs.workspace_id),
    template_id: outcome.template_id,
    category: outcome.category,
    sector: outcome.sector,
    service: outcome.service,
    objective: outcome.objective,
    channel: outcome.channel,
    language: outcome.language,
    level: outcome.level,
    qa_score: outcome.qa_score,
    approved_by_client: outcome.approved_by_client,
    revisions_count: outcome.revisions_count,
    conversion_rate: outcome.conversion_rate,
    lead_count: outcome.lead_count,
    client_rating: outcome.client_rating,
    delivery_time_hours: outcome.delivery_time_hours,
    result_status: outcome.result_status,
    notes: outcome.notes,
    metadata: {
      project_ref: params.project.project_id,
      sku: params.project.sku,
      qa_passed: params.qa.passed,
      phase: params.extra?.phase ?? "C",
      template_pipeline: params.project.template_pipeline ?? null,
    },
  };

  mkdirSync(OUTCOMES_SNAPSHOT_DIR, { recursive: true });
  const snapshotPath = join(OUTCOMES_SNAPSHOT_DIR, `${params.project.project_id}.json`);
  writeFileSync(snapshotPath, JSON.stringify({ outcome, input, recorded_at: new Date().toISOString() }, null, 2));

  if (!learningDbEnabled()) {
    if (resolveStorageMode() === "local") {
      const { id, mode } = await templateOutcomeRepository.recordOutcome(input);
      return { stored: mode, outcome, id };
    }
    return { stored: "json_only", outcome };
  }

  const { id, mode } = await templateOutcomeRepository.recordOutcome(input);
  return { stored: mode, outcome, id };
}
