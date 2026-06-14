import { Suspense } from "react";

import { CreateDealPageClient } from "./CreateDealPageClient";

export default function CreateDealPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Cargando formulario…</p>}>
      <CreateDealPageClient />
    </Suspense>
  );
}
