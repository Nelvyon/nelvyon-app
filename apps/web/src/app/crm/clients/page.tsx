"use client";

import React from "react";
import Link from "next/link";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { canPerformAction } from "@/core/routing/guards";
import { Button } from "@/core/ui/button";
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
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button asChild variant="outline">
            <Link href="/crm/deals">Revenue pipeline (all deals)</Link>
          </Button>
          {canCreate && (
            <Button asChild>
              <Link href="/crm/clients/new">Create client</Link>
            </Button>
          )}
        </div>

        {query.isLoading && <SkeletonListRows aria-label="Loading clients for this workspace" rows={7} />}
        {query.isFetching && query.data ? (
          <p className="text-xs text-muted-foreground">Refreshing client list for current workspace…</p>
        ) : null}
        {query.error instanceof ApiError && query.error.status === 403 && (
          <ForbiddenNotice>
            <p>Cause: Revenue (clients) is not available for the workspace in your header with this role.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: switch workspace or ask an admin for CRM view so clients and deals stay in sync.
            </p>
          </ForbiddenNotice>
        )}
        {query.error && !(query.error instanceof ApiError && query.error.status === 403) && (
          <ErrorNotice>
            <p>Cause: the clients list request failed before any rows could render.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: confirm network and workspace header, then refresh; sign in again if needed.
            </p>
          </ErrorNotice>
        )}
        {query.data && <ClientList items={query.data.items} showCreateCta={canCreate} />}
      </div>
    </ProtectedLayout>
  );
}
