import { Suspense } from "react";

import { DealsPageClient } from "./DealsPageClient";

export default function DealsPage() {
  return (
    <Suspense fallback={null}>
      <DealsPageClient />
    </Suspense>
  );
}
