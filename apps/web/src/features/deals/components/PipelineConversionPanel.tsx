"use client";

import React from "react";

import { ApiError } from "@/core/api/types";
import { PipelineStageMetric, PipelineSummary } from "@/features/deals/types";

const STAGE_LABELS: Record<string, string> = {
  lead: "Lead",
  qualified: "Calificado",
  proposal: "Propuesta",
  negotiation: "Negociación",
  won: "Ganado",
  lost: "Perdido",
};

function getStages(summary?: PipelineSummary): PipelineStageMetric[] {
  if (!summary) return [];
  return summary.by_stage ?? summary.items ?? summary.stages ?? [];
}

export function PipelineConversionPanel({
  summary,
  isLoading,
  error,
}: {
  summary?: PipelineSummary;
  isLoading?: boolean;
  error?: unknown;
}) {
  const stages = getStages(summary);
  const total = stages.reduce((acc, row) => acc + (row.count ?? 0), 0);
  const open = stages
    .filter((row) => !["won", "lost"].includes((row.stage ?? "").toLowerCase()))
    .reduce((acc, row) => acc + (row.count ?? 0), 0);
  const won = stages
    .filter((row) => (row.stage ?? "").toLowerCase() === "won")
    .reduce((acc, row) => acc + (row.count ?? 0), 0);
  const winRate = open + won > 0 ? (won / (open + won)) * 100 : 0;
  const maxCount = Math.max(...stages.map((s) => s.count ?? 0), 1);

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-card">
      <h2 className="text-base font-semibold text-foreground">Conversión del pipeline</h2>
      {!isLoading && !error ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Deals totales" value={String(total)} />
          <Stat label="Abiertos" value={String(open)} />
          <Stat label="Tasa de cierre" value={`${winRate.toFixed(1)}%`} />
        </div>
      ) : null}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando analytics del pipeline…</p>
      ) : null}
      {error ? (
        <div className="space-y-1 text-sm">
          <p className="font-medium text-destructive">No se pudo cargar el resumen del pipeline.</p>
          <p className="text-muted-foreground">
            {error instanceof ApiError && error.status === 403
              ? "Tu rol no tiene acceso a analytics CRM. Cambia de workspace o pide permisos."
              : "Revisa tu conexión e inténtalo de nuevo."}
          </p>
        </div>
      ) : null}
      {!isLoading && !error && stages.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aún no hay deals en este workspace. Crea oportunidades desde{" "}
          <strong>Pipeline → Nuevo deal</strong> para ver la conversión por etapa.
        </p>
      ) : null}
      {!isLoading && !error && stages.length > 0 ? (
        <ul className="space-y-3">
          {stages.map((row) => {
            const count = row.count ?? 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            const barPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
            const stageKey = (row.stage ?? "unknown").toLowerCase();
            return (
              <li key={`${row.stage}-${count}`}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">
                    {STAGE_LABELS[stageKey] ?? row.stage}
                  </span>
                  <span className="text-muted-foreground">
                    {count} · {pct.toFixed(0)}% · {(row.value ?? 0).toLocaleString("es-ES")} €
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
