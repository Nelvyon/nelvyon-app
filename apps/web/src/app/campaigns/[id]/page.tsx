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
import { PageHeader } from "@/core/ui/PageHeader";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonDetailCard } from "@/core/ui/Skeleton";
import { CampaignDetailCard } from "@/features/campaigns/components/CampaignDetailCard";
import { CampaignForm } from "@/features/campaigns/components/CampaignForm";
import { CampaignStatusForm } from "@/features/campaigns/components/CampaignStatusForm";
import { useCampaign, useUpdateCampaign } from "@/features/campaigns/hooks";
import { CampaignCreateInput, CampaignUpdateInput } from "@/features/campaigns/types";

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const { user } = useAuth();
  const isClientMode = getBrandMode() === "client";
  const query = useCampaign(id);
  const updateMutation = useUpdateCampaign(id);
  const canEdit = isClientMode ? false : user ? canPerformAction(user.role, "campaigns", "edit") : false;
  const invalidId = !Number.isFinite(id) || id <= 0;

  const onUpdate = async (values: CampaignCreateInput) => {
    const payload: CampaignUpdateInput = {
      project_id: values.project_id,
      platform: values.platform,
      campaign_type: values.campaign_type,
      ...(values.client_id !== undefined ? { client_id: values.client_id } : {}),
      ...(values.name !== undefined ? { name: values.name } : {}),
      ...(values.content !== undefined ? { content: values.content } : {}),
      ...(values.target_audience !== undefined ? { target_audience: values.target_audience } : {}),
      ...(values.status !== undefined ? { status: values.status } : {}),
    };
    await updateMutation.mutateAsync(payload);
  };

  const title =
    query.data?.name?.trim() ||
    (isClientMode ? `Proyecto #${id}` : `Campaña #${id}`);

  return (
    <ProtectedLayout module="campaigns">
      <div className="space-y-6">
        <PageHeader
          title={title}
          description={
            isClientMode
              ? "Detalle del proyecto compartido con tu cuenta."
              : "Estado, canal, cliente vinculado y edición según tu rol."
          }
          actions={
            <Button asChild size="sm" variant="outline">
              <Link href="/campaigns">{isClientMode ? "← Volver a proyectos" : "← Volver a campañas"}</Link>
            </Button>
          }
        />

        {invalidId ? (
          <ErrorNotice title="Identificador no válido">
            <p>Esta URL no contiene un identificador numérico válido.</p>
          </ErrorNotice>
        ) : null}
        {query.isLoading ? (
          <>
            <p className="text-sm text-muted-foreground">
              {isClientMode ? "Cargando proyecto…" : "Cargando campaña…"}
            </p>
            <SkeletonDetailCard />
          </>
        ) : null}
        {query.error instanceof ApiError && query.error.status === 403 ? (
          <ForbiddenNotice>
            <p>No tienes acceso a {isClientMode ? "este proyecto" : "esta campaña"} con tu rol actual.</p>
          </ForbiddenNotice>
        ) : null}
        {query.error instanceof ApiError && query.error.status === 404 ? (
          <ErrorNotice title={isClientMode ? "Proyecto no encontrado" : "Campaña no encontrada"}>
            <p>El registro no existe en el workspace activo o fue eliminado.</p>
          </ErrorNotice>
        ) : null}
        {query.error &&
          !(query.error instanceof ApiError && (query.error.status === 403 || query.error.status === 404)) ? (
          <ErrorNotice>
            <p>No pudimos cargar el detalle. Vuelve a la lista e inténtalo de nuevo.</p>
          </ErrorNotice>
        ) : null}

        {query.data ? (
          <>
            <CampaignDetailCard campaign={query.data} />
            {!isClientMode ? (
              <>
                <section className="space-y-3">
                  <h2 className="text-base font-semibold text-foreground">Estado y lanzamiento</h2>
                  <CampaignStatusForm
                    canSubmit={canEdit}
                    currentStatus={query.data.status}
                    isSubmitting={updateMutation.isPending}
                    onSubmit={async (status) => {
                      await updateMutation.mutateAsync({ status });
                    }}
                  />
                </section>
                <section className="space-y-3">
                  <h2 className="text-base font-semibold text-foreground">Editar campos</h2>
                  <CampaignForm
                    canSubmit={canEdit}
                    initialValues={{
                      project_id: query.data.project_id,
                      client_id: query.data.client_id ?? undefined,
                      platform: query.data.platform,
                      campaign_type: query.data.campaign_type,
                      name: query.data.name ?? undefined,
                      content: query.data.content ?? undefined,
                      target_audience: query.data.target_audience ?? undefined,
                      status: query.data.status ?? undefined,
                    }}
                    isSubmitting={updateMutation.isPending}
                    onSubmit={onUpdate}
                    submitLabel="Guardar cambios"
                  />
                </section>
              </>
            ) : null}
            {updateMutation.isSuccess && !isClientMode ? (
              <p className="text-sm text-success-foreground">Cambios guardados correctamente.</p>
            ) : null}
          </>
        ) : null}
      </div>
    </ProtectedLayout>
  );
}
