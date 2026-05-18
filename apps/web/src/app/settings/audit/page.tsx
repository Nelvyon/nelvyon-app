"use client";

import React from "react";

import { ApiError } from "@/core/api/types";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import { SecurityEventsTable } from "@/features/settings/components/SecurityEventsTable";
import { useSecurityEvents } from "@/features/settings/hooks";

export default function AuditSecurityPage() {
  const query = useSecurityEvents({ limit: 100, sort: "-created_at" });

  return (
    <ProtectedLayout module="settings">
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Workspace-scoped audit/security feed. Trust view for operators — not a SIEM or enterprise GRC surface. Events
          reflect the API response for this workspace only; there is no separate legal-hold or retention UI here.
        </p>
        {query.isLoading && !query.data && <SkeletonListRows aria-label="Loading security events" rows={8} />}
        {query.isFetching && query.data ? (
          <p className="text-xs text-muted-foreground">Refreshing security events for current workspace…</p>
        ) : null}
        {query.error instanceof ApiError && query.error.status === 403 && (
          <ForbiddenNotice>
            <p>Cause: audit and security events are limited to roles with settings/audit access on this workspace.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: ask an admin to grant audit visibility, or switch workspace if you belong to another tenant with access.
            </p>
          </ForbiddenNotice>
        )}
        {query.error instanceof ApiError && query.error.status === 404 && (
          <ErrorNotice title="Security events not found">
            <p>Cause: the security events endpoint returned no resource for this workspace or route.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: confirm API version and workspace scope with your admin; open Help if this path is not enabled yet.
            </p>
          </ErrorNotice>
        )}
        {query.error &&
          !(query.error instanceof ApiError && query.error.status === 403) &&
          !(query.error instanceof ApiError && query.error.status === 404) && (
          <ErrorNotice>
            <p>Cause: the security events feed request failed before any rows rendered (network or server error).</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: refresh; confirm the workspace header matches where you expect audit data, then try again.
            </p>
          </ErrorNotice>
        )}
        {query.data ? <SecurityEventsTable events={query.data.items} /> : null}
      </div>
    </ProtectedLayout>
  );
}
