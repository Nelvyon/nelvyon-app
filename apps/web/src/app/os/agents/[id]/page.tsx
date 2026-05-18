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

function toneFromStatus(status: string): "neutral" | "warning" | "success" | "destructive" {
  const normalized = toAgentStatus(status);
  if (normalized === "success") return "success";
  if (normalized === "error") return "destructive";
  if (normalized === "running") return "warning";
  return "neutral";
}

function summarizeLog(raw?: string | null) {
  if (!raw) return "No log payload was produced for this run yet.";
  return raw.length > 700 ? `${raw.slice(0, 700)}…` : raw;
}

function timelineTone(step: "queued" | "running" | "success" | "error", current: "queued" | "running" | "success" | "error") {
  if (step === current) return "warning" as const;
  if (step === "queued") return "success" as const;
  if (step === "running") return current === "success" || current === "error" ? "success" : "neutral";
  if (step === "success") return current === "success" ? "success" : "neutral";
  return current === "error" ? "destructive" : "neutral";
}

export default function AgentRunDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const invalidId = !Number.isFinite(id) || id <= 0;
  const query = useAgentRun(id);

  return (
    <ProtectedLayout module="os">
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/os/agents">Back to agent runs</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href={Number.isFinite(id) && id > 0 ? `/os/agents/${id}/audit` : "/os/agents"}>Open audit trail</Link>
          </Button>
        </div>

        {invalidId ? (
          <ErrorNotice title="Invalid run id">
            <p>Cause: this route does not include a valid numeric run identifier.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: return to the runs list and open detail from a live row.
            </p>
          </ErrorNotice>
        ) : null}
        {query.isLoading && (
          <>
            <p className="text-sm text-muted-foreground">Loading run detail timeline and logs…</p>
            <SkeletonDetailCard />
          </>
        )}
        {query.error instanceof ApiError && query.error.status === 403 && (
          <ForbiddenNotice>
            <p>Cause: this run is outside your current workspace scope or role permissions.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: switch workspace or ask an admin for OS read access.
            </p>
          </ForbiddenNotice>
        )}
        {query.error instanceof ApiError && query.error.status === 404 && (
          <ErrorNotice title="Run not found">
            <p>Cause: this id does not exist in the active workspace scope.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: open detail from the list to avoid stale links.
            </p>
          </ErrorNotice>
        )}
        {query.error &&
          !(query.error instanceof ApiError && (query.error.status === 403 || query.error.status === 404)) && (
            <ErrorNotice>
              <p>Cause: run detail request failed unexpectedly.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Next: refresh once; if it persists, verify API health from Operations and retry.
              </p>
            </ErrorNotice>
          )}

        {query.data ? (
          <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-card">
            {(() => {
              const currentStatus = toAgentStatus(query.data.status) as "queued" | "running" | "success" | "error";
              return (
                <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-foreground">
                Agent run #{query.data.id} · {query.data.job_type}
              </h2>
              <Badge tone={toneFromStatus(query.data.status)}>{currentStatus}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Read-only execution detail. This page does not expose mutations or destructive controls.
            </p>

            <div className="rounded-md border border-border p-3">
              <p className="text-sm font-medium text-foreground">Execution timeline</p>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                <li className="flex flex-wrap items-center gap-2">
                  <Badge tone={timelineTone("queued", currentStatus)}>queued</Badge>
                  <span>Job accepted in queue at {query.data.created_at ?? "timestamp unavailable"}.</span>
                </li>
                <li className="flex flex-wrap items-center gap-2">
                  <Badge tone={timelineTone("running", currentStatus)}>running</Badge>
                  <span>
                    {currentStatus === "running"
                      ? "Execution is currently in progress."
                      : currentStatus === "success" || currentStatus === "error"
                        ? "Execution step completed before finish."
                        : "Waiting for runner to start."}
                  </span>
                </li>
                <li className="flex flex-wrap items-center gap-2">
                  <Badge tone={timelineTone("success", currentStatus)}>success</Badge>
                  <span>
                    {currentStatus === "success"
                      ? `Finished at ${query.data.delivered_at ?? "completion timestamp unavailable"}.`
                      : "Not in success state for this run."}
                  </span>
                </li>
                <li className="flex flex-wrap items-center gap-2">
                  <Badge tone={timelineTone("error", currentStatus)}>error</Badge>
                  <span>
                    {currentStatus === "error"
                      ? `Failed at ${query.data.delivered_at ?? "completion timestamp unavailable"}.`
                      : "No error state detected for this run."}
                  </span>
                </li>
              </ul>
            </div>

            <div className="space-y-3 rounded-md border border-border p-3">
              <p className="text-sm font-medium text-foreground">Summarized logs</p>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Input</p>
                <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 text-xs">
                  {summarizeLog(query.data.input_data)}
                </pre>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Output</p>
                <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 text-xs">
                  {summarizeLog(query.data.output_data)}
                </pre>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Error</p>
                <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 text-xs">
                  {summarizeLog(query.data.error_message)}
                </pre>
              </div>
            </div>

            {currentStatus === "error" ? (
              <ErrorNotice title="Run failed">
                <p>Cause: execution returned an error state from the job runner.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Next: inspect audit trail for attempted action and workspace context, then queue a new run from launcher.
                </p>
              </ErrorNotice>
            ) : (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                <p className="font-medium text-foreground">Cause + next step</p>
                <p className="mt-1 text-muted-foreground">
                  Cause: this detail is a read-only status trace and does not confirm business impact by itself.
                </p>
                <p className="mt-1 text-muted-foreground">
                  Next: validate final outcome in the target module, and use audit trail for workspace-scoped traceability.
                </p>
              </div>
            )}
                </>
              );
            })()}
          </section>
        ) : null}
      </div>
    </ProtectedLayout>
  );
}
