import { Suspense } from "react";

import { BillingUpgradePageClient } from "./BillingUpgradePageClient";

export default function BillingUpgradePage() {
  return (
    <Suspense fallback={null}>
      <BillingUpgradePageClient />
    </Suspense>
  );
}
