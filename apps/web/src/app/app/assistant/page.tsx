import { Suspense } from "react";

import { ProfessionalAssistantPageClient } from "./ProfessionalAssistantPageClient";

export default function ProfessionalAssistantPage() {
  return (
    <Suspense fallback={null}>
      <ProfessionalAssistantPageClient />
    </Suspense>
  );
}
