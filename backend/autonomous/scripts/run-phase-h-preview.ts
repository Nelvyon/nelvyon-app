#!/usr/bin/env npx tsx
/**
 * Phase H — Restaurant landing preview staging
 *
 *   pnpm -C apps/web autonomous:phase-h
 */

import { runRestaurantLandingPhaseH } from "../pilots/restaurantLandingPhaseH";

async function main(): Promise<void> {
  const result = await runRestaurantLandingPhaseH();

  console.log("\n=== NELVYON Phase H — Landing Preview Staging ===");
  console.log(`Pilot ID:     ${result.pilot_id}`);
  console.log(`QA Score:     ${result.qa_score} (combined offline + Playwright)`);
  console.log(`QA Passed:    ${result.qa_passed}`);
  console.log(`Playwright:   ${result.staging_qa.mode} — ${result.staging_qa.passed ? "PASS" : "FAIL"} (${result.staging_qa.score}/100)`);
  console.log(`Checks:       ${result.staging_qa.checks.filter((c) => c.passed).length}/${result.staging_qa.checks.length}`);
  console.log(`Dry-run OS:   ${result.os_publish.dry_run === true}`);
  console.log(`Preview:      ${result.preview_path}`);
  console.log(`Output:       ${result.output_dir}/`);
  console.log("=================================================\n");

  if (!result.qa_passed) {
    console.error("[phase-h] QA gate failed — see qaReport.json");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
