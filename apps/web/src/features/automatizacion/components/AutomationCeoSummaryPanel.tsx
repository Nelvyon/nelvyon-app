"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, TrendingUp } from "lucide-react";

import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import { AutomatizacionMetricCard } from "@/features/automatizacion/components/AutomatizacionPanels";
import type { UnifiedAutomationsReporting } from "@/features/automatizacion/types";
import {
  buildAutomationCeoSummary,
  type CeoRecommendation,
} from "@/lib/automationCeoSummary";

function PriorityBadge({ priority }: { priority: CeoRecommendation["priority"] }) {
  const styles = {
    high: "bg-destructive/10 text-destructive",
    medium: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
    low: "bg-muted text-muted-foreground",
  };
  const labels = { high: "Urgente", medium: "Esta semana", low: "Oportunidad" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${styles[priority]}`}>
      {labels[priority]}
    </span>
  );
}

export function AutomationCeoSummaryPanel({
  data,
  loading,
}: {
  data?: UnifiedAutomationsReporting;
  loading?: boolean;
}) {
  const summary = data ? buildAutomationCeoSummary(data) : null;

  return (
    <div className="space-y-6">
      <PanelCard accent="from-violet-500/10 via-card to-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Resumen CEO</p>
        <h2 className="mt-1 text-lg font-semibold">Automatización · enrollments y salud</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Vista ejecutiva: cuántos contactos entran en workflows, cuántos fallan y qué hacer ahora.
        </p>
      </PanelCard>

      <div className="grid gap-4 sm:grid-cols-3">
        <AutomatizacionMetricCard
          label="Enrollments totales"
          loading={loading}
          sub="Ejecuciones + jobs del workspace"
          value={String(summary?.enrollments.total ?? 0)}
        />
        <AutomatizacionMetricCard
          label="Enrollments activos"
          loading={loading}
          sub="En curso o en cola"
          value={String(summary?.enrollments.active ?? 0)}
        />
        <AutomatizacionMetricCard
          label="Enrollments fallidos"
          loading={loading}
          sub="Requieren acción"
          value={String(summary?.enrollments.failed ?? 0)}
        />
      </div>

      <PanelCard>
        <div className="flex items-center gap-2">
          <AlertTriangle aria-hidden className="h-4 w-4 text-amber-600" />
          <h3 className="text-base font-semibold">Errores por workflow</h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Flujos visuales y reglas CRM ordenados por impacto (fallos primero).
        </p>
        {loading ? (
          <div className="mt-4">
            <SkeletonListRows rows={3} />
          </div>
        ) : summary && summary.workflow_errors.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Workflow</th>
                  <th className="pb-2 pr-4 font-medium">Tipo</th>
                  <th className="pb-2 pr-4 font-medium">Ejecuciones</th>
                  <th className="pb-2 pr-4 font-medium">Fallos</th>
                  <th className="pb-2 font-medium">Último error</th>
                </tr>
              </thead>
              <tbody>
                {summary.workflow_errors.slice(0, 8).map((row) => (
                  <tr className="border-b border-border/60" key={row.workflow_key}>
                    <td className="py-2.5 pr-4 font-medium">{row.workflow_name}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {row.workflow_type === "visual" ? "Flujo visual" : "Regla CRM"}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">{row.total_runs}</td>
                    <td className="py-2.5 pr-4 tabular-nums">
                      {row.failed_count > 0 ? (
                        <span className="font-semibold text-destructive">{row.failed_count}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="max-w-[200px] truncate py-2.5 text-xs text-muted-foreground">
                      {row.last_error ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-muted/20 p-4">
            <CheckCircle2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-success" />
            <p className="text-sm text-muted-foreground">
              Sin errores registrados. Cuando actives flujos, verás aquí el desglose por workflow.
            </p>
          </div>
        )}
      </PanelCard>

      <PanelCard>
        <div className="flex items-center gap-2">
          <TrendingUp aria-hidden className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">Próximas acciones recomendadas</h3>
        </div>
        {loading ? (
          <div className="mt-4">
            <SkeletonListRows rows={2} />
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {(summary?.recommendations ?? []).map((rec) => (
              <li
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
                key={rec.id}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <PriorityBadge priority={rec.priority} />
                    <p className="font-medium text-foreground">{rec.title}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{rec.description}</p>
                </div>
                <Button asChild className="shrink-0" size="sm" variant="outline">
                  <Link href={rec.href}>
                    {rec.cta}
                    <ArrowRight aria-hidden className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>
    </div>
  );
}
