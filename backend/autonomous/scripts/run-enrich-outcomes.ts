#!/usr/bin/env npx tsx
/**
 * Phase N — Enrich outcomes with GA4 + refresh rankings
 *
 *   pnpm -C apps/web autonomous:enrich-outcomes
 *
 * Mock realistic (staging):
 *   AUTONOMOUS_GA4_MOCK=realistic pnpm -C apps/web autonomous:enrich-outcomes
 *
 * Real GA4 (staging only):
 *   ENABLE_AUTONOMOUS_GA4=true GA4_PROPERTY_ID=... GOOGLE_APPLICATION_CREDENTIALS=... pnpm -C apps/web autonomous:enrich-outcomes
 */

import { runEnrichOutcomesJob } from "../learning/runEnrichOutcomesJob";

async function main(): Promise<void> {
  const realisticMock = process.env.AUTONOMOUS_GA4_MOCK === "realistic";
  const result = await runEnrichOutcomesJob({ realistic_mock: realisticMock });

  const topSlice = [...result.ranked_slices].sort(
    (a, b) => (b.ranked[0]?.conversion_score ?? 0) - (a.ranked[0]?.conversion_score ?? 0),
  )[0];

  console.log("\n=== NELVYON Phase N — Enrich Outcomes (GA4) ===");
  console.log(`GA4 mode:       ${result.report.ga4_mode} (real=${result.report.ga4_real_enabled})`);
  console.log(`Outcomes:       ${result.report.outcomes_count} → enriched ${result.report.enriched_count}`);
  console.log(`With CR:        ${result.report.with_conversion_rate}`);
  console.log(`Ranked slices:  ${result.report.ranked_slices}`);
  console.log(
    `Autonomía:      ${result.report.autonomy_pct.previous}% → ${result.report.autonomy_pct.current}% (+${result.report.autonomy_pct.delta})`,
  );
  if (topSlice?.ranked[0]) {
    const s = topSlice.slice;
    console.log(
      `Top conversion: ${s.sector}/${s.service} → ${topSlice.ranked[0].template_id} (conv_score ${topSlice.ranked[0].conversion_score})`,
    );
  }
  console.log(`Output:         ${result.output_dir}/`);
  console.log("  enrichedOutcomes.json · rankings.json · learningReport.json");
  console.log("=============================================\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
