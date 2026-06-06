import { Suspense } from "react";

import { OsLoadingBlock } from "@/features/os-shell/components/ui/OsUi";
import { OsDeliverablesListView } from "@/features/os-shell/deliverables/OsDeliverablesListView";

export const metadata = {
  title: "Entregables · NELVYON OS",
};

export default function EntregablesPage() {
  return (
    <Suspense fallback={<OsLoadingBlock label="Cargando entregables…" />}>
      <OsDeliverablesListView />
    </Suspense>
  );
}
