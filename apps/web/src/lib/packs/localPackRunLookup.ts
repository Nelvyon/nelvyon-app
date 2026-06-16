import { DbClient } from "../../../../../backend/db/DbClient";

import { slugFromBusinessName } from "@/lib/packs/localPackProduction";
import type { LocalGrowthPackIntake } from "@/lib/packs/types";
import { LOCAL_GROWTH_PACK_ID } from "@/lib/packs/types";

function db() {
  return DbClient.getInstance();
}

export async function getLocalPackIntakeBySlug(slug: string): Promise<LocalGrowthPackIntake | null> {
  const rows = await db().query<{ intake: LocalGrowthPackIntake }>(
    `SELECT intake FROM nelvyon_pack_runs
     WHERE pack_id = $1
       AND (
         intake->>'landing_slug' = $2
         OR intake->>'business_name' IS NOT NULL
       )
     ORDER BY created_at DESC
     LIMIT 50`,
    [LOCAL_GROWTH_PACK_ID, slug],
  );

  for (const row of rows) {
    const intake = row.intake;
    if (!intake?.business_name) continue;
    const rowSlug = (intake as LocalGrowthPackIntake & { landing_slug?: string }).landing_slug
      ?? slugFromBusinessName(intake.business_name);
    if (rowSlug === slug) return intake;
  }
  return null;
}
