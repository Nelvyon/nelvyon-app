#!/usr/bin/env npx tsx
/**
 * Phase K — Learning Engine CLI
 *
 *   pnpm -C apps/web autonomous:learning
 */

import { runLearningEngine } from "../learning/runLearningEngine";

async function main(): Promise<void> {
  const result = runLearningEngine();

  const restaurant = result.report.selections.find((s) => s.slice.sector === "restaurant" && s.slice.service === "landing");
  const topGlobal = [...result.report.selections].sort(
    (a, b) => b.final_template_score - a.final_template_score,
  )[0];

  console.log("\n=== NELVYON Phase K — Learning Engine ===");
  console.log(`Registry:       v${result.report.registry_version}`);
  console.log(`Outcomes:       ${result.report.outcomes_count} (mock + Phase H/I)`);
  console.log(`Events:         ${result.report.events_count}`);
  console.log(`Ranked slices:  ${result.report.ranked_slices}`);
  console.log(`Autonomía:      ${result.report.autonomy_pct.previous}% → ${result.report.autonomy_pct.current}% (+${result.report.autonomy_pct.delta})`);
  if (restaurant) {
    console.log(`Best restaurant/landing: ${restaurant.selected_template_id} (score ${restaurant.final_template_score})`);
  }
  if (topGlobal) {
    console.log(`Top selection:  ${topGlobal.selected_template_id} @ ${topGlobal.slice.sector}/${topGlobal.slice.service} (${topGlobal.final_template_score})`);
  }
  console.log(`Output:         ${result.output_dir}/`);
  console.log("  rankings.json · selections.json · learningReport.json");
  console.log("========================================\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
