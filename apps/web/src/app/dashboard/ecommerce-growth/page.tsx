"use client";

import { ECOMMERCE_GROWTH_PACK_ID } from "@/lib/packs/types";
import { PackReportDashboard } from "@/features/packs/PackReportDashboard";

export default function EcommerceGrowthReportPage() {
  return <PackReportDashboard packId={ECOMMERCE_GROWTH_PACK_ID} />;
}
