#!/usr/bin/env npx tsx
/**
 * Phase F — Restaurant landing autonomous pilot
 *
 *   pnpm -C apps/web autonomous:phase-f
 */

import { runRestaurantLandingPilot } from "../pilots/restaurantLandingPilot";

async function main(): Promise<void> {
  const result = await runRestaurantLandingPilot();

  console.log("\n=== NELVYON Phase F — Restaurant Landing Pilot ===");
  console.log(`Pilot ID:     ${result.pilot_id}`);
  console.log(`Sector:       ${result.sector}`);
  console.log(`QA Score:     ${result.qa_score} (>= 85)`);
  console.log(`QA Passed:    ${result.qa_passed}`);
  console.log(`Escalated:    ${result.escalated}`);
  console.log(`Playwright:   ${result.playwright_qa.mode} — ${result.playwright_qa.passed ? "PASS" : "FAIL"}`);
  console.log(`Artifacts:    ${result.artifacts_keys.join(", ")}`);
  console.log(`Dry-run:      ${result.os_publish?.dry_run === true}`);
  console.log(`Output:       backend/autonomous/output/phase-f/restaurant-landing/`);
  console.log("================================================\n");

  if (!result.qa_passed || result.qa_score < 85) {
    process.exit(1);
  }
  if (!result.playwright_qa.passed) {
    console.warn("[phase-f] Playwright QA failed — see playwrightQa.json");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
