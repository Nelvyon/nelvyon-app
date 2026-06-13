"use client";

import React from "react";
import Link from "next/link";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { canPerformAction } from "@/core/routing/guards";
import { Button } from "@/core/ui/button";
import { PageHeader } from "@/core/ui/PageHeader";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import { ClientList } from "@/features/crm/components/ClientList";
import { useClients } from "@/features/crm/hooks";

export default function ClientsListPage() {
  const { user } = useAuth();
  const query = useClients();

  const canCreate = user ? canPerformAction(user.role, "crm", "create") : false;

  return (
    <ProtectedLayout module="crm">
      <div className="space-y-6">
        <PageHeader
          title="Clientes"
          description="Cuentas de revenue del workspace activo. Conecta deals, campañas y seguimiento comercial desde un solo panel."
          actions={
            <>
              <Button asChild variant="outline">
                <Link href="/crm/deals">Pipeline comercial</Link>
              </Button>
              {canCreate ? (
                <Button asChild>
                  <Link href="/crm/clients/new">Nuevo cliente</Link>
                </Button>
              ) : null}
            </>
          }
        />

        {query.isLoading ? (
          <SkeletonListRows aria-label="Cargando clientes del workspace" rows={7} />
        ) : null}
        {query.isFetching && query.data ? (
          <p className="text-xs text-muted-foreground">Actualizando lista de clientes…</p>
        ) : null}
        {query.error instanceof ApiError && query.error.status === 403 ? (
          <ForbiddenNotice>
            <p>No tienes acceso a Revenue (clientes) en este workspace con tu rol actual.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Cambia de workspace o pide a un administrador permisos de CRM.
            </p>
          </ForbiddenNotice>
        ) : null}
        {query.error && !(query.error instanceof ApiError && query.error.status === 403) ? (
          <ErrorNotice>
            <p>No pudimos cargar la lista de clientes. Comprueba tu conexión e inténtalo de nuevo.</p>
          </ErrorNotice>
        ) : null}
        {query.data ? <ClientList items={query.data.items} showCreateCta={canCreate} /> : null}
      </div>
    </ProtectedLayout>
  );
}
