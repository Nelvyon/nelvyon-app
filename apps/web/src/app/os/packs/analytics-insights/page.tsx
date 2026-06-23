"use client";

import Link from "next/link";
import { useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { PackRunProgress } from "@/features/packs/GrowthPackComponents";
import { useKickoffAnalyticsInsights, useGa4ConnectionStatus } from "@/features/packs/hooks";
import { ANALYTICS_INSIGHTS_META } from "@/lib/packs/analyticsInsightsPack";

export default function OsAnalyticsInsightsPackPage() {
  const mutation = useKickoffAnalyticsInsights();
  const ga4 = useGa4ConnectionStatus();
  const [runId, setRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const launch = async (demoMode: boolean) => {
    setError(null);
    try {
      const run = await mutation.mutateAsync({
        business_name: "Demo Analytics Insights",
        period_days: 28,
        demo_mode: demoMode,
      });
      setRunId(run.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al lanzar pack");
    }
  };

  return (
    <ProtectedLayout module="os">
      <div className="mx-auto max-w-3xl space-y-6">
        <PanelCard className={`bg-gradient-to-br ${ANALYTICS_INSIGHTS_META.accent}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Pack beta · GA4</p>
          <h1 className="mt-1 text-2xl font-bold">{ANALYTICS_INSIGHTS_META.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{ANALYTICS_INSIGHTS_META.tagline}</p>
          <Button asChild className="mt-4" size="sm" variant="outline">
            <Link href={ANALYTICS_INSIGHTS_META.reportPath}>Ver informe →</Link>
          </Button>
        </PanelCard>

        <PanelCard>
          <p className="text-sm font-medium">Estado GA4</p>
          {ga4.isLoading ? (
            <p className="mt-2 text-sm text-muted-foreground">Comprobando conexión…</p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              {ga4.data?.connected
                ? `Conectado · propiedad ${ga4.data.property_id}`
                : "Sin OAuth GA4 — puedes lanzar en modo demo (staging) o conectar en Integraciones."}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button disabled={mutation.isPending} onClick={() => void launch(true)} type="button">
              {mutation.isPending ? "Ejecutando…" : "Lanzar demo (fixture GA4)"}
            </Button>
            <Button
              disabled={mutation.isPending || !ga4.data?.connected}
              onClick={() => void launch(false)}
              type="button"
              variant="secondary"
            >
              Lanzar con GA4 real
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/api/oauth/google">Conectar Google (OAuth)</Link>
            </Button>
          </div>
          {error ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </PanelCard>

        {runId ? <PackRunProgress packId="analytics-insights" runId={runId} /> : null}
      </div>
    </ProtectedLayout>
  );
}
