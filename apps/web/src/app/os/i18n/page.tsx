"use client";

import { ApiError } from "@/core/api/types";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Badge } from "@/core/ui/Badge";
import { ErrorNotice } from "@/core/ui/pageStatus";
import { useI18nBaselineStatus } from "@/features/excellence/hooks";

/** EXCELENCIA MUNDIAL v1 — Flow 2 i18n baseline status (read-only). */
export default function I18nBaselinePage() {
  const q = useI18nBaselineStatus();
  const data = q.data;
  return (
    <ProtectedLayout module="os">
      <div className="space-y-6">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground">i18n baseline status</h2>
            <Badge tone="neutral">EXCELENCIA MUNDIAL v1</Badge>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Baseline visibility only: default locale, enabled locales, module-level coverage, and hardcoded hotspots.
          </p>
        </header>
        {q.isLoading ? <p className="text-sm text-muted-foreground">Loading i18n baseline…</p> : null}
        {q.error instanceof ApiError ? (
          <ErrorNotice>
            <p>{q.error.message}</p>
          </ErrorNotice>
        ) : null}
        {data ? (
          <>
            <section className="rounded-lg border border-border bg-card p-4 text-sm shadow-card">
              <p>
                Default locale: <span className="font-medium text-foreground">{data.default_locale}</span>
              </p>
              <p className="mt-1">
                Enabled locales: <span className="font-medium text-foreground">{data.enabled_locales.join(", ")}</span>
              </p>
            </section>

            <section className="space-y-2 rounded-lg border border-border bg-card p-4 text-sm shadow-card">
              <h3 className="font-semibold text-foreground">Critical module coverage</h3>
              {data.modules.map((m) => (
                <article className="rounded-md border border-border p-3" key={m.module}>
                  <p className="font-medium text-foreground">
                    {m.module} · {m.status} · {m.priority}
                  </p>
                  <p className="text-muted-foreground">{m.notes}</p>
                </article>
              ))}
            </section>

            <section className="space-y-2 rounded-lg border border-border bg-card p-4 text-sm shadow-card">
              <h3 className="font-semibold text-foreground">Hardcoded hotspots (read-only debt inventory)</h3>
              {data.hotspots.map((h) => (
                <article className="rounded-md border border-border p-3" key={`${h.route}-${h.priority}`}>
                  <p className="font-medium text-foreground">
                    {h.route} · {h.status} · {h.priority}
                  </p>
                  <p className="text-muted-foreground">{h.reason}</p>
                </article>
              ))}
            </section>
          </>
        ) : null}
      </div>
    </ProtectedLayout>
  );
}
