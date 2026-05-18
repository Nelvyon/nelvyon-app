"use client";

import Link from "next/link";

import { ApiError } from "@/core/api/types";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Badge } from "@/core/ui/Badge";
import { ErrorNotice } from "@/core/ui/pageStatus";
import { useOsGlobalSnapshot } from "@/features/osGlobal/hooks";

/** ESCALA GLOBAL / OPERACION v2 — Flow 1 cross-workspace snapshot. */
export default function OsGlobalSnapshotPage() {
  const q = useOsGlobalSnapshot();
  const d = q.data;

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground">Cross-workspace operations snapshot</h2>
            <Badge tone="neutral">ESCALA GLOBAL v2</Badge>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Internal 24h rollup across your accessible workspaces. No external pager/on-call and no global redesign in this
            version.
          </p>
        </header>

        {q.isLoading ? <p className="text-sm text-muted-foreground">Loading global snapshot…</p> : null}
        {q.error instanceof ApiError ? (
          <ErrorNotice>
            <p>{q.error.message}</p>
          </ErrorNotice>
        ) : null}

        {d ? (
          <>
            <section className="rounded-lg border border-border bg-card p-4 shadow-card">
              <p className="text-sm text-muted-foreground">
                Status <span className="font-medium text-foreground">{d.status}</span> · Workspaces seen{" "}
                <span className="font-medium text-foreground">{d.workspaces_seen}</span> · Window {d.window}
              </p>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">HTTP 5xx rate</dt>
                  <dd className="font-medium text-foreground">{(d.five_xx_rate * 100).toFixed(2)}%</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Latency p95</dt>
                  <dd className="font-medium text-foreground">{d.latency_p95_ms} ms</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Failed jobs (24h)</dt>
                  <dd className="font-medium text-foreground">{d.failed_jobs_24h}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Queue backlog</dt>
                  <dd className="font-medium text-foreground">{d.queue_backlog}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-lg border border-border bg-card p-4 shadow-card">
              <h3 className="text-sm font-semibold text-foreground">Top workspaces by risk</h3>
              {!d.top_risky_workspaces.length ? (
                <p className="mt-2 text-sm text-muted-foreground">No risky workspaces in this window.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {d.top_risky_workspaces.map((w) => (
                    <article className="rounded-md border border-border p-3 text-sm" key={w.workspace_id}>
                      <p className="font-medium text-foreground">
                        {w.workspace_name} · {w.status}
                      </p>
                      <p className="text-muted-foreground">{w.reason}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}

        <div className="flex flex-wrap gap-4 text-sm">
          <Link className="text-link underline" href="/os/global/risk-queue">
            Open risk queue
          </Link>
          <Link className="text-link underline" href="/os/global/change-journal">
            Open change journal
          </Link>
        </div>
      </div>
    </ProtectedLayout>
  );
}
