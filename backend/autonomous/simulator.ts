/** Autonomous Phase B — local offline simulator */

import { buildOsPublishPayload } from "./publish/osPublishPayload";
import { createProject, executePipeline } from "./pipelines/runPipeline";
import type { AutonomousSku, AutonomousTier, SimulationResult } from "./types";

export interface SimulateOptions {
  sku: AutonomousSku;
  tier?: AutonomousTier;
  brief: Record<string, unknown>;
  os_refs?: {
    client_id: string;
    project_slug: string;
    workspace_id: string;
  };
}

const DEFAULT_OS_REFS = {
  client_id: "os_client_sim_0001",
  project_slug: "SIM-AUTONOMOUS",
  workspace_id: "ws_sim_0001",
};

export function simulateAutonomousJob(options: SimulateOptions): SimulationResult {
  const tier = options.tier ?? "professional";
  const osRefs = {
    ...DEFAULT_OS_REFS,
    project_slug: options.os_refs?.project_slug ?? DEFAULT_OS_REFS.project_slug,
    ...options.os_refs,
  };

  const project = createProject(options.sku, tier, options.brief, osRefs);
  project.status = "PLANNING";

  let qa = executePipeline(project);
  project.qa = qa;

  while (!qa.passed && project.retry_count < project.max_retries) {
    project.retry_count += 1;
    project.status = "RETRYING";
    qa = executePipeline(project);
    project.qa = qa;
  }

  if (qa.passed) {
    project.status = "OS_PUBLISH_READY";
    const os_publish = buildOsPublishPayload(project);
    return { project, os_publish, escalated: false };
  }

  project.status = "ESCALATE_OPERATOR";
  return { project, os_publish: null, escalated: true };
}

export function skuFromCliArg(arg: string): AutonomousSku | null {
  const map: Record<string, AutonomousSku> = {
    landing: "NELVYON-LANDING",
    chatbot: "NELVYON-CHATBOT",
    seo: "NELVYON-SEO",
    "NELVYON-LANDING": "NELVYON-LANDING",
    "NELVYON-CHATBOT": "NELVYON-CHATBOT",
    "NELVYON-SEO": "NELVYON-SEO",
  };
  return map[arg.toLowerCase()] ?? null;
}
