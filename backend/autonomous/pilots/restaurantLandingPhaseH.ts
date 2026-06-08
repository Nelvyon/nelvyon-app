/** Phase H — restaurant landing preview staging (builder + QA + OS handoff dry-run) */

import { mkdirSync, writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildPhaseHPublishPayload, buildQaReport } from "../publish/buildPhaseHPublishPayload";
import { runPlaywrightStagingQa, stagingQaBlocksPublish } from "../qa/playwrightStagingQa";
import { recordPostQaOutcome } from "../templates/recordPostQaOutcome";
import { simulatePhaseC } from "../simulatorPhaseC";
import { buildLandingStagingIsolated } from "../wrappers/landingBuilderStaging";
import type { OsPublishPayload } from "../types";
import type { StagingQaResult } from "../qa/playwrightStagingQa";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PILOT_FIXTURE = join(ROOT, "fixtures", "restaurant-landing-pilot.json");
export const DEFAULT_PHASE_H_OUTPUT = join(ROOT, "output", "phase-h", "restaurant-landing");

export interface RestaurantPhaseHResult {
  pilot_id: string;
  preview_html: string;
  qa_score: number;
  qa_passed: boolean;
  staging_qa: StagingQaResult;
  os_publish: OsPublishPayload;
  output_dir: string;
  preview_path: string;
}

export function loadRestaurantPilotBrief(): Record<string, unknown> {
  return JSON.parse(readFileSync(PILOT_FIXTURE, "utf-8")) as Record<string, unknown>;
}

export async function runRestaurantLandingPhaseH(options?: {
  output_dir?: string;
}): Promise<RestaurantPhaseHResult> {
  const brief = loadRestaurantPilotBrief();
  const pilotId = String(brief.pilot_id ?? "phase-f-restaurant-landing-v1");
  const outDir = options?.output_dir ?? DEFAULT_PHASE_H_OUTPUT;

  const phaseC = await simulatePhaseC({
    sku: "NELVYON-LANDING",
    tier: "professional",
    brief,
    sector: "restaurant",
    os_refs: {
      client_id: "os_client_pilot_rest",
      project_slug: "LANDING-RESERVA-DIRECTA",
      workspace_id: "ws_pilot_h",
    },
    output_dir: outDir,
  });

  const staging = buildLandingStagingIsolated({
    brief: phaseC.project.brief,
    copy: phaseC.project.artifacts.copy as Record<string, unknown>,
    design: phaseC.project.artifacts.design as Record<string, unknown>,
  });

  phaseC.project.artifacts.build = staging.build;
  phaseC.project.artifacts.blocks = staging.blocks;
  phaseC.project.artifacts.preview_html = staging.html;
  phaseC.project.artifacts.assets_manifest = staging.assets_manifest;
  phaseC.project.artifacts.preview_metadata = staging.preview_metadata;

  const stagingQa = await runPlaywrightStagingQa(staging.html);
  phaseC.project.artifacts.playwright_staging_qa = stagingQa;

  const offlineScore = phaseC.project.qa?.score ?? 0;
  const qaPassed =
    offlineScore >= 85 && stagingQa.passed && !stagingQaBlocksPublish(stagingQa);

  const combinedQaScore = Math.min(100, Math.round((offlineScore + stagingQa.score) / 2));
  const qaReport = buildQaReport({
    offline_score: offlineScore,
    staging_qa: stagingQa,
    passed: qaPassed,
  });
  phaseC.project.artifacts.qa_report = qaReport;

  const templateId =
    phaseC.project.template_pipeline?.selected_template_id ??
    String((phaseC.project.artifacts.plan as { template_id?: string })?.template_id ?? "landing-cro-v3");
  if (phaseC.project.qa) {
    await recordPostQaOutcome({
      project: phaseC.project,
      qa: { ...phaseC.project.qa, score: combinedQaScore, passed: qaPassed },
      templateId,
      extra: { phase: "H", combined_qa_score: combinedQaScore },
    });
  }

  const osPublish = buildPhaseHPublishPayload(phaseC.project, {
    preview_metadata: staging.preview_metadata,
    qa_report: qaReport,
    assets_manifest: staging.assets_manifest,
  });

  mkdirSync(outDir, { recursive: true });
  const previewPath = join(outDir, "preview.html");
  writeFileSync(previewPath, staging.html, "utf-8");
  writeFileSync(join(outDir, "assetsManifest.json"), JSON.stringify(staging.assets_manifest, null, 2));
  writeFileSync(join(outDir, "previewMetadata.json"), JSON.stringify(staging.preview_metadata, null, 2));
  writeFileSync(join(outDir, "qaReport.json"), JSON.stringify(qaReport, null, 2));
  writeFileSync(join(outDir, "playwrightStagingQa.json"), JSON.stringify(stagingQa, null, 2));
  writeFileSync(join(outDir, "osPublishPayload.json"), JSON.stringify(osPublish, null, 2));
  writeFileSync(join(outDir, "blocks.json"), JSON.stringify(staging.blocks, null, 2));

  return {
    pilot_id: pilotId,
    preview_html: staging.html,
    qa_score: Math.min(100, Math.round((offlineScore + stagingQa.score) / 2)),
    qa_passed: qaPassed,
    staging_qa: stagingQa,
    os_publish: osPublish,
    output_dir: outDir,
    preview_path: previewPath,
  };
}
