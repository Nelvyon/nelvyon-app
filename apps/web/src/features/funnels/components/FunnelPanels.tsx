"use client";

import type { FunnelAnalytics } from "@/features/funnels/types";
import { STEP_TYPE_LABELS } from "@/features/funnels/constants";

export function FunnelMetricCard({
  label,
  value,
  sub,
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-5 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{loading ? "…" : value}</p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function FunnelStepPipeline({
  steps,
  analytics,
}: {
  steps: Array<{ id?: string; name: string; exit_url?: string | null }>;
  analytics?: FunnelAnalytics["steps"];
}) {
  const metricsByName = new Map((analytics ?? []).map((s) => [s.name, s]));

  return (
    <ol className="relative space-y-4 border-l-2 border-primary/30 pl-6">
      {steps.map((step, index) => {
        const m = metricsByName.get(step.name);
        const label = STEP_TYPE_LABELS[step.name] ?? "Paso del embudo";
        return (
          <li className="relative" key={step.id ?? `${step.name}-${index}`}>
            <span className="absolute -left-[1.6rem] flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {index + 1}
            </span>
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{step.name}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
                {m ? (
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {m.visits} visitas · {m.conversions} conv. · {m.conversion_rate}% CR
                    {m.drop_off_rate > 0 ? ` · ${m.drop_off_rate}% abandono` : ""}
                  </p>
                ) : null}
              </div>
              {step.exit_url ? (
                <p className="mt-2 text-xs text-link">
                  Enlace: <span className="font-mono">{step.exit_url}</span>
                </p>
              ) : null}
            </div>
            {index < steps.length - 1 ? (
              <div aria-hidden className="ml-3 mt-2 text-xs text-muted-foreground">
                ↓ siguiente paso
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function FunnelConversionChart({ analytics }: { analytics?: FunnelAnalytics }) {
  const steps = analytics?.steps ?? [];
  if (!steps.length) {
    return <p className="text-sm text-muted-foreground">Sin datos de conversión aún.</p>;
  }
  const maxVisits = Math.max(...steps.map((s) => s.visits), 1);
  return (
    <div className="flex h-32 items-end gap-2">
      {steps.map((step) => (
        <div className="flex flex-1 flex-col items-center gap-1" key={step.step_id}>
          <div
            className="w-full rounded-t bg-primary/80"
            style={{ height: `${(step.visits / maxVisits) * 100}%`, minHeight: step.visits ? 4 : 0 }}
            title={`${step.visits} visitas`}
          />
          <span className="max-w-full truncate text-[10px] text-muted-foreground">{step.name}</span>
        </div>
      ))}
    </div>
  );
}
