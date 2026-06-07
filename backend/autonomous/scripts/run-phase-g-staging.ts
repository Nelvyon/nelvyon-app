#!/usr/bin/env npx tsx
/**
 * Phase G — Restaurant landing pilot → controlled OS staging publish
 *
 *   pnpm -C apps/web autonomous:phase-f   # generate osPublishPayload.json first
 *   pnpm -C apps/web autonomous:phase-g   # prepare staging payload (+ optional POST)
 *
 * Env (staging refs):
 *   OS_PILOT_CLIENT_ID, OS_PILOT_PROJECT_ID, OS_PILOT_WORKSPACE_ID (default 1)
 *
 * Env (optional live POST):
 *   NELVYON_API_URL, OPERATOR_JWT
 *   AUTONOMOUS_PRODUCTION=true  → dry_run=false in prepared payload
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { postOsAutonomousPublish } from "../publish/osPublishClient";
import {
  DEFAULT_PHASE_F_PAYLOAD,
  isAutonomousProductionEnabled,
  loadPhaseFPublishPayload,
  loadPhaseGStagingRefsFromEnv,
  PHASE_G_PILOT,
  preparePhaseGStagingPayload,
} from "../publish/preparePhaseGStagingPayload";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "..", "output", "phase-g", "restaurant-landing");

async function main(): Promise<void> {
  const basePayload = loadPhaseFPublishPayload(DEFAULT_PHASE_F_PAYLOAD);
  const refs = loadPhaseGStagingRefsFromEnv();
  const prepared = preparePhaseGStagingPayload(basePayload, refs);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = join(OUTPUT_DIR, "osPublishPayload.staging.json");
  writeFileSync(outPath, JSON.stringify(prepared, null, 2), "utf-8");

  console.log("\n=== NELVYON Phase G — OS Staging (Restaurant Landing) ===");
  console.log(`Cliente:      ${PHASE_G_PILOT.client_name}`);
  console.log(`Proyecto:     ${PHASE_G_PILOT.project_name}`);
  console.log(`SKU:          ${PHASE_G_PILOT.sku}`);
  console.log(`Sector:       ${PHASE_G_PILOT.sector}`);
  console.log(`QA Score:     ${prepared.qa_score}`);
  console.log(`dry_run:      ${prepared.dry_run}`);
  console.log(`AUTONOMOUS_PRODUCTION: ${isAutonomousProductionEnabled()}`);
  console.log(`Payload:      ${outPath}`);
  console.log("=========================================================\n");

  const apiUrl = process.env.NELVYON_API_URL?.trim();
  const token = process.env.OPERATOR_JWT?.trim();

  if (apiUrl && token) {
    const result = await postOsAutonomousPublish(prepared, {
      baseUrl: apiUrl,
      workspaceId: refs.workspace_id,
      bearerToken: token,
    });
    const resultPath = join(OUTPUT_DIR, "publishResult.json");
    writeFileSync(resultPath, JSON.stringify(result, null, 2), "utf-8");
    console.log(`POST result:  ${result.message}`);
    console.log(`written:      ${result.written}`);
    console.log(`created:      ${result.created.length}`);
    console.log(`Saved:        ${resultPath}`);
  } else {
    console.log("Skip POST — set NELVYON_API_URL + OPERATOR_JWT to publish via API.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
