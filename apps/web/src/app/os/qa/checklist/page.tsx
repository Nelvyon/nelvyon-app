"use client";

import Link from "next/link";

import { ApiError } from "@/core/api/types";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Badge } from "@/core/ui/Badge";
import { ErrorNotice } from "@/core/ui/pageStatus";
import { useQaCoreChecklist } from "@/features/excellence/hooks";

/** EXCELENCIA MUNDIAL v1 — Flow 1 QA core checklist (read-only). */
export default function QaChecklistPage() {
  const q = useQaCoreChecklist();
  const data = q.data;

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground">QA core checklist</h2>
            <Badge tone="neutral">EXCELENCIA MUNDIAL v1</Badge>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Read-only operational checklist to inspect core quality status before declaring a change as ready.
          </p>
        </header>

        {q.isLoading ? <p className="text-sm text-muted-foreground">Loading checklist…</p> : null}
        {q.error instanceof ApiError ? (
          <ErrorNotice>
            <p>{q.error.message}</p>
          </ErrorNotice>
        ) : null}

        {data ? (
          <>
            <p className="text-xs text-muted-foreground">Generated at: {data.generated_at}</p>
            <div className="space-y-2">
              {data.items.map((item) => (
                <article className="rounded-lg border border-border bg-card p-4 text-sm shadow-card" key={item.key}>
                  <p className="font-medium text-foreground">
                    {item.label} · <span className="uppercase">{item.status}</span>
                  </p>
                  <p className="text-muted-foreground">{item.evidence}</p>
                  <p className="mt-1">
                    <Link className="text-link underline" href={item.verify_path}>
                      Open evidence path
                    </Link>
                  </p>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </ProtectedLayout>
  );
}
