"use client";

import Link from "next/link";
import { use } from "react";

import { Button } from "@/core/ui/button";
import { portalProjectStatusLabel } from "@/features/client_portal_v1/constants";
import { PortalDeliverableCard } from "@/features/client_portal_v1/components/PortalCards";
import { PortalPageShell } from "@/features/client_portal_v1/components/PortalPageShell";
import {
  PortalEmptyState,
  PortalErrorState,
  PortalLoadingState,
} from "@/features/client_portal_v1/components/PortalUiStates";
import { usePortalDeliverables, usePortalProject } from "@/features/client_portal_v1/hooks";

export default function PortalProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const project = usePortalProject(id);
  const deliverables = usePortalDeliverables({ project_id: id });

  return (
    <PortalPageShell
      title={project.data?.name ?? "Proyecto"}
      description={project.data?.description ?? undefined}
      backHref="/portal/projects"
    >
      {project.isLoading ? <PortalLoadingState message="Cargando proyecto…" /> : null}
      {project.isError ? (
        <PortalErrorState
          title="Proyecto no encontrado"
          message={project.error instanceof Error ? project.error.message : undefined}
          onRetry={() => void project.refetch()}
        />
      ) : null}

      {project.data ? (
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Estado</dt>
            <dd className="font-medium">{portalProjectStatusLabel(project.data.status)}</dd>
          </div>
          {project.data.due_date ? (
            <div>
              <dt className="text-muted-foreground">Fecha límite</dt>
              <dd className="font-medium">{new Date(project.data.due_date).toLocaleDateString("es-ES")}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <section className="space-y-3 pt-4">
        <h2 className="text-lg font-semibold">Entregables</h2>
        {deliverables.isLoading ? <PortalLoadingState message="Cargando entregables…" /> : null}
        {deliverables.isError ? (
          <PortalErrorState
            message={deliverables.error instanceof Error ? deliverables.error.message : undefined}
            onRetry={() => void deliverables.refetch()}
          />
        ) : null}
        {deliverables.data && deliverables.data.items.length === 0 ? (
          <PortalEmptyState
            title="Sin entregables en este proyecto"
            description="Los entregables publicados para este proyecto aparecerán aquí."
            action={
              <Button variant="outline" size="sm" asChild>
                <Link href="/portal/deliverables">Todos los entregables</Link>
              </Button>
            }
          />
        ) : null}
        {deliverables.data && deliverables.data.items.length > 0 ? (
          <ul className="grid gap-3">
            {deliverables.data.items.map((item) => (
              <li key={item.id}>
                <PortalDeliverableCard item={item} />
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </PortalPageShell>
  );
}
