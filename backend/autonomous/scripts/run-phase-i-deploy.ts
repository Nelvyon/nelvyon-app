#!/usr/bin/env npx tsx
/**
 * Phase I — Staging CDN deploy for restaurant landing preview
 *
 *   pnpm -C apps/web autonomous:phase-h   # generate preview.html first
 *   pnpm -C apps/web autonomous:phase-i   # deploy (dry-run default)
 *
 * Real upload requires:
 *   AUTONOMOUS_STAGING_DEPLOY=true
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *   deploy with dry_run=false via DEPLOY_DRY_RUN=false env
 */

import {
  isAutonomousStagingDeployEnabled,
  resolveDeployDryRun,
} from "../deploy/deployPreviewStaging";
import { runRestaurantLandingPhaseI } from "../pilots/restaurantLandingPhaseI";

async function main(): Promise<void> {
  const deployDryRunEnv = process.env.DEPLOY_DRY_RUN?.trim().toLowerCase();
  const deployDryRun =
    deployDryRunEnv === "false" || deployDryRunEnv === "0" ? false : resolveDeployDryRun();

  const result = await runRestaurantLandingPhaseI({ deploy_dry_run: deployDryRun });

  console.log("\n=== NELVYON Phase I — Staging CDN Deploy ===");
  console.log(`Pilot ID:              ${result.pilot_id}`);
  console.log(`Deploy dry_run:        ${result.deploy.dry_run}`);
  console.log(`AUTONOMOUS_STAGING:    ${isAutonomousStagingDeployEnabled()}`);
  console.log(`Written:               ${result.deploy.written}`);
  console.log(`Mock:                  ${result.deploy.mock}`);
  console.log(`Storage key:           ${result.deploy.storage_key}`);
  console.log(`staging_url:           ${result.deploy.staging_url ?? "(none — dry-run or pending deploy)"}`);
  console.log(`expires_at:            ${result.deploy.expires_at ?? "n/a"}`);
  console.log(`Live QA skipped:       ${result.live_qa.live_skipped}`);
  if (!result.live_qa.live_skipped) {
    console.log(`Live QA score:         ${result.live_qa.comparison.live_score}`);
  }
  console.log(`Local QA score:        ${result.live_qa.comparison.local_score}`);
  console.log(`OS payload dry_run:    ${result.os_publish.dry_run === true}`);
  console.log(`Output:                ${result.output_dir}/`);
  console.log("============================================\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
