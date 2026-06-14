"use client";

import { SAAS_B2B_GROWTH_PACK_ID } from "@/lib/packs/types";
import { PackReportDashboard } from "@/features/packs/PackReportDashboard";

export default function SaasB2bGrowthReportPage() {
  return <PackReportDashboard packId={SAAS_B2B_GROWTH_PACK_ID} />;
}
