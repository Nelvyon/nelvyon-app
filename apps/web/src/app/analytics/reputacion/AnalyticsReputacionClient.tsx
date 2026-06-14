"use client";

import Link from "next/link";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { ReputacionMetricCard, SentimentBar } from "@/features/reputacion/components/ReputacionPanels";
import { ReputacionMockBadge, ReputacionSubNav } from "@/features/reputacion/components/ReputacionSubNav";
import { useReputacionUnifiedReporting } from "@/features/reputacion/hooks";
import { ReportingSubNav } from "@/features/reporting/components/ReportingSubNav";

export function AnalyticsReputacionClient() {
  const query = useReputacionUnifiedReporting();
  const unified = query.data?.unified;

  return (
    <ProtectedLayout module="reputacion">
      <div className="space-y-6">
        <ReportingSubNav />
        <ReputacionSubNav />
        <ReputacionMockBadge mock={unified?.mock} />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ReputacionMetricCard label="Reseñas" loading={query.isLoading} value={String(unified?.total_reviews ?? 0)} />
          <ReputacionMetricCard label="Nota media" loading={query.isLoading} value={String(unified?.avg_rating ?? 0)} />
          <ReputacionMetricCard label="Positivas" loading={query.isLoading} value={`${unified?.positive_percent ?? 0}%`} />
          <ReputacionMetricCard label="Alertas" loading={query.isLoading} value={String(unified?.active_alerts ?? 0)} />
        </div>

        <PanelCard>
          <h2 className="text-base font-semibold">Reporting de reputación</h2>
          <div className="mt-4">
            <SentimentBar
              negative={unified?.negative_percent ?? 0}
              neutral={unified?.neutral_percent ?? 0}
              positive={unified?.positive_percent ?? 0}
            />
          </div>
        </PanelCard>

        <Button asChild variant="outline">
          <Link href="/reputacion/resenas">Ver todas las reseñas</Link>
        </Button>
      </div>
    </ProtectedLayout>
  );
}
