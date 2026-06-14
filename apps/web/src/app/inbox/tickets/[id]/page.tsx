"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { getBrandMode } from "@/core/platform/brand";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { canPerformAction } from "@/core/routing/guards";
import { Button } from "@/core/ui/button";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonDetailCard } from "@/core/ui/Skeleton";
import { HelpdeskSubNav } from "@/features/inbox_helpdesk/components/HelpdeskSubNav";
import { TicketDetailCard } from "@/features/inbox_helpdesk/components/TicketDetailCard";
import { TicketStatusForm } from "@/features/inbox_helpdesk/components/TicketStatusForm";
import { useTicket, useUpdateTicketStatus } from "@/features/inbox_helpdesk/hooks";

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const { user } = useAuth();
  const isClientMode = getBrandMode() === "client";
  const query = useTicket(id);
  const statusMutation = useUpdateTicketStatus(id);
  const canEdit = isClientMode ? false : user ? canPerformAction(user.role, "inbox", "edit") : false;
  const invalidId = !Number.isFinite(id) || id <= 0;

  return (
    <ProtectedLayout module="inbox">
      <div className="space-y-5">
        {!isClientMode ? <HelpdeskSubNav /> : null}
        <Button asChild size="sm" variant="outline">
          <Link href="/inbox/tickets">{isClientMode ? "Volver a solicitudes" : "Volver a bandeja"}</Link>
        </Button>

        {invalidId ? (
          <ErrorNotice title="ID de ticket no válido">
            <p>Esta ruta no contiene un identificador numérico válido.</p>
            <p className="mt-2 text-sm text-muted-foreground">Vuelve a la bandeja y abre un ticket de la lista.</p>
          </ErrorNotice>
        ) : null}

        {query.isLoading && (
          <>
            <p className="text-sm text-muted-foreground">
              {isClientMode ? "Cargando solicitud…" : "Cargando ticket…"}
            </p>
            <SkeletonDetailCard />
          </>
        )}
        {query.error instanceof ApiError && query.error.status === 403 && (
          <ForbiddenNotice>
            <p>
              {isClientMode
                ? "Esta solicitud no está disponible para tu cuenta."
                : "Este ticket no está disponible para tu acceso en el workspace."}
            </p>
          </ForbiddenNotice>
        )}
        {query.error instanceof ApiError && query.error.status === 404 && (
          <ErrorNotice title={isClientMode ? "Solicitud no encontrada" : "Ticket no encontrado"}>
            <p>
              {isClientMode
                ? "La solicitud no existe o ya no está disponible para tu cuenta."
                : "El ticket no existe en el workspace activo o fue eliminado."}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Vuelve a {isClientMode ? "Solicitudes" : "Bandeja"} y ábrelo de nuevo desde la lista.
            </p>
          </ErrorNotice>
        )}
        {query.error &&
          !(query.error instanceof ApiError && (query.error.status === 403 || query.error.status === 404)) && (
          <ErrorNotice>
            <p>
              {isClientMode
                ? "No pudimos cargar esta solicitud por un problema temporal de conexión."
                : "No se pudo cargar el detalle del ticket. Revisa la conexión o el scope del workspace."}
            </p>
            {!isClientMode ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Vuelve a la bandeja y reabre el ticket. Si persiste, recarga la página.
              </p>
            ) : null}
          </ErrorNotice>
        )}

        {query.data && (
          <>
            <TicketDetailCard ticket={query.data} />
            {isClientMode ? (
              <section className="space-y-2 rounded-lg border border-border bg-card p-4 shadow-card">
                <h2 className="text-base font-medium text-foreground">Estado de la solicitud</h2>
                <p className="text-sm text-muted-foreground">
                  Tu equipo gestiona las actualizaciones; aparecerán aquí automáticamente.
                </p>
              </section>
            ) : (
              <section className="space-y-2">
                <h2 className="text-base font-medium text-foreground">Estado</h2>
                <TicketStatusForm
                  canSubmit={canEdit}
                  currentStatus={query.data.status}
                  isSubmitting={statusMutation.isPending}
                  onSubmit={async (status) => {
                    await statusMutation.mutateAsync({ status });
                  }}
                />
                {statusMutation.error instanceof ApiError && statusMutation.error.status === 403 && (
                  <p className="text-sm text-warning-foreground">Tu rol no puede cambiar el estado de este ticket.</p>
                )}
                {statusMutation.error &&
                  !(statusMutation.error instanceof ApiError && statusMutation.error.status === 403) && (
                    <p className="text-sm text-destructive">
                      No se pudo actualizar el estado. Reintenta o recarga el ticket.
                    </p>
                  )}
              </section>
            )}
          </>
        )}
      </div>
    </ProtectedLayout>
  );
}
