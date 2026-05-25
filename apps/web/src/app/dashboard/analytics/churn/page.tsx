"use client";

import { AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { cn } from "@/core/ui/utils";
import { DashboardListShell, SkeletonList } from "@/features/dashboard/components/DashboardTabs";
import { analyticsIntelligenceApi, type ChurnRisk } from "@/features/analytics/api";

function riskColor(score: number) {
  if (score >= 70) return "text-red-600";
  if (score >= 60) return "text-orange-600";
  return "text-amber-600";
}

function riskBarColor(score: number) {
  if (score >= 70) return "bg-red-500";
  if (score >= 60) return "bg-orange-500";
  return "bg-amber-500";
}

export default function ChurnPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ChurnRisk[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await analyticsIntelligenceApi.churnAtRisk(60);
      setItems(data.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  return (
    <ProtectedLayout module="os">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Workspaces con riesgo de churn ≥ 60% (alerta automática en Redis si ≥ 70%)
        </p>
        <button
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
          disabled={loading}
          onClick={() => load()}
          type="button"
        >
          Actualizar
        </button>
      </div>
      <DashboardListShell
        empty={!loading && items.length === 0}
        emptyDescription="No hay workspaces por encima del umbral de riesgo."
        emptyTitle="Sin riesgo elevado"
        loading={loading}
        skeleton={<SkeletonList rows={6} />}
      >
        <ul className="space-y-4">
          {items.map((item) => (
            <li className="rounded-xl border bg-card p-4" key={item.workspace_id}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {item.risk_score >= 70 && item.alert_active ? (
                    <AlertTriangle aria-hidden className="h-4 w-4 text-red-500" />
                  ) : null}
                  <span className="font-medium">Workspace #{item.workspace_id}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{item.risk_level}</span>
                </div>
                <span className={cn("text-lg font-bold tabular-nums", riskColor(item.risk_score))}>
                  {item.risk_score}%
                </span>
              </div>
              <div className="mb-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-all", riskBarColor(item.risk_score))}
                  style={{ width: `${Math.min(100, item.risk_score)}%` }}
                />
              </div>
              {item.reasons?.length ? (
                <div className="mb-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Factores de riesgo</p>
                  <ul className="list-inside list-disc text-sm text-muted-foreground">
                    {item.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {item.preventive_actions?.length ? (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Acciones recomendadas</p>
                  <ul className="list-inside list-disc text-sm">
                    {item.preventive_actions.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </DashboardListShell>
    </ProtectedLayout>
  );
}
