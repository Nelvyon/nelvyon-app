/** Phase I — restaurant landing staging CDN deploy + live QA + OS handoff */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { deployPreviewStaging, resolveDeployDryRun } from "../deploy/deployPreviewStaging";
import { buildPhaseIPublishPayload } from "../publish/buildPhaseIPublishPayload";
import { runLiveQaComparison } from "../qa/playwrightLiveQa";
import { DEFAULT_PHASE_H_OUTPUT, runRestaurantLandingPhaseH } from "./restaurantLandingPhaseH";
import type { DeployPreviewResult } from "../deploy/types";
import type { LiveQaComparison } from "../qa/playwrightLiveQa";
import type { OsPublishPayload } from "../types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
export const DEFAULT_PHASE_I_OUTPUT = join(ROOT, "output", "phase-i", "restaurant-landing");

export interface RestaurantPhaseIResult {
  pilot_id: string;
  deploy: DeployPreviewResult;
  live_qa: LiveQaComparison;
  os_publish: OsPublishPayload;
  output_dir: string;
  preview_path: string;
  staging_url: string | null;
}

export interface PhaseIOptions {
  output_dir?: string;
  phase_h_dir?: string;
  deploy_dry_run?: boolean;
  run_phase_h_if_missing?: boolean;
}

async function ensurePhaseHPreview(options: PhaseIOptions): Promise<{
  preview_path: string;
  preview_html: string;
  pilot_id: string;
  phase_h_dir: string;
  artifacts: Record<string, unknown>;
  project: import("../types").AutonomousProject;
}> {
  const phaseHDir = options.phase_h_dir ?? DEFAULT_PHASE_H_OUTPUT;
  const previewPath = join(phaseHDir, "preview.html");

  if (!existsSync(previewPath)) {
    if (options.run_phase_h_if_missing === false) {
      throw new Error(`Phase H preview missing: ${previewPath}. Run autonomous:phase-h first.`);
    }
    await runRestaurantLandingPhaseH({ output_dir: phaseHDir });
  }

  const previewHtml = readFileSync(previewPath, "utf-8");
  const brief = JSON.parse(
    readFileSync(join(ROOT, "fixtures", "restaurant-landing-pilot.json"), "utf-8"),
  ) as Record<string, unknown>;
  const pilotId = String(brief.pilot_id ?? "phase-f-restaurant-landing-v1");

  let artifacts: Record<string, unknown> = {};
  const artifactsPath = join(phaseHDir, "previewMetadata.json");
  if (existsSync(join(phaseHDir, "osPublishPayload.json"))) {
    const pub = JSON.parse(readFileSync(join(phaseHDir, "osPublishPayload.json"), "utf-8")) as {
      artifacts?: Record<string, unknown>;
    };
    artifacts = pub.artifacts ?? {};
  }

  const previewMeta = existsSync(artifactsPath)
    ? JSON.parse(readFileSync(artifactsPath, "utf-8"))
    : { phase: "H" };

  const project: import("../types").AutonomousProject = {
    project_id: `phase-i-${pilotId}`,
    sku: "NELVYON-LANDING",
    tier: "professional",
    brief,
    os_refs: {
      client_id: "os_client_pilot_rest",
      project_slug: "LANDING-RESERVA-DIRECTA",
      workspace_id: "ws_pilot_i",
    },
    artifacts: { ...artifacts, preview_metadata: previewMeta },
    agent_log: [],
    retry_count: 0,
    simulation_mode: "phase-i-staging-deploy",
    status: "OS_PUBLISH_READY",
    sector: "restaurant",
    qa: {
      score: 100,
      passed: true,
      threshold: 85,
      sku: "NELVYON-LANDING",
      dimensions: {},
      blocking_failures: [],
      warnings: [],
      failed_agents: [],
      retry_recommendation: null,
      evaluated_at: new Date().toISOString(),
      artifact_versions: {},
      checks: [],
    },
  };

  return {
    preview_path: previewPath,
    preview_html: previewHtml,
    pilot_id: pilotId,
    phase_h_dir: phaseHDir,
    artifacts,
    project,
  };
}

export async function runRestaurantLandingPhaseI(options?: PhaseIOptions): Promise<RestaurantPhaseIResult> {
  const outDir = options?.output_dir ?? DEFAULT_PHASE_I_OUTPUT;
  const deployDryRun = resolveDeployDryRun(options?.deploy_dry_run);

  const phaseH = await ensurePhaseHPreview(options ?? {});

  const deploy = await deployPreviewStaging({
    html: phaseH.preview_html,
    pilot_id: phaseH.pilot_id,
    source_html_path: phaseH.preview_path,
    dry_run: deployDryRun,
  });

  const liveQa = await runLiveQaComparison(phaseH.preview_html, deploy.staging_url);

  const qaReport = {
    ...(typeof phaseH.artifacts.qa_report === "object" && phaseH.artifacts.qa_report !== null
      ? (phaseH.artifacts.qa_report as Record<string, unknown>)
      : {}),
    phase: "I",
    deploy_written: deploy.written,
    live_qa: {
      live_skipped: liveQa.live_skipped,
      live_skip_reason: liveQa.live_skip_reason,
      comparison: liveQa.comparison,
    },
    generated_at: new Date().toISOString(),
  };

  const osPublish = buildPhaseIPublishPayload(phaseH.project, {
    deploy,
    live_qa: liveQa,
    preview_metadata: (phaseH.artifacts.preview_metadata as Record<string, unknown>) ?? { phase: "H" },
    qa_report: qaReport,
    assets_manifest: (phaseH.artifacts.assets_manifest as Record<string, unknown>) ?? {},
  });

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "deploy_metadata.json"), JSON.stringify(deploy.metadata, null, 2));
  writeFileSync(join(outDir, "liveQaComparison.json"), JSON.stringify(liveQa, null, 2));
  writeFileSync(join(outDir, "qaReport.json"), JSON.stringify(qaReport, null, 2));
  writeFileSync(join(outDir, "osPublishPayload.json"), JSON.stringify(osPublish, null, 2));
  writeFileSync(join(outDir, "preview.html"), phaseH.preview_html, "utf-8");

  return {
    pilot_id: phaseH.pilot_id,
    deploy,
    live_qa: liveQa,
    os_publish: osPublish,
    output_dir: outDir,
    preview_path: phaseH.preview_path,
    staging_url: deploy.staging_url,
  };
}
