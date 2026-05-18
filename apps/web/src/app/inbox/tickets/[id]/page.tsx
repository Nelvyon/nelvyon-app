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
        <Button asChild size="sm" variant="outline">
          <Link href="/inbox/tickets">{isClientMode ? "Back to requests" : "Back to tickets"}</Link>
        </Button>

        {invalidId ? (
          <ErrorNotice title="Invalid request id">
            <p>Cause: this route does not contain a valid numeric request identifier.</p>
            <p className="mt-2 text-sm text-muted-foreground">Next: return to Requests and open a valid row.</p>
          </ErrorNotice>
        ) : null}

        {query.isLoading && (
          <>
            <p className="text-sm text-muted-foreground">{isClientMode ? "Loading request details…" : "Loading ticket details…"}</p>
            <SkeletonDetailCard />
          </>
        )}
        {query.error instanceof ApiError && query.error.status === 403 && (
          <ForbiddenNotice>
            <p>
              {isClientMode
                ? "This request is not available for your account access."
                : "This ticket is not available for your account access."}
            </p>
          </ForbiddenNotice>
        )}
        {query.error instanceof ApiError && query.error.status === 404 && (
          <ErrorNotice title={isClientMode ? "Request not found" : "Ticket not found"}>
            <p>
              {isClientMode
                ? "Cause: this request is not available for your account, or no longer exists."
                : "Cause: this ticket id is not available in the current workspace scope."}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: return to {isClientMode ? "Requests" : "Tickets"} and open it again from the list.
            </p>
          </ErrorNotice>
        )}
        {query.error &&
          !(query.error instanceof ApiError && (query.error.status === 403 || query.error.status === 404)) && (
          <ErrorNotice>
            <p>
              {isClientMode
                ? "We could not load this request due to a temporary connection or service issue."
                : "Cause: ticket detail request failed before rendering current data."}
            </p>
            {!isClientMode ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Next: return to Tickets list and re-open the row. If the error persists, refresh and verify workspace scope.
              </p>
            ) : null}
          </ErrorNotice>
        )}

        {query.data && (
          <>
            <TicketDetailCard ticket={query.data} />
            {isClientMode ? (
              <section className="space-y-2 rounded-lg border border-border bg-card p-4 shadow-card">
                <h2 className="text-base font-medium text-foreground">Request status</h2>
                <p className="text-sm text-muted-foreground">
                  Status updates are managed by your account team and will appear here automatically.
                </p>
              </section>
            ) : (
              <section className="space-y-2">
                <h2 className="text-base font-medium text-foreground">Status</h2>
                <TicketStatusForm
                  canSubmit={canEdit}
                  currentStatus={query.data.status}
                  isSubmitting={statusMutation.isPending}
                  onSubmit={async (status) => {
                    await statusMutation.mutateAsync({ status });
                  }}
                />
                {statusMutation.error instanceof ApiError && statusMutation.error.status === 403 && (
                  <p className="text-sm text-warning-foreground">Your role cannot change this ticket&apos;s status.</p>
                )}
                {statusMutation.error &&
                  !(statusMutation.error instanceof ApiError && statusMutation.error.status === 403) && (
                    <p className="text-sm text-destructive">
                      Status update failed. Next: retry once; if it fails again, reload this ticket and submit from fresh state.
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
