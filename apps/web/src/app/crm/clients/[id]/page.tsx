"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { canPerformAction } from "@/core/routing/guards";
import { Button } from "@/core/ui/button";
import { PageHeader } from "@/core/ui/PageHeader";
import { PanelCard } from "@/core/ui/PanelCard";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonDetailCard } from "@/core/ui/Skeleton";
import { ClientDetailCard } from "@/features/crm/components/ClientDetailCard";
import { ClientForm } from "@/features/crm/components/ClientForm";
import { useClient, useUpdateClient } from "@/features/crm/hooks";
import { ClientCreateInput } from "@/features/crm/types";

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const { user } = useAuth();
  const query = useClient(id);
  const updateMutation = useUpdateClient(id);
  const canEdit = user ? canPerformAction(user.role, "crm", "edit") : false;
  const invalidId = !Number.isFinite(id) || id <= 0;

  const onUpdate = async (values: ClientCreateInput) => {
    await updateMutation.mutateAsync(values);
  };

  return (
    <ProtectedLayout module="crm">
      <div className="space-y-6">
        <PageHeader
          title={query.data?.business_name ?? `Cliente #${id}`}
          description="Ficha de cuenta, pipeline vinculado y edición rápida de campos permitidos."
          actions={
            <Button asChild size="sm" variant="outline">
              <Link href="/crm/clients">← Volver a clientes</Link>
            </Button>
          }
        />

        {invalidId ? (
          <ErrorNotice title="Identificador no válido">
            <p>Esta URL no contiene un identificador numérico de cliente válido.</p>
          </ErrorNotice>
        ) : null}
        {query.isLoading ? (
          <>
            <p className="text-sm text-muted-foreground">Cargando ficha del cliente…</p>
            <SkeletonDetailCard />
          </>
        ) : null}
        {query.error instanceof ApiError && query.error.status === 403 ? (
          <ForbiddenNotice>
            <p>Tu rol o workspace actual no puede leer este cliente.</p>
          </ForbiddenNotice>
        ) : null}
        {query.error instanceof ApiError && query.error.status === 404 ? (
          <ErrorNotice title="Cliente no encontrado">
            <p>Este cliente no existe en el workspace activo o fue eliminado.</p>
          </ErrorNotice>
        ) : null}
        {query.error &&
          !(query.error instanceof ApiError && (query.error.status === 403 || query.error.status === 404)) ? (
          <ErrorNotice>
            <p>No pudimos cargar el cliente. Vuelve a la lista e inténtalo de nuevo.</p>
          </ErrorNotice>
        ) : null}

        {query.data ? (
          <>
            <ClientDetailCard client={query.data} />
            <PanelCard>
              <h2 className="text-base font-semibold text-foreground">Pipeline y deals</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Revisa etapa, responsable, valor y riesgo de las oportunidades vinculadas a esta cuenta.
              </p>
              <Button asChild className="mt-4" variant="outline">
                <Link href={`/crm/deals?client_id=${id}`}>Ver deals de este cliente</Link>
              </Button>
            </PanelCard>
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">Edición rápida</h2>
              <ClientForm
                canSubmit={canEdit}
                initialValues={{
                  business_name: query.data.business_name,
                  sector: query.data.sector,
                  country: query.data.country ?? undefined,
                  city: query.data.city ?? undefined,
                  website_url: query.data.website_url ?? undefined,
                }}
                isSubmitting={updateMutation.isPending}
                onSubmit={onUpdate}
                submitLabel="Guardar cambios"
              />
            </section>
            {updateMutation.error instanceof ApiError && updateMutation.error.status === 403 ? (
              <p className="text-sm text-warning-foreground">No puedes editar este cliente con tu rol actual.</p>
            ) : null}
            {updateMutation.isSuccess ? (
              <p className="text-sm text-success-foreground">Cambios guardados correctamente.</p>
            ) : null}
            {updateMutation.error &&
              !(updateMutation.error instanceof ApiError && updateMutation.error.status === 403) ? (
                <p className="text-sm text-destructive">No se pudo guardar. Inténtalo de nuevo.</p>
              ) : null}
          </>
        ) : null}
      </div>
    </ProtectedLayout>
  );
}
