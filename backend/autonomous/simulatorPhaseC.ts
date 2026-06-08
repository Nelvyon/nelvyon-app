/** Phase C simulator — LLM + offline QA + output bundle + Phase L template learning */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { resolveLlmMode } from "./llm/llmAdapter";
import { executePipelinePhaseC, initPhaseCProject } from "./pipelines/runPipelinePhaseC";
import { buildOsPublishPayload } from "./publish/osPublishPayload";
import { requiresOperatorEscalation } from "./sectors/sectorQa";
import { pickPipelineTemplate, skuToTemplateContext } from "./templates/pipelineTemplateSelector";
import { recordPostQaOutcome } from "./templates/recordPostQaOutcome";
import type {
  AutonomousSector,
  AutonomousSku,
  AutonomousTier,
  PhaseCOutputBundle,
  PhaseCResult,
  QaResult,
  RetryHistoryEntry,
} from "./types";

export interface PhaseCOptions {
  sku: AutonomousSku;
  tier?: AutonomousTier;
  brief: Record<string, unknown>;
  /** Phase E — explicit sector or inferred from brief.sector */
  sector?: AutonomousSector | string | null;
  os_refs?: {
    client_id: string;
    project_slug: string;
    workspace_id: string;
  };
  output_dir?: string;
  /** Phase L — path to rankings.json override */
  rankings_path?: string;
}

const DEFAULT_OS_REFS = {
  client_id: "os_client_sim_0001",
  project_slug: "PHASE-C-AUTONOMOUS",
  workspace_id: "ws_sim_0001",
};

const QA_PASS_THRESHOLD = 85;

export async function simulatePhaseC(options: PhaseCOptions): Promise<PhaseCResult> {
  const tier = options.tier ?? "professional";
  const llmMode = resolveLlmMode();
  const osRefs = { ...DEFAULT_OS_REFS, ...options.os_refs };

  const project = initPhaseCProject(
    options.sku,
    tier,
    options.brief,
    osRefs,
    llmMode,
    options.sector,
  );
  project.status = "PLANNING";

  const retryHistory: RetryHistoryEntry[] = [];
  const usedTemplateIds: string[] = [];
  const ctx = skuToTemplateContext(project.sku);
  const sector = project.sector ?? String(project.brief.sector ?? "general");

  async function runAttempt(): Promise<QaResult> {
    const pick = await pickPipelineTemplate({
      sector,
      service: ctx.service,
      category: ctx.category,
      level: tier,
      usedTemplateIds,
      rankingsPath: options.rankings_path,
    });

    usedTemplateIds.push(pick.template_id);
    project.template_pipeline = {
      selected_template_id: pick.template_id,
      final_template_score: pick.final_template_score,
      source: pick.source,
      used_template_ids: [...usedTemplateIds],
      skipped_low_score: pick.skipped_low_score,
    };
    project.brief = { ...project.brief, _selected_template_id: pick.template_id };

    const qa = await executePipelinePhaseC(project);

    await recordPostQaOutcome({
      project,
      qa,
      templateId: pick.template_id,
      extra: { phase: "C" },
    });

    return qa;
  }

  let qa = await runAttempt();
  project.qa = qa;
  retryHistory.push(historyEntry(1, qa, project));

  while (!qa.passed && qa.score < QA_PASS_THRESHOLD && project.retry_count < project.max_retries) {
    project.retry_count += 1;
    project.status = "RETRYING";
    qa = await runAttempt();
    project.qa = qa;
    retryHistory.push(historyEntry(project.retry_count + 1, qa, project));
  }

  project.retry_history = retryHistory;

  let os_publish = null;
  let escalated = false;

  if (qa.passed) {
    const sectorEscalate =
      project.sector != null && requiresOperatorEscalation(project.sector);
    project.sector_escalation = sectorEscalate ?? false;
    if (sectorEscalate) {
      project.status = "ESCALATE_OPERATOR";
      escalated = true;
      os_publish = buildOsPublishPayload(project, { dry_run: true });
    } else {
      project.status = "OS_PUBLISH_READY";
      os_publish = buildOsPublishPayload(project);
    }
  } else {
    project.status = "ESCALATE_OPERATOR";
    escalated = true;
  }

  const output_bundle: PhaseCOutputBundle = {
    artifacts: project.artifacts,
    qaResult: qa,
    retryHistory,
    osPublishPayload: os_publish,
    llm_mode: llmMode,
    phase: "C",
  };

  if (options.output_dir) {
    writePhaseCOutput(options.output_dir, options.sku, project, output_bundle);
  }

  return { project, os_publish, escalated, output_bundle, llm_mode: llmMode };
}

function historyEntry(
  attempt: number,
  qa: QaResult,
  project: PhaseCResult["project"],
): RetryHistoryEntry {
  return {
    attempt,
    score: qa.score,
    passed: qa.passed,
    failed_agents: qa.failed_agents,
    target_agent: qa.retry_recommendation?.target_agent ?? null,
    reason: qa.retry_recommendation?.reason ?? null,
    at: qa.evaluated_at,
    template_id: project.template_pipeline?.selected_template_id ?? null,
    final_template_score: project.template_pipeline?.final_template_score ?? null,
    template_source: project.template_pipeline?.source ?? null,
  };
}

export function writePhaseCOutput(
  baseDir: string,
  sku: AutonomousSku,
  project: PhaseCResult["project"],
  bundle: PhaseCOutputBundle,
): void {
  const slug = sku.replace("NELVYON-", "").toLowerCase();
  const dir = join(baseDir, "phase-c", slug);
  mkdirSync(dir, { recursive: true });

  writeFileSync(join(dir, "artifacts.json"), JSON.stringify(bundle.artifacts, null, 2));
  writeFileSync(join(dir, "qaResult.json"), JSON.stringify(bundle.qaResult, null, 2));
  writeFileSync(join(dir, "retryHistory.json"), JSON.stringify(bundle.retryHistory, null, 2));
  if (bundle.osPublishPayload) {
    writeFileSync(join(dir, "osPublishPayload.json"), JSON.stringify(bundle.osPublishPayload, null, 2));
  }
  writeFileSync(join(dir, "project.json"), JSON.stringify(project, null, 2));
}
