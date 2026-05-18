"use client";

import React from "react";
import Link from "next/link";

import { ApiError } from "@/core/api/types";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import { JobList } from "@/features/automations/components/JobList";
import { useAutomationJobs } from "@/features/automations/hooks";

export default function AutomationJobsPage() {
  const query = useAutomationJobs();

  return (
    <ProtectedLayout module="automations">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/automations/webhooks">Webhooks</Link>
          </Button>
        </div>

        {query.isLoading && <SkeletonListRows aria-label="Loading automation jobs" rows={8} />}
        {query.isFetching && query.data ? (
          <p className="text-xs text-muted-foreground">Refreshing automation job list for current workspace…</p>
        ) : null}
        {query.error instanceof ApiError && query.error.status === 403 && (
          <ForbiddenNotice>
            <p>Cause: automation jobs are not available for this workspace with your current role.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: switch workspace in the header, or ask an admin for automations view access.
            </p>
          </ForbiddenNotice>
        )}
        {query.error && !(query.error instanceof ApiError && query.error.status === 403) && (
          <ErrorNotice>
            <p>Cause: jobs list request failed before rows could render.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: confirm network and workspace context, then refresh; re-authenticate if token expired.
            </p>
          </ErrorNotice>
        )}
        {query.data && <JobList items={query.data.items} />}
      </div>
    </ProtectedLayout>
  );
}
