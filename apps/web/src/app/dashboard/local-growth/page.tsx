"use client";

import { LOCAL_GROWTH_PACK_ID } from "@/lib/packs/types";
import { PackReportDashboard } from "@/features/packs/PackReportDashboard";

export default function LocalGrowthReportPage() {
  return <PackReportDashboard packId={LOCAL_GROWTH_PACK_ID} />;
}
