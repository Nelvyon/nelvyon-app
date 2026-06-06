"use client";

import Link from "next/link";

import { Button } from "@/core/ui/button";
import { PortalDeliverableCard } from "@/features/client_portal_v1/components/PortalCards";
import { PortalPageShell } from "@/features/client_portal_v1/components/PortalPageShell";
import {
  PortalEmptyState,
  PortalErrorState,
  PortalLoadingState,
} from "@/features/client_portal_v1/components/PortalUiStates";
import { usePortalAuth } from "@/features/client_portal_v1/PortalAuthContext";
import { usePortalDeliverables, usePortalMe, usePortalProjects } from "@/features/client_portal_v1/hooks";

export default function PortalDashboardPage() {
  const { user } = usePortalAuth();
  const me = usePortalMe();
  const projects = usePortalProjects();
  const deliverables = usePortalDeliverables();

  const pendingReview =
    deliverables.data?.items.filter((d) => d.status === "published").length ?? 0;

  return (
    <PortalPageShell
      title="Client dashboard"
      description="Overview of your projects and deliverables awaiting review."
    >
      {me.isLoading ? <PortalLoadingState message="Loading profile…" /> : null}
      {me.isError ? (
        <PortalErrorState message={me.error instanceof Error ? me.error.message : undefined} onRetry={() => void me.refetch()} />
      ) : null}

      {user ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4 shadow-card">
            <p className="text-xs uppercase text-muted-foreground">Projects</p>
            <p className="mt-1 text-2xl font-semibold">{projects.data?.total ?? "—"}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 shadow-card">
            <p className="text-xs uppercase text-muted-foreground">Deliverables</p>
            <p className="mt-1 text-2xl font-semibold">{deliverables.data?.total ?? "—"}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 shadow-card">
            <p className="text-xs uppercase text-muted-foreground">Pending review</p>
            <p className="mt-1 text-2xl font-semibold text-amber-700">{pendingReview}</p>
          </div>
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Recent deliverables</h2>
          <Button variant="link" size="sm" asChild>
            <Link href="/portal/deliverables">View all</Link>
          </Button>
        </div>
        {deliverables.isLoading ? <PortalLoadingState message="Loading deliverables…" /> : null}
        {deliverables.isError ? (
          <PortalErrorState
            message={deliverables.error instanceof Error ? deliverables.error.message : undefined}
            onRetry={() => void deliverables.refetch()}
          />
        ) : null}
        {deliverables.data?.items.length === 0 ? (
          <PortalEmptyState
            title="No deliverables yet"
            description="When your team publishes deliverables for your review, they will appear here."
            action={
              <Button variant="outline" size="sm" asChild>
                <Link href="/portal/projects">Browse projects</Link>
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-3">
            {deliverables.data?.items.slice(0, 5).map((item) => (
              <li key={item.id}>
                <PortalDeliverableCard item={item} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </PortalPageShell>
  );
}
