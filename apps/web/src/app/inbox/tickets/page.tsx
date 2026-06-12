"use client";

import React from "react";
import Link from "next/link";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { getBrandAppName, getBrandMode } from "@/core/platform/brand";
import { isClientTicketCreateEnabled } from "@/core/platform/surfacePolicy";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { canPerformAction } from "@/core/routing/guards";
import { Button } from "@/core/ui/button";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import { TicketList } from "@/features/inbox_helpdesk/components/TicketList";
import { useTickets } from "@/features/inbox_helpdesk/hooks";

export default function TicketsListPage() {
  const { user } = useAuth();
  const mode = getBrandMode();
  const isClientMode = mode === "client";
  const appName = getBrandAppName(mode);
  const query = useTickets();

  const canCreateByRole = user ? canPerformAction(user.role, "inbox", "create") : false;
  const canCreate = isClientMode ? isClientTicketCreateEnabled() : canCreateByRole;

  return (
    <ProtectedLayout module="inbox">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canCreate && (
            <Button asChild>
              <Link href="/inbox/tickets/new">{isClientMode ? "New request" : "Create ticket"}</Link>
            </Button>
          )}
        </div>

        {query.isLoading && <SkeletonListRows aria-label="Loading helpdesk tickets" rows={7} />}
        {query.error instanceof ApiError && query.error.status === 403 && (
          <ForbiddenNotice>
            <p>
              {isClientMode
                ? "Requests are not available for this account access."
                : `${appName} cannot open tickets for this workspace with your current role or workspace selection.`}
            </p>
          </ForbiddenNotice>
        )}
        {query.error && !(query.error instanceof ApiError && query.error.status === 403) && (
          <ErrorNotice>
            <p>No pudimos cargar los tickets. Comprueba tu conexión e inténtalo de nuevo.</p>
          </ErrorNotice>
        )}
        {query.data && <TicketList items={query.data.items} showCreateCta={canCreate} />}
      </div>
    </ProtectedLayout>
  );
}
