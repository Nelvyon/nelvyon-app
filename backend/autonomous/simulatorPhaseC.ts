/** Phase C simulator — LLM + offline QA + output bundle */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { resolveLlmMode } from "./llm/llmAdapter";
import { executePipelinePhaseC, initPhaseCProject } from "./pipelines/runPipelinePhaseC";
import { buildOsPublishPayload } from "./publish/osPublishPayload";
import type {
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
  os_refs?: {
    client_id: string;
    project_slug: string;
    workspace_id: string;
  };
  output_dir?: string;
}

const DEFAULT_OS_REFS = {
  client_id: "os_client_sim_0001",
  project_slug: "PHASE-C-AUTONOMOUS",
  workspace_id: "ws_sim_0001",
};

export async function simulatePhaseC(options: PhaseCOptions): Promise<PhaseCResult> {
  const tier = options.tier ?? "professional";
  const llmMode = resolveLlmMode();
  const osRefs = { ...DEFAULT_OS_REFS, ...options.os_refs };

  const project = initPhaseCProject(options.sku, tier, options.brief, osRefs, llmMode);
  project.status = "PLANNING";

  const retryHistory: RetryHistoryEntry[] = [];

  let qa = await executePipelinePhaseC(project);
  project.qa = qa;
  retryHistory.push(historyEntry(1, qa));

  while (!qa.passed && project.retry_count < project.max_retries) {
    project.retry_count += 1;
    project.status = "RETRYING";
    qa = await executePipelinePhaseC(project);
    project.qa = qa;
    retryHistory.push(historyEntry(project.retry_count + 1, qa));
  }

  project.retry_history = retryHistory;

  let os_publish = null;
  let escalated = false;

  if (qa.passed) {
    project.status = "OS_PUBLISH_READY";
    os_publish = buildOsPublishPayload(project);
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

function historyEntry(attempt: number, qa: QaResult): RetryHistoryEntry {
  return {
    attempt,
    score: qa.score,
    passed: qa.passed,
    failed_agents: qa.failed_agents,
    target_agent: qa.retry_recommendation?.target_agent ?? null,
    reason: qa.retry_recommendation?.reason ?? null,
    at: qa.evaluated_at,
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
