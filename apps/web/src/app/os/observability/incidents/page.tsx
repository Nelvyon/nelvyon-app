"use client";

import Link from "next/link";

import { ApiError } from "@/core/api/types";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Badge } from "@/core/ui/Badge";
import { ErrorNotice } from "@/core/ui/pageStatus";
import { useObservabilityIncidents } from "@/features/observability/hooks";

/** ESCALA / OBSERVABILIDAD v1 — Flow 2: minimal drilldown with correlation id and runbook CTA. */
export default function OsObservabilityIncidentsPage() {
  const q = useObservabilityIncidents();
  const items = q.data ?? [];

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground">Incident drilldown</h2>
            <Badge tone="neutral">ESCALA / OBSERVABILIDAD v1</Badge>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Top failing endpoints and job types in the last 24h with last error preview and correlation id for quick triage.
          </p>
        </header>

        {q.isLoading ? <p className="text-sm text-muted-foreground">Loading incidents…</p> : null}
        {q.error instanceof ApiError ? (
          <ErrorNotice>
            <p>Could not load incidents.</p>
          </ErrorNotice>
        ) : null}

        {!q.isLoading && !items.length ? (
          <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground shadow-card">
            No incidents in the 24h window.
          </p>
        ) : null}

        <div className="space-y-3">
          {items.map((it, idx) => (
            <article className="rounded-lg border border-border bg-card p-4 text-sm shadow-card" key={`${it.kind}-${it.key}-${idx}`}>
              <p className="font-semibold text-foreground">
                {it.kind === "endpoint" ? "Endpoint" : "Job type"}: {it.key}
              </p>
              <p className="mt-1 text-muted-foreground">Failures: {it.failures}</p>
              <p className="mt-1 text-muted-foreground">Last error: {it.last_error}</p>
              <p className="mt-1 text-muted-foreground">Correlation: {it.correlation_id ?? "not available"}</p>
              <p className="mt-2">
                <Link className="text-link underline" href={it.cta_runbook}>
                  Open runbook
                </Link>
              </p>
            </article>
          ))}
        </div>
      </div>
    </ProtectedLayout>
  );
}
