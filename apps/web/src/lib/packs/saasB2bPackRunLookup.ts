import { DbClient } from "../../../../../backend/db/DbClient";

import { slugFromBusinessName } from "@/lib/packs/saasB2bPackProduction";
import type { SaasB2bGrowthPackIntake } from "@/lib/packs/types";
import { SAAS_B2B_GROWTH_PACK_ID } from "@/lib/packs/types";

function db() {
  return DbClient.getInstance();
}

export async function getSaasB2bPackIntakeBySlug(slug: string): Promise<SaasB2bGrowthPackIntake | null> {
  const rows = await db().query<{ intake: SaasB2bGrowthPackIntake }>(
    `SELECT intake FROM nelvyon_pack_runs
     WHERE pack_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [SAAS_B2B_GROWTH_PACK_ID],
  );

  for (const row of rows) {
    const intake = row.intake;
    if (!intake?.business_name) continue;
    const rowSlug = (intake as SaasB2bGrowthPackIntake & { landing_slug?: string }).landing_slug
      ?? slugFromBusinessName(intake.business_name);
    if (rowSlug === slug) return intake;
  }
  return null;
}
