"use client";

import { PortalDeliverableCard } from "@/features/client_portal_v1/components/PortalCards";
import { PortalPageShell } from "@/features/client_portal_v1/components/PortalPageShell";
import {
  PortalEmptyState,
  PortalErrorState,
  PortalLoadingState,
} from "@/features/client_portal_v1/components/PortalUiStates";
import { usePortalDeliverables } from "@/features/client_portal_v1/hooks";

export default function PortalDeliverablesPage() {
  const query = usePortalDeliverables();

  return (
    <PortalPageShell
      title="Entregables"
      description="Revisa, aprueba o solicita cambios en los entregables publicados por tu equipo."
      backHref="/portal"
    >
      {query.isLoading ? <PortalLoadingState message="Cargando entregables…" /> : null}
      {query.isError ? (
        <PortalErrorState
          message={query.error instanceof Error ? query.error.message : undefined}
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {query.data && query.data.items.length === 0 ? (
        <PortalEmptyState
          title="Sin entregables pendientes"
          description="Cuando tu equipo publique un entregable (landing, SEO, chatbot o informe), aparecerá aquí para tu revisión."
        />
      ) : null}
      {query.data && query.data.items.length > 0 ? (
        <ul className="grid gap-3">
          {query.data.items.map((item) => (
            <li key={item.id}>
              <PortalDeliverableCard item={item} />
            </li>
          ))}
        </ul>
      ) : null}
    </PortalPageShell>
  );
}
