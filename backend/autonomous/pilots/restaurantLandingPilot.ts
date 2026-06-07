/** Phase F — controlled restaurant landing autonomous pilot */

import { mkdirSync, writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { renderLandingPreviewHtml } from "../preview/renderLandingPreviewHtml";
import { runPlaywrightOfflineQa } from "../qa/playwrightOfflineQa";
import { simulatePhaseC } from "../simulatorPhaseC";
import type { PlaywrightQaResult } from "../qa/playwrightOfflineQa";
import type { OsPublishPayload, PhaseCResult } from "../types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PILOT_FIXTURE = join(ROOT, "fixtures", "restaurant-landing-pilot.json");
const DEFAULT_OUTPUT = join(ROOT, "output", "phase-f", "restaurant-landing");

export interface RestaurantPilotResult {
  phase_c: PhaseCResult;
  qa_score: number;
  qa_passed: boolean;
  sector: string;
  escalated: boolean;
  os_publish: OsPublishPayload | null;
  preview_html: string;
  playwright_qa: PlaywrightQaResult;
  artifacts_keys: string[];
  pilot_id: string;
}

export function loadRestaurantPilotBrief(): Record<string, unknown> {
  return JSON.parse(readFileSync(PILOT_FIXTURE, "utf-8")) as Record<string, unknown>;
}

export async function runRestaurantLandingPilot(options?: {
  output_dir?: string;
}): Promise<RestaurantPilotResult> {
  const brief = loadRestaurantPilotBrief();
  const pilotId = String(brief.pilot_id ?? "phase-f-restaurant-landing-v1");

  const phaseC = await simulatePhaseC({
    sku: "NELVYON-LANDING",
    tier: "professional",
    brief,
    sector: "restaurant",
    os_refs: {
      client_id: "os_client_pilot_rest",
      project_slug: "PILOT-RESTAURANT-LANDING-F",
      workspace_id: "ws_pilot_f",
    },
    output_dir: options?.output_dir ?? DEFAULT_OUTPUT,
  });

  const previewHtml = renderLandingPreviewHtml({
    brief: phaseC.project.brief,
    copy: phaseC.project.artifacts.copy as Record<string, unknown>,
    design: phaseC.project.artifacts.design as Record<string, unknown>,
  });

  phaseC.project.artifacts.preview_html = previewHtml;
  phaseC.project.artifacts.pilot = {
    id: pilotId,
    sector: "restaurant",
    sku: "NELVYON-LANDING",
    phase: "F",
  };

  const playwrightQa = await runPlaywrightOfflineQa(previewHtml);
  phaseC.project.artifacts.playwright_qa = playwrightQa;

  const outDir = options?.output_dir ?? DEFAULT_OUTPUT;
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "preview.html"), previewHtml, "utf-8");
  writeFileSync(join(outDir, "playwrightQa.json"), JSON.stringify(playwrightQa, null, 2));
  if (phaseC.os_publish) {
    const publish = {
      ...phaseC.os_publish,
      artifacts: phaseC.project.artifacts,
      note: `${phaseC.os_publish.note} | Phase F pilot=${pilotId}`,
    };
    writeFileSync(join(outDir, "osPublishPayload.json"), JSON.stringify(publish, null, 2));
  }

  return {
    phase_c: phaseC,
    qa_score: phaseC.project.qa?.score ?? 0,
    qa_passed: phaseC.project.qa?.passed ?? false,
    sector: phaseC.project.sector ?? "restaurant",
    escalated: phaseC.escalated,
    os_publish: phaseC.os_publish,
    preview_html: previewHtml,
    playwright_qa: playwrightQa,
    artifacts_keys: Object.keys(phaseC.project.artifacts),
    pilot_id: pilotId,
  };
}

/** Build OsPublishPayload shape for Phase D dry-run (requires real OS UUIDs at publish time) */
export function buildPilotPublishBodyForDryRun(
  result: RestaurantPilotResult,
  osRefs: { client_id: string; project_id: string; workspace_id: number },
): Record<string, unknown> {
  const payload = result.os_publish;
  if (!payload) throw new Error("Pilot did not produce os_publish payload");
  return {
    ...payload,
    dry_run: true,
    sector: "restaurant",
    os_refs: {
      client_id: osRefs.client_id,
      project_id: osRefs.project_id,
      project_slug: "PILOT-RESTAURANT-LANDING-F",
      workspace_id: osRefs.workspace_id,
    },
    artifacts: result.phase_c.project.artifacts,
    qa_score: result.qa_score,
  };
}
