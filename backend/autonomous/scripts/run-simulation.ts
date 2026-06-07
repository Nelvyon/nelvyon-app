#!/usr/bin/env npx tsx
/**
 * NELVYON Autonomous Phase B — offline simulator CLI
 * No DB, no external APIs, no portal publish.
 *
 * Usage:
 *   pnpm -C apps/web exec tsx ../../backend/autonomous/scripts/run-simulation.ts landing
 *   pnpm -C apps/web exec tsx ../../backend/autonomous/scripts/run-simulation.ts all
 */

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { simulateAutonomousJob, skuFromCliArg } from "../simulator";
import type { AutonomousSku, SimulationResult } from "../types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const FIXTURES = join(ROOT, "fixtures", "briefs");
const OUTPUT_DIR = join(ROOT, "output");

const SKU_FIXTURE: Record<AutonomousSku, string> = {
  "NELVYON-LANDING": "landing-heliovolt.json",
  "NELVYON-CHATBOT": "chatbot-sonrisa.json",
  "NELVYON-SEO": "seo-alonso-vega.json",
};

const SKU_SLUG: Record<AutonomousSku, string> = {
  "NELVYON-LANDING": "LANDING-HELIOVOLT-SIM",
  "NELVYON-CHATBOT": "CHATBOT-SONRISA-SIM",
  "NELVYON-SEO": "SEO-ALONSOVEGA-SIM",
};

function loadBrief(filename: string): Record<string, unknown> {
  const raw = readFileSync(join(FIXTURES, filename), "utf-8");
  return JSON.parse(raw) as Record<string, unknown>;
}

function runOne(sku: AutonomousSku): SimulationResult {
  const brief = loadBrief(SKU_FIXTURE[sku]);
  return simulateAutonomousJob({
    sku,
    tier: "professional",
    brief,
    os_refs: {
      client_id: "os_client_sim_0001",
      project_slug: SKU_SLUG[sku],
      workspace_id: "ws_sim_0001",
    },
  });
}

function writeOutput(sku: AutonomousSku, result: SimulationResult): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const slug = sku.replace("NELVYON-", "").toLowerCase();
  writeFileSync(join(OUTPUT_DIR, `${slug}-project.json`), JSON.stringify(result.project, null, 2));
  if (result.os_publish) {
    writeFileSync(join(OUTPUT_DIR, `${slug}-os-publish.json`), JSON.stringify(result.os_publish, null, 2));
  }
}

function printSummary(result: SimulationResult): void {
  const { project, os_publish, escalated } = result;
  console.log("\n--- NELVYON Autonomous Simulation (Phase B) ---");
  console.log(`SKU:        ${project.sku}`);
  console.log(`Status:     ${project.status}`);
  console.log(`QA Score:   ${project.qa?.score ?? "n/a"} (threshold 85)`);
  console.log(`Passed:     ${project.qa?.passed ?? false}`);
  console.log(`Retries:    ${project.retry_count}`);
  console.log(`Escalated:  ${escalated}`);
  console.log(`Agents run: ${project.agent_log.length}`);
  if (os_publish) {
    console.log(`Deliverables (dry-run): ${os_publish.deliverables.length}`);
    console.log(`OS actions (not executed): ${os_publish.os_actions.length}`);
  }
  console.log("-----------------------------------------------\n");
}

function main(): void {
  const arg = process.argv[2] ?? "all";

  if (arg === "all") {
    const skus: AutonomousSku[] = ["NELVYON-LANDING", "NELVYON-CHATBOT", "NELVYON-SEO"];
    for (const sku of skus) {
      const result = runOne(sku);
      writeOutput(sku, result);
      printSummary(result);
    }
    console.log(`Outputs written to ${OUTPUT_DIR}`);
    return;
  }

  const sku = skuFromCliArg(arg);
  if (!sku) {
    console.error(`Unknown SKU: ${arg}. Use landing | chatbot | seo | all`);
    process.exit(1);
  }

  const result = runOne(sku);
  writeOutput(sku, result);
  printSummary(result);
  console.log(`Outputs written to ${OUTPUT_DIR}`);

  if (result.escalated) process.exit(2);
}

main();
