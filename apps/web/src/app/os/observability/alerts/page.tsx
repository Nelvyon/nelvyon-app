"use client";

import { ApiError } from "@/core/api/types";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Badge } from "@/core/ui/Badge";
import { ErrorNotice } from "@/core/ui/pageStatus";
import { useObservabilityAlerts } from "@/features/observability/hooks";

/** ESCALA / OBSERVABILIDAD v1 — Flow 3: fixed guardrails simulation (no pager integration). */
export default function OsObservabilityAlertsPage() {
  const q = useObservabilityAlerts();
  const d = q.data;

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground">Alert rule guardrails</h2>
            <Badge tone="neutral">ESCALA / OBSERVABILIDAD v1</Badge>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Read/simulation view only. No pager or external on-call integration in this version.
          </p>
        </header>

        {q.isLoading ? <p className="text-sm text-muted-foreground">Loading alert rules…</p> : null}
        {q.error instanceof ApiError ? (
          <ErrorNotice>
            <p>Could not load alert guardrails.</p>
          </ErrorNotice>
        ) : null}

        {d ? (
          <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">{d.note}</p>
            <div className="space-y-3">
              {d.rules.map((r) => (
                <div className="rounded-md border border-border p-3 text-sm" key={r.key}>
                  <p className="font-medium text-foreground">{r.label}</p>
                  <p className="mt-1 text-muted-foreground">
                    Current: <span className="font-medium text-foreground">{r.current}</span> {r.unit} · warn {r.threshold_warn} ·
                    crit {r.threshold_crit}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Status: <span className="font-medium text-foreground">{r.status}</span> · Would fire:{" "}
                    <span className="font-medium text-foreground">{r.would_fire ? "yes" : "no"}</span>
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </ProtectedLayout>
  );
}
