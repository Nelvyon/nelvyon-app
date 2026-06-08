#!/usr/bin/env npx tsx
/**
 * Phase P — Learning refresh (staging cron / manual)
 *
 *   pnpm -C apps/web autonomous:learning-refresh
 *
 * Mock GA4:
 *   AUTONOMOUS_GA4_MOCK=realistic pnpm -C apps/web autonomous:learning-refresh
 */

import { runLearningRefreshJob } from "../learning/runLearningRefreshJob";

async function main(): Promise<void> {
  const source = process.env.AUTONOMOUS_LEARNING_CRON === "true" ? "cron" : "manual";
  const realisticMock = process.env.AUTONOMOUS_GA4_MOCK === "realistic";

  const result = await runLearningRefreshJob({
    source,
    realistic_mock: realisticMock,
  });

  console.log("\n=== NELVYON Phase P — Learning Refresh ===");
  console.log(`Source:         ${result.report.source}`);
  console.log(`Storage:        ${result.report.storage_mode}`);
  console.log(`Steps:          ${result.report.steps_completed.join(" → ")}`);
  console.log(`Alerts:         ${result.report.alerts_count}`);
  console.log(
    `Autonomía:      ${result.report.autonomy_pct.previous}% → ${result.report.autonomy_pct.current}% (+${result.report.autonomy_pct.delta})`,
  );
  if (result.alerts.length) {
    console.log("Top alerts:");
    for (const a of result.alerts.slice(0, 5)) {
      console.log(`  [${a.severity}] ${a.type}: ${a.message}`);
    }
  }
  console.log(`Exports:        ${result.export_dir}/`);
  console.log("  rankings.csv · outcomes.csv · sector_summary.csv");
  console.log("==========================================\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
