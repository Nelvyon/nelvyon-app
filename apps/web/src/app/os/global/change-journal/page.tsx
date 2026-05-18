"use client";

import { ApiError } from "@/core/api/types";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Badge } from "@/core/ui/Badge";
import { ErrorNotice } from "@/core/ui/pageStatus";
import { useOsGlobalChangeJournal } from "@/features/osGlobal/hooks";

/** ESCALA GLOBAL / OPERACION v2 — Flow 3 consolidated operational change journal. */
export default function OsGlobalChangeJournalPage() {
  const q = useOsGlobalChangeJournal();
  const items = q.data ?? [];
  return (
    <ProtectedLayout module="os">
      <div className="space-y-6">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground">Operational change journal</h2>
            <Badge tone="neutral">ESCALA GLOBAL v2</Badge>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Consolidated read-only timeline of operational changes from existing logs (no new approval workflow).
          </p>
        </header>
        {q.isLoading ? <p className="text-sm text-muted-foreground">Loading journal…</p> : null}
        {q.error instanceof ApiError ? (
          <ErrorNotice>
            <p>{q.error.message}</p>
          </ErrorNotice>
        ) : null}
        {!q.isLoading && !items.length ? (
          <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground shadow-card">
            No change events available for your workspace set.
          </p>
        ) : null}
        <div className="space-y-2">
          {items.map((ev, idx) => (
            <article className="rounded-lg border border-border bg-card p-4 text-sm shadow-card" key={`${ev.workspace_id}-${idx}-${ev.created_at}`}>
              <p className="font-medium text-foreground">
                {ev.workspace_name} · {ev.event_type}
              </p>
              <p className="text-muted-foreground">
                {ev.from_value} → {ev.to_value}
              </p>
              <p className="text-muted-foreground">
                by {ev.actor_email || ev.actor_user_id} · {ev.created_at}
              </p>
              {ev.note ? <p className="text-muted-foreground">note: {ev.note}</p> : null}
            </article>
          ))}
        </div>
      </div>
    </ProtectedLayout>
  );
}
