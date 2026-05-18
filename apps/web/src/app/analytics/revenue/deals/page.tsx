import { Suspense } from "react";

import { RevenueDealsDrilldownPageClient } from "./RevenueDealsDrilldownPageClient";

export default function RevenueAnalyticsDealDrilldownPage() {
  return (
    <Suspense fallback={null}>
      <RevenueDealsDrilldownPageClient />
    </Suspense>
  );
}
