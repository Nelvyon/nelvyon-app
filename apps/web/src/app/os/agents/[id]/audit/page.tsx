"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { ApiError } from "@/core/api/types";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Badge } from "@/core/ui/Badge";
import { Button } from "@/core/ui/button";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonDetailCard } from "@/core/ui/Skeleton";
import { toAgentStatus, useAgentRun } from "@/features/agents/hooks";

export default function AgentRunAuditPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const invalidId = !Number.isFinite(id) || id <= 0;
  const query = useAgentRun(id);

  return (
    <ProtectedLayout module="os">
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={Number.isFinite(id) && id > 0 ? `/os/agents/${id}` : "/os/agents"}>Back to run detail</Link>
          </Button>
        </div>

        {invalidId ? (
          <ErrorNotice title="Invalid run id">
            <p>Cause: this route does not include a valid run identifier.</p>
            <p className="mt-2 text-sm text-muted-foreground">Next: open audit trail from an existing run detail page.</p>
          </ErrorNotice>
        ) : null}
        {query.isLoading && <SkeletonDetailCard />}
        {query.error instanceof ApiError && query.error.status === 403 && (
          <ForbiddenNotice>
            <p>Cause: this audit record is not visible with your workspace role.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: switch workspace or request OS audit visibility from admin.
            </p>
          </ForbiddenNotice>
        )}
        {query.error instanceof ApiError && query.error.status === 404 && (
          <ErrorNotice title="Audit record not found">
            <p>Cause: the referenced run id is not available in this workspace scope.</p>
            <p className="mt-2 text-sm text-muted-foreground">Next: navigate from `/os/agents` to avoid stale links.</p>
          </ErrorNotice>
        )}
        {query.error &&
          !(query.error instanceof ApiError && (query.error.status === 403 || query.error.status === 404)) && (
            <ErrorNotice>
              <p>Cause: audit trail request failed unexpectedly.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Next: refresh once and verify workspace headers if failure persists.
              </p>
            </ErrorNotice>
          )}

        {query.data ? (
          <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-foreground">Agent actions audit trail v2</h2>
              <Badge tone="neutral">read-only</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Workspace-scoped trace of what the agent attempted and what result was recorded. No export and no destructive actions.
            </p>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Action</dt>
                <dd className="text-foreground">{query.data.job_type}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Result</dt>
                <dd className="text-foreground">{toAgentStatus(query.data.status)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Timestamp</dt>
                <dd className="text-foreground">{query.data.delivered_at ?? query.data.created_at ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Workspace</dt>
                <dd className="text-foreground">{query.data.workspace_id ?? "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Input payload (summary)</dt>
                <dd className="mt-1 rounded bg-muted p-2 text-xs text-foreground">
                  {query.data.input_data?.slice(0, 600) ?? "No payload captured."}
                </dd>
              </div>
            </dl>
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              <p className="font-medium text-foreground">Cause + next step</p>
              <p className="mt-1 text-muted-foreground">
                Cause: this audit view reports trace metadata only and does not execute or revert any action.
              </p>
              <p className="mt-1 text-muted-foreground">
                Next: review run detail for timeline context, then validate outcome in the affected workspace module.
              </p>
            </div>
          </section>
        ) : null}
      </div>
    </ProtectedLayout>
  );
}
