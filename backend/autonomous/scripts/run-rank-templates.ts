#!/usr/bin/env npx tsx
/**
 * Phase M — Rank templates from DB/local outcomes
 *
 *   pnpm -C apps/web autonomous:rank-templates
 */

import { runRankTemplatesJob } from "../learning/runRankTemplatesJob";

async function main(): Promise<void> {
  const result = await runRankTemplatesJob();

  const topSlice = [...result.ranked_slices].sort(
    (a, b) => (b.ranked[0]?.final_template_score ?? 0) - (a.ranked[0]?.final_template_score ?? 0),
  )[0];

  console.log("\n=== NELVYON Phase M — Rank Templates Job ===");
  console.log(`Storage:        ${result.report.storage_mode}`);
  console.log(`Outcomes:       ${result.report.outcomes_count}`);
  console.log(`Ranked slices:  ${result.report.ranked_slices}`);
  console.log(
    `Autonomía:      ${result.report.autonomy_pct.previous}% → ${result.report.autonomy_pct.current}% (+${result.report.autonomy_pct.delta})`,
  );
  if (topSlice?.ranked[0]) {
    const s = topSlice.slice;
    console.log(
      `Top slice:      ${s.sector}/${s.service} → ${topSlice.ranked[0].template_id} (${topSlice.ranked[0].final_template_score})`,
    );
  }
  console.log(`Output:         ${result.output_dir}/`);
  console.log("  rankings.json · learningReport.json");
  console.log("==========================================\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
