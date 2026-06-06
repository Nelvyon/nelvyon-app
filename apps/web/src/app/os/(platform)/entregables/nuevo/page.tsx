import { Suspense } from "react";

import { OsDeliverableCreateView } from "@/features/os-shell/deliverables/OsDeliverableCreateView";
import { OsLoadingBlock } from "@/features/os-shell/components/ui/OsUi";

export default function EntregablesNuevoPage() {
  return (
    <Suspense fallback={<OsLoadingBlock label="Cargando…" />}>
      <OsDeliverableCreateView />
    </Suspense>
  );
}
