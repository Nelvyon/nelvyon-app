"use client";

import Link from "next/link";

import { ApiError } from "@/core/api/types";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Badge } from "@/core/ui/Badge";
import { ErrorNotice } from "@/core/ui/pageStatus";
import { useOsGlobalRiskQueue } from "@/features/osGlobal/hooks";

/** ESCALA GLOBAL / OPERACION v2 — Flow 2 prioritized workspace risk queue. */
export default function OsGlobalRiskQueuePage() {
  const q = useOsGlobalRiskQueue();
  const items = q.data ?? [];
  return (
    <ProtectedLayout module="os">
      <div className="space-y-6">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground">Workspace risk queue</h2>
            <Badge tone="neutral">ESCALA GLOBAL v2</Badge>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Internal prioritization queue only. No incident management workflow, no external notifications.
          </p>
        </header>
        {q.isLoading ? <p className="text-sm text-muted-foreground">Loading risk queue…</p> : null}
        {q.error instanceof ApiError ? (
          <ErrorNotice>
            <p>{q.error.message}</p>
          </ErrorNotice>
        ) : null}
        {!q.isLoading && !items.length ? (
          <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground shadow-card">
            No workspace risk rows for current 24h window.
          </p>
        ) : null}
        <div className="space-y-2">
          {items.map((it) => (
            <article className="rounded-lg border border-border bg-card p-4 text-sm shadow-card" key={`${it.workspace_id}-${it.updated_at}`}>
              <p className="font-medium text-foreground">
                {it.workspace_name} · {it.status}
              </p>
              <p className="text-muted-foreground">Failed jobs: {it.failed_jobs_24h}</p>
              <p className="text-muted-foreground">{it.reason}</p>
              <p className="mt-1">
                <Link className="text-link underline" href={it.cta}>
                  Open workspace incidents view
                </Link>
              </p>
            </article>
          ))}
        </div>
      </div>
    </ProtectedLayout>
  );
}
