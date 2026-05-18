"use client";

import React from "react";

import { ApiError } from "@/core/api/types";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import { useSecurityEvents, useTenantSettings, useWorkspaceMembers } from "@/features/settings/hooks";

export default function ClientAccountPage() {
  const tenantQuery = useTenantSettings();
  const membersQuery = useWorkspaceMembers();
  const securityEventsQuery = useSecurityEvents({ limit: 5, sort: "-created_at" });

  const firstError = tenantQuery.error ?? membersQuery.error ?? securityEventsQuery.error;

  return (
    <ProtectedLayout module="help">
      <div className="space-y-6">
        <section className="rounded-lg border border-border bg-card p-4 shadow-card">
          <h2 className="text-base font-semibold text-foreground">Profile</h2>
          {tenantQuery.isLoading && !tenantQuery.data ? <SkeletonListRows aria-label="Loading account profile" rows={2} /> : null}
          {tenantQuery.data ? (
            <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Account name</dt>
                <dd className="text-foreground">{tenantQuery.data.name || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Timezone</dt>
                <dd className="text-foreground">{tenantQuery.data.timezone || "—"}</dd>
              </div>
            </dl>
          ) : null}
        </section>

        <section className="rounded-lg border border-border bg-card p-4 shadow-card">
          <h2 className="text-base font-semibold text-foreground">Access</h2>
          {membersQuery.isLoading && !membersQuery.data ? <SkeletonListRows aria-label="Loading account access" rows={3} /> : null}
          {membersQuery.data ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Active members in this account: <strong className="text-foreground">{membersQuery.data.length}</strong>. Access
              management is handled by your account owner.
            </p>
          ) : null}
        </section>

        <section className="rounded-lg border border-border bg-card p-4 shadow-card">
          <h2 className="text-base font-semibold text-foreground">Recent activity</h2>
          {securityEventsQuery.isLoading && !securityEventsQuery.data ? (
            <SkeletonListRows aria-label="Loading recent activity" rows={4} />
          ) : null}
          {securityEventsQuery.data ? (
            <ul className="mt-2 space-y-2 text-sm">
              {securityEventsQuery.data.items.slice(0, 5).map((evt) => (
                <li className="rounded border border-border px-2 py-1" key={evt.id}>
                  <span className="font-medium text-foreground">{evt.event_type}</span>
                  <span className="text-muted-foreground"> · {evt.status ?? "—"}</span>
                </li>
              ))}
              {securityEventsQuery.data.items.length === 0 ? (
                <li className="text-muted-foreground">No recent account activity in this view yet.</li>
              ) : null}
            </ul>
          ) : null}
        </section>

        {firstError instanceof ApiError && firstError.status === 403 ? (
          <ForbiddenNotice>
            <p>Account profile is not enabled for this portal access.</p>
          </ForbiddenNotice>
        ) : null}
        {firstError && !(firstError instanceof ApiError && firstError.status === 403) ? (
          <ErrorNotice>
            <p>We could not load part of your account profile. Refresh once; if it persists, contact support.</p>
          </ErrorNotice>
        ) : null}
      </div>
    </ProtectedLayout>
  );
}

