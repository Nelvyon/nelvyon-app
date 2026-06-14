"use client";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { ErrorNotice } from "@/core/ui/pageStatus";
import {
  ReputacionMetricCard,
  ReviewList,
  SentimentBar,
} from "@/features/reputacion/components/ReputacionPanels";
import { ReputacionMockBadge, ReputacionSubNav } from "@/features/reputacion/components/ReputacionSubNav";
import { useConnectGoogleBusiness, useReputacionUnifiedReporting } from "@/features/reputacion/hooks";

export function ReputacionHubClient() {
  const query = useReputacionUnifiedReporting();
  const connect = useConnectGoogleBusiness();
  const unified = query.data?.unified;
  const reviews = query.data?.reviews?.items ?? [];

  return (
    <ProtectedLayout module="reputacion">
      <div className="space-y-6">
        <ReputacionSubNav />

        <div className="flex flex-wrap items-center gap-3">
          <ReputacionMockBadge mock={unified?.mock} />
        </div>

        {query.error ? (
          <ErrorNotice>
            <p>No pudimos cargar el resumen de reputación.</p>
          </ErrorNotice>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ReputacionMetricCard
            label="Reseñas totales"
            loading={query.isLoading}
            sub={`Nota media ${unified?.avg_rating ?? 0}`}
            value={String(unified?.total_reviews ?? 0)}
          />
          <ReputacionMetricCard
            label="Positivas"
            loading={query.isLoading}
            value={`${unified?.positive_percent ?? 0}%`}
          />
          <ReputacionMetricCard
            label="Negativas"
            loading={query.isLoading}
            sub={`${unified?.active_alerts ?? 0} alertas`}
            value={`${unified?.negative_percent ?? 0}%`}
          />
          <ReputacionMetricCard
            label="Google Business"
            loading={query.isLoading}
            value={unified?.google_connected ? "Conectado" : "Demo"}
          />
        </div>

        <PanelCard>
          <h2 className="text-base font-semibold">Sentimiento de reseñas</h2>
          <div className="mt-4">
            <SentimentBar
              negative={unified?.negative_percent ?? 0}
              neutral={unified?.neutral_percent ?? 0}
              positive={unified?.positive_percent ?? 0}
            />
          </div>
        </PanelCard>

        <PanelCard>
          <h2 className="text-base font-semibold">Últimas reseñas</h2>
          <div className="mt-4">
            <ReviewList items={reviews.slice(0, 3)} />
          </div>
        </PanelCard>

        <Button disabled={connect.isPending} onClick={() => void connect.mutate()} type="button">
          {connect.isPending ? "Conectando…" : "Conectar Google Business (demo)"}
        </Button>
      </div>
    </ProtectedLayout>
  );
}
