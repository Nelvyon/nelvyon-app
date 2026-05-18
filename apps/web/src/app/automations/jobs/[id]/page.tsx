"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { canPerformAction } from "@/core/routing/guards";
import { Button } from "@/core/ui/button";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonDetailCard } from "@/core/ui/Skeleton";
import { JobDetailCard } from "@/features/automations/components/JobDetailCard";
import { RetryJobSection } from "@/features/automations/components/RetryJobSection";
import { useAutomationJob, useRetryAutomationJob } from "@/features/automations/hooks";

export default function AutomationJobDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const { user } = useAuth();
  const query = useAutomationJob(id);
  const retryMutation = useRetryAutomationJob(id);
  const canMutate = user ? canPerformAction(user.role, "automations", "edit") : false;
  const invalidId = !Number.isFinite(id) || id <= 0;

  return (
    <ProtectedLayout module="automations">
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/automations/jobs">Back to jobs</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href="/automations/webhooks">Webhooks</Link>
          </Button>
        </div>

        {invalidId ? (
          <ErrorNotice title="Invalid job id">
            <p>Cause: this route does not include a valid numeric job identifier.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: return to Automations → Jobs and open a valid row from the current workspace list.
            </p>
          </ErrorNotice>
        ) : null}
        {query.isLoading && (
          <>
            <p className="text-sm text-muted-foreground">Loading automation job details and retry eligibility…</p>
            <SkeletonDetailCard />
          </>
        )}
        {query.error instanceof ApiError && query.error.status === 403 && (
          <ForbiddenNotice>
            <p>Cause: this job is not readable with your current role or workspace access.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: switch workspace, or ask an admin for automations visibility in this tenant.
            </p>
          </ForbiddenNotice>
        )}
        {query.error instanceof ApiError && query.error.status === 404 && (
          <ErrorNotice title="Job not found">
            <p>Cause: this job id is not present in the active workspace scope (removed or wrong tenant).</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: open Automations → Jobs and navigate from the list to avoid stale links.
            </p>
          </ErrorNotice>
        )}
        {query.error &&
          !(query.error instanceof ApiError && (query.error.status === 403 || query.error.status === 404)) && (
          <ErrorNotice>
            <p>Cause: job detail request failed unexpectedly.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: refresh once; if it persists, verify API health from Operations and retry in a minute.
            </p>
          </ErrorNotice>
        )}

        {query.data && (
          <>
            <JobDetailCard job={query.data} />
            <RetryJobSection
              canSubmit={canMutate}
              isSubmitting={retryMutation.isPending}
              onRetry={async () => {
                await retryMutation.mutateAsync();
              }}
            />
            {retryMutation.error instanceof ApiError && retryMutation.error.status === 403 && (
              <p className="text-sm text-warning-foreground">Your role cannot retry this job.</p>
            )}
            {retryMutation.isSuccess ? (
              <p className="text-xs text-success-foreground">Retry requested and job queue was refreshed.</p>
            ) : null}
            {retryMutation.error &&
              !(retryMutation.error instanceof ApiError && retryMutation.error.status === 403) && (
                <p className="text-sm text-destructive">
                  Retry failed. Next: confirm this job status allows retry, refresh the record, and try once more.
                </p>
              )}
          </>
        )}
      </div>
    </ProtectedLayout>
  );
}
