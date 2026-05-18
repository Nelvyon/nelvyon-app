"use client";

import Link from "next/link";

import { ApiError } from "@/core/api/types";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Badge } from "@/core/ui/Badge";
import { ErrorNotice } from "@/core/ui/pageStatus";
import { useObservabilityHealth } from "@/features/observability/hooks";

const LEVEL_STYLES: Record<string, string> = {
  ok: "text-success-foreground",
  warn: "text-warning-foreground",
  crit: "text-destructive",
};

/** ESCALA / OBSERVABILIDAD v1 — Flow 1: 24h health + SLO snapshot. */
export default function OsObservabilitySnapshotPage() {
  const q = useObservabilityHealth();
  const d = q.data;
  const level = d?.status ?? "ok";

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground">Health & SLO snapshot</h2>
            <Badge tone="neutral">ESCALA / OBSERVABILIDAD v1</Badge>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Fixed 24h window with minimum real signals: 5xx rate, latency p95, failed jobs, and queue backlog. This is an
            internal operational panel, not an external on-call/pager product.
          </p>
        </header>

        {q.isLoading ? <p className="text-sm text-muted-foreground">Loading 24h snapshot…</p> : null}
        {q.error instanceof ApiError ? (
          <ErrorNotice>
            <p>Could not load observability snapshot.</p>
          </ErrorNotice>
        ) : null}

        {d ? (
          <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-card">
            <p className={`text-sm font-semibold uppercase tracking-wide ${LEVEL_STYLES[level]}`}>Status: {d.status}</p>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Window</dt>
                <dd className="font-medium text-foreground">{d.window}</dd>
              </div>
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
                <dd className="font-medium text-foreground">{d.failed_jobs}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Queue backlog</dt>
                <dd className="font-medium text-foreground">{d.queue_backlog}</dd>
              </div>
            </dl>
          </section>
        ) : null}

        <div className="flex flex-wrap gap-4 text-sm">
          <Link className="text-link underline" href="/os/observability/incidents">
            Open incident drilldown
          </Link>
          <Link className="text-link underline" href="/os/observability/alerts">
            Open alert guardrails
          </Link>
        </div>
      </div>
    </ProtectedLayout>
  );
}
