"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { canPerformAction } from "@/core/routing/guards";
import { Badge } from "@/core/ui/Badge";
import { Button } from "@/core/ui/button";
import { EmptyState } from "@/core/ui/EmptyState";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import { AGENT_TASK_PRESETS } from "@/features/agents/types";
import { toAgentStatus, useAgentRuns, useLaunchAgentRun } from "@/features/agents/hooks";

function toneFromStatus(status: string): "neutral" | "warning" | "success" | "destructive" {
  const normalized = toAgentStatus(status);
  if (normalized === "success") return "success";
  if (normalized === "error") return "destructive";
  if (normalized === "running") return "warning";
  return "neutral";
}

export default function AgentRunsPage() {
  const { user } = useAuth();
  const canLaunch = user ? canPerformAction(user.role, "os", "create") : false;
  const query = useAgentRuns();
  const launchMutation = useLaunchAgentRun();
  const [statusFilter, setStatusFilter] = useState("all");
  const [jobTypeFilter, setJobTypeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const rows = useMemo(() => query.data?.items ?? [], [query.data]);
  const statusValues = useMemo(
    () => Array.from(new Set(rows.map((run) => toAgentStatus(run.status)))).sort(),
    [rows],
  );
  const jobTypeValues = useMemo(() => Array.from(new Set(rows.map((run) => run.job_type))).sort(), [rows]);
  const sourceValues = useMemo(
    () => Array.from(new Set(rows.map((run) => run.source ?? "unknown"))).sort(),
    [rows],
  );
  const filteredRows = useMemo(
    () =>
      rows.filter((run) => {
        const normalizedStatus = toAgentStatus(run.status);
        const normalizedSource = run.source ?? "unknown";
        if (statusFilter !== "all" && normalizedStatus !== statusFilter) return false;
        if (jobTypeFilter !== "all" && run.job_type !== jobTypeFilter) return false;
        if (sourceFilter !== "all" && normalizedSource !== sourceFilter) return false;
        return true;
      }),
    [rows, statusFilter, jobTypeFilter, sourceFilter],
  );

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Agent run launcher v1: predefined tasks with closed parameters only. No free editor, no destructive actions.
        </p>

        <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
          <h2 className="text-base font-semibold text-foreground">Launch predefined task</h2>
          {!canLaunch ? (
            <ForbiddenNotice>
              <p>Cause: your role can read agent runs but cannot launch new executions in this workspace.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Next: ask an operator/admin to queue the run, then monitor status from this list.
              </p>
            </ForbiddenNotice>
          ) : (
            <ul className="space-y-3">
              {AGENT_TASK_PRESETS.map((preset) => (
                <li className="rounded-md border border-border p-3" key={preset.key}>
                  <p className="font-medium text-foreground">{preset.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{preset.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Closed params: <code>{JSON.stringify(preset.input)}</code>
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      disabled={launchMutation.isPending}
                      onClick={async () => {
                        await launchMutation.mutateAsync(preset);
                      }}
                      size="sm"
                    >
                      Queue run
                    </Button>
                    <Badge tone={launchMutation.isPending ? "warning" : "neutral"}>
                      {launchMutation.isPending ? "running" : "queued/success/error"}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {query.isLoading && <SkeletonListRows aria-label="Loading agent runs" rows={8} />}
        {query.isFetching && query.data ? (
          <p className="text-xs text-muted-foreground">Refreshing agent runs for current workspace…</p>
        ) : null}
        {query.error instanceof ApiError && query.error.status === 403 && (
          <ForbiddenNotice>
            <p>Cause: this workspace or role cannot read agent runs (OS visibility denied).</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: switch workspace or request OS read access from an admin.
            </p>
          </ForbiddenNotice>
        )}
        {query.error && !(query.error instanceof ApiError && query.error.status === 403) && (
          <ErrorNotice>
            <p>Cause: agent run list failed before rows were rendered.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: refresh once, then verify workspace header and token if the issue continues.
            </p>
          </ErrorNotice>
        )}

        {rows.length > 0 ? (
          <section className="space-y-2 rounded-lg border border-border bg-card p-4 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-foreground">Filter runs</h2>
              <Button
                onClick={() => {
                  setStatusFilter("all");
                  setJobTypeFilter("all");
                  setSourceFilter("all");
                }}
                size="sm"
                variant="outline"
              >
                Reset filters
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1 text-xs text-muted-foreground">
                Status
                <select
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
                  onChange={(event) => setStatusFilter(event.target.value)}
                  value={statusFilter}
                >
                  <option value="all">All statuses</option>
                  {statusValues.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                Job type
                <select
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
                  onChange={(event) => setJobTypeFilter(event.target.value)}
                  value={jobTypeFilter}
                >
                  <option value="all">All job types</option>
                  {jobTypeValues.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                Source
                <select
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
                  onChange={(event) => setSourceFilter(event.target.value)}
                  value={sourceFilter}
                >
                  <option value="all">All sources</option>
                  {sourceValues.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Showing {filteredRows.length} of {rows.length} runs in current workspace.
            </p>
          </section>
        ) : null}

        {query.data && rows.length === 0 ? (
          <EmptyState
            description="No runs were queued yet for this workspace. Queue one predefined task above to start."
            title="No agent runs yet"
          />
        ) : null}

        {query.data && rows.length > 0 && filteredRows.length === 0 ? (
          <EmptyState
            description="No runs match the selected filters. Next: adjust one filter or reset all filters."
            title="No matching runs"
          />
        ) : null}

        {query.data && filteredRows.length > 0 ? (
          <ul className="divide-y rounded-lg border border-border bg-card shadow-card">
            {filteredRows.map((run) => (
              <li className="space-y-1 p-3" key={run.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    className="font-medium text-link transition-colors hover:text-link-hover hover:underline"
                    href={`/os/agents/${run.id}`}
                  >
                    Agent run #{run.id} · {run.job_type}
                  </Link>
                  <Badge tone={toneFromStatus(run.status)}>{toAgentStatus(run.status)}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Workspace: {run.workspace_id ?? "—"} · Source: {run.source ?? "—"}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </ProtectedLayout>
  );
}
