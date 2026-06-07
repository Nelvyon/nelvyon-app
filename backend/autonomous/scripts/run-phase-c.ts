#!/usr/bin/env npx tsx
/**
 * NELVYON Autonomous Phase C — LLM + offline QA
 *
 * Mock (default, no OPENAI_API_KEY):
 *   pnpm -C apps/web autonomous:phase-c all
 *
 * Real LLM (OPENAI_API_KEY set):
 *   set OPENAI_API_KEY=sk-... && pnpm -C apps/web autonomous:phase-c landing
 *
 * Force mock:
 *   set AUTONOMOUS_LLM_MODE=mock && pnpm -C apps/web autonomous:phase-c all
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveLlmMode } from "../llm/llmAdapter";
import { simulatePhaseC } from "../simulatorPhaseC";
import { skuFromCliArg } from "../simulator";
import type { AutonomousSku } from "../types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const FIXTURES = join(ROOT, "fixtures", "briefs");
const OUTPUT = join(ROOT, "output");

const SKU_FIXTURE: Record<AutonomousSku, string> = {
  "NELVYON-LANDING": "landing-heliovolt.json",
  "NELVYON-CHATBOT": "chatbot-sonrisa.json",
  "NELVYON-SEO": "seo-alonso-vega.json",
};

const SKU_SLUG: Record<AutonomousSku, string> = {
  "NELVYON-LANDING": "LANDING-HELIOVOLT-PHASE-C",
  "NELVYON-CHATBOT": "CHATBOT-SONRISA-PHASE-C",
  "NELVYON-SEO": "SEO-ALONSOVEGA-PHASE-C",
};

function loadBrief(file: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(FIXTURES, file), "utf-8")) as Record<string, unknown>;
}

async function runSku(sku: AutonomousSku): Promise<void> {
  const result = await simulatePhaseC({
    sku,
    tier: "professional",
    brief: loadBrief(SKU_FIXTURE[sku]),
    os_refs: {
      client_id: "os_client_phase_c",
      project_slug: SKU_SLUG[sku],
      workspace_id: "ws_phase_c",
    },
    output_dir: OUTPUT,
  });

  const { project, escalated, llm_mode, output_bundle } = result;
  console.log("\n--- NELVYON Phase C ---");
  console.log(`SKU:       ${project.sku}`);
  console.log(`LLM mode:  ${llm_mode}`);
  console.log(`Status:    ${project.status}`);
  console.log(`QA Score:  ${project.qa?.score} (>= 85)`);
  console.log(`Passed:    ${project.qa?.passed}`);
  console.log(`Retries:   ${project.retry_count}`);
  console.log(`Escalated: ${escalated}`);
  if (project.qa?.offline_dimensions) {
    console.log(`Dimensions:`, JSON.stringify(project.qa.offline_dimensions));
  }
  console.log(`Output:    ${OUTPUT}/phase-c/${sku.replace("NELVYON-", "").toLowerCase()}/`);
  console.log(`Dry-run:   ${output_bundle.osPublishPayload?.dry_run === true}`);
  console.log("-----------------------\n");
}

async function main(): Promise<void> {
  const arg = process.argv[2] ?? "all";
  console.log(`[phase-c] LLM resolved mode: ${resolveLlmMode()}`);

  if (arg === "all") {
    for (const sku of ["NELVYON-LANDING", "NELVYON-CHATBOT", "NELVYON-SEO"] as AutonomousSku[]) {
      await runSku(sku);
    }
    return;
  }

  const sku = skuFromCliArg(arg);
  if (!sku) {
    console.error("Usage: landing | chatbot | seo | all");
    process.exit(1);
  }
  await runSku(sku);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
