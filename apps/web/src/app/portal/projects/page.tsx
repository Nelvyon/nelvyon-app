"use client";

import { PortalProjectCard } from "@/features/client_portal_v1/components/PortalCards";
import { PortalPageShell } from "@/features/client_portal_v1/components/PortalPageShell";
import {
  PortalEmptyState,
  PortalErrorState,
  PortalLoadingState,
} from "@/features/client_portal_v1/components/PortalUiStates";
import { usePortalProjects } from "@/features/client_portal_v1/hooks";

export default function PortalProjectsPage() {
  const query = usePortalProjects();

  return (
    <PortalPageShell
      title="Proyectos"
      description="Proyectos activos compartidos con tu organización."
      backHref="/portal"
    >
      {query.isLoading ? <PortalLoadingState message="Cargando proyectos…" /> : null}
      {query.isError ? (
        <PortalErrorState
          message={query.error instanceof Error ? query.error.message : undefined}
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {query.data && query.data.items.length === 0 ? (
        <PortalEmptyState
          title="Sin proyectos publicados"
          description="Tu equipo aún no ha compartido proyectos en este portal."
        />
      ) : null}
      {query.data && query.data.items.length > 0 ? (
        <ul className="grid gap-3">
          {query.data.items.map((p) => (
            <li key={p.id}>
              <PortalProjectCard
                id={p.id}
                name={p.name}
                description={p.description}
                status={p.status}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </PortalPageShell>
  );
}
