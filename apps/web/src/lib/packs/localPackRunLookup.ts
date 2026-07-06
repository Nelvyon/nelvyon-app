import { DbClient } from "../../../../../backend/db/DbClient";

import { slugFromBusinessName } from "@/lib/packs/localPackProduction";
import type { GrowthPackIntakeBase, LocalGrowthPackIntake } from "@/lib/packs/types";

function db() {
  return DbClient.getInstance();
}

type IntakeRow = {
  intake: GrowthPackIntakeBase & { sector: string; landing_slug?: string };
  pack_id: string;
  report: { sku_results?: Array<{ qa_score?: number }> } | null;
};

function slugForIntake(intake: GrowthPackIntakeBase & { landing_slug?: string }): string {
  return intake.landing_slug ?? slugFromBusinessName(intake.business_name);
}

/** Resolve pack intake by landing slug across all pack runs (not only local-business-growth). */
export async function getPackIntakeBySlug(
  slug: string,
): Promise<(GrowthPackIntakeBase & { sector: string }) | null> {
  const rows = await db().query<IntakeRow>(
    `SELECT intake, pack_id, report
     FROM nelvyon_pack_runs
     WHERE intake->>'business_name' IS NOT NULL
     ORDER BY created_at DESC
     LIMIT 100`,
  );

  for (const row of rows) {
    const intake = row.intake;
    if (!intake?.business_name) continue;
    if (slugForIntake(intake) === slug) return intake;
  }
  return null;
}

export async function getPackAvgQaBySlug(slug: string): Promise<number | null> {
  const rows = await db().query<IntakeRow>(
    `SELECT intake, report
     FROM nelvyon_pack_runs
     WHERE intake->>'business_name' IS NOT NULL
     ORDER BY created_at DESC
     LIMIT 100`,
  );
  for (const row of rows) {
    const intake = row.intake;
    if (!intake?.business_name || slugForIntake(intake) !== slug) continue;
    const skuResults = row.report?.sku_results;
    if (!skuResults?.length) return null;
    const sum = skuResults.reduce((a, r) => a + (r.qa_score ?? 0), 0);
    return Math.round(sum / skuResults.length);
  }
  return null;
}

export async function getLocalPackIntakeBySlug(slug: string): Promise<LocalGrowthPackIntake | null> {
  const intake = await getPackIntakeBySlug(slug);
  return intake as LocalGrowthPackIntake | null;
}
