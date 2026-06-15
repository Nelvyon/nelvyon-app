"use client";

import React from "react";
import Link from "next/link";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { getBrandMode } from "@/core/platform/brand";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { canPerformAction } from "@/core/routing/guards";
import { Button } from "@/core/ui/button";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import { CampaignList } from "@/features/campaigns/components/CampaignList";
import { EmailTemplateQuickLaunch } from "@/features/campaigns/components/EmailTemplateQuickLaunch";
import { useCampaigns } from "@/features/campaigns/hooks";

export default function CampaignsListPage() {
  const { user } = useAuth();
  const mode = getBrandMode();
  const isClientMode = mode === "client";
  const query = useCampaigns();
  const canCreate = isClientMode ? false : user ? canPerformAction(user.role, "campaigns", "create") : false;

  return (
    <ProtectedLayout module="campaigns">
      <div className="space-y-6">
        {!isClientMode ? <EmailTemplateQuickLaunch /> : null}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {canCreate ? (
            <Button asChild>
              <Link href="/campaigns/new">Nueva campaña</Link>
            </Button>
          ) : null}
        </div>

        {query.isLoading ? <SkeletonListRows aria-label="Cargando campañas" rows={7} /> : null}
        {query.isFetching && query.data ? (
          <p className="text-xs text-muted-foreground">Actualizando lista de campañas…</p>
        ) : null}
        {query.error instanceof ApiError && query.error.status === 403 ? (
          <ForbiddenNotice>
            <p>
              {isClientMode
                ? "Los proyectos no están disponibles para esta cuenta."
                : "No puedes ver campañas en este workspace con tu rol actual."}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {isClientMode
                ? "Pide al administrador de la cuenta que habilite Proyectos en tu portal."
                : "Cambia de workspace en la cabecera o pide permisos de campañas a un administrador."}
            </p>
          </ForbiddenNotice>
        ) : null}
        {query.error && !(query.error instanceof ApiError && query.error.status === 403) ? (
          <ErrorNotice>
            <p>No pudimos cargar las campañas. Comprueba tu conexión e inténtalo de nuevo.</p>
          </ErrorNotice>
        ) : null}
        {query.data && <CampaignList items={query.data.items} showCreateCta={canCreate} />}
      </div>
    </ProtectedLayout>
  );
}
