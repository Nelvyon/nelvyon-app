"use client";

import { ApiError } from "@/core/api/types";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Badge } from "@/core/ui/Badge";
import { ErrorNotice } from "@/core/ui/pageStatus";
import { useGoldenPathGate } from "@/features/excellence/hooks";

/** EXCELENCIA MUNDIAL v1 — Flow 3 golden path gate contract (read-only). */
export default function GoldenPathPage() {
  const q = useGoldenPathGate();
  const data = q.data;
  return (
    <ProtectedLayout module="os">
      <div className="space-y-6">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground">Golden path gate</h2>
            <Badge tone="neutral">EXCELENCIA MUNDIAL v1</Badge>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Read-only contract of required checks before declaring a change as ready.
          </p>
        </header>
        {q.isLoading ? <p className="text-sm text-muted-foreground">Loading golden path…</p> : null}
        {q.error instanceof ApiError ? (
          <ErrorNotice>
            <p>{q.error.message}</p>
          </ErrorNotice>
        ) : null}
        {data ? (
          <>
            <section className="rounded-lg border border-border bg-card p-4 text-sm shadow-card">
              <p className="font-medium text-foreground">{data.criterion}</p>
            </section>
            <section className="space-y-2 rounded-lg border border-border bg-card p-4 text-sm shadow-card">
              {data.steps.map((s) => (
                <article className="rounded-md border border-border p-3" key={s.key}>
                  <p className="font-medium text-foreground">
                    {s.label} · {s.status}
                  </p>
                  <p className="text-muted-foreground">{s.verification}</p>
                  <p className="text-muted-foreground">Verify via: {s.verify_ref}</p>
                </article>
              ))}
            </section>
          </>
        ) : null}
      </div>
    </ProtectedLayout>
  );
}
