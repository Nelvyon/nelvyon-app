"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, Circle, Clock } from "lucide-react";

import { Button } from "@/core/ui/button";
import type { PortalDeliverable } from "@/features/client_portal_v1/types";
import { buildPackPortalView } from "@/features/client_portal_v1/portalPackProgress";

const TASK_ICONS = {
  done: CheckCircle2,
  review: Clock,
  changes: AlertCircle,
  pending: Circle,
} as const;

const TASK_LABELS = {
  done: "Aprobado",
  review: "Pendiente de revisión",
  changes: "Cambios solicitados",
  pending: "En preparación",
} as const;

export function PortalPackProgressPanel({
  packId,
  deliverables,
}: {
  packId: string;
  deliverables: PortalDeliverable[];
}) {
  const view = buildPackPortalView(packId, deliverables);
  const summary = view.packSummary;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-5 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Growth Pack</p>
        <h2 className="mt-1 text-lg font-semibold">{view.packLabel}</h2>
        {summary?.summary ? (
          <p className="mt-2 text-sm text-muted-foreground">{summary.summary}</p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Seguimiento de tareas, entregables y resultados de tu pack de crecimiento.
          </p>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <Stat label="Entregables" value={view.stats.total} />
          <Stat label="Aprobados" value={view.stats.approved} />
          <Stat label="Por revisar" value={view.stats.pending} accent="amber" />
          <Stat label="Cambios" value={view.stats.changes} accent="rose" />
        </div>

        {summary?.kpis ? (
          <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
            {summary.kpis.avg_qa_score != null ? (
              <Stat label="Calidad media QA" value={`${summary.kpis.avg_qa_score}%`} />
            ) : null}
            {summary.kpis.skus_passed != null && summary.kpis.skus_total != null ? (
              <Stat
                label="Servicios completados"
                value={`${summary.kpis.skus_passed}/${summary.kpis.skus_total}`}
              />
            ) : null}
            {summary.kpis.deliverables_published != null ? (
              <Stat label="Publicados" value={summary.kpis.deliverables_published} />
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold">Tareas del pack</h3>
        <ul className="space-y-2">
          {view.tasks.map((task) => {
            const Icon = TASK_ICONS[task.status];
            return (
              <li
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
                key={task.catalogTitle}
              >
                <div className="flex min-w-0 gap-3">
                  <Icon
                    aria-hidden
                    className={`mt-0.5 h-5 w-5 shrink-0 ${
                      task.status === "done"
                        ? "text-success"
                        : task.status === "changes"
                          ? "text-destructive"
                          : task.status === "review"
                            ? "text-amber-600"
                            : "text-muted-foreground"
                    }`}
                  />
                  <div>
                    <p className="font-medium text-foreground">{task.catalogTitle}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{task.description}</p>
                    <p className="mt-1 text-xs font-medium text-muted-foreground">
                      {TASK_LABELS[task.status]}
                    </p>
                  </div>
                </div>
                {task.deliverableId ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/portal/deliverables/${task.deliverableId}`}>{task.portalLabel}</Link>
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      {view.changes.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-base font-semibold">Cambios solicitados</h3>
          <ul className="space-y-2">
            {view.changes.map((d) => (
              <li
                className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
                key={d.id}
              >
                <p className="font-medium">{d.title}</p>
                {d.client_feedback ? (
                  <p className="mt-1 text-muted-foreground">{d.client_feedback}</p>
                ) : null}
                <Button asChild className="mt-2" size="sm" variant="outline">
                  <Link href={`/portal/deliverables/${d.id}`}>Ver entregable</Link>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {summary?.next_steps && summary.next_steps.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-base font-semibold">Próximos pasos (agencia)</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {summary.next_steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: "amber" | "rose";
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`mt-0.5 text-xl font-semibold tabular-nums ${
          accent === "amber" ? "text-amber-700" : accent === "rose" ? "text-destructive" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
