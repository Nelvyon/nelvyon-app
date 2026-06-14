"use client";

import { useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { ErrorNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import { SentimentBar, SocialMetricCard } from "@/features/social/components/SocialPanels";
import { SocialSubNav } from "@/features/social/components/SocialSubNav";
import { useSocialMonitoringDashboard } from "@/features/social/hooks";

export default function SocialMonitoringPage() {
  const [refresh, setRefresh] = useState(false);
  const query = useSocialMonitoringDashboard(refresh);
  const data = query.data;

  return (
    <ProtectedLayout module="social">
      <div className="space-y-6">
        <SocialSubNav />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Menciones, alertas de marca y sentimiento en tiempo casi real.
          </p>
          <Button
            disabled={query.isFetching}
            onClick={() => {
              setRefresh(true);
              void query.refetch();
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            {query.isFetching ? "Actualizando…" : "Actualizar menciones"}
          </Button>
        </div>

        {query.error ? (
          <ErrorNotice>
            <p>No pudimos cargar el monitoring social.</p>
          </ErrorNotice>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SocialMetricCard
            label="Menciones 24h"
            loading={query.isLoading}
            value={String(data?.mentions_24h ?? 0)}
          />
          <SocialMetricCard
            label="Alertas activas"
            loading={query.isLoading}
            value={String(data?.active_alerts ?? 0)}
          />
          <SocialMetricCard
            label="Sentimiento positivo"
            loading={query.isLoading}
            value={`${(data?.positive_percent ?? 0).toFixed(0)}%`}
          />
          <SocialMetricCard
            label="Score medio"
            loading={query.isLoading}
            value={(data?.avg_sentiment_score ?? 0).toFixed(2)}
          />
        </div>

        <PanelCard>
          <h2 className="text-base font-semibold">Distribución de sentimiento</h2>
          <div className="mt-4">
            <SentimentBar
              negative={data?.negative_percent ?? 0}
              positive={data?.positive_percent ?? 0}
            />
          </div>
        </PanelCard>

        <PanelCard>
          <h2 className="text-base font-semibold">Menciones recientes</h2>
          {query.isLoading ? (
            <SkeletonListRows rows={4} />
          ) : (data?.recent_mentions ?? []).length ? (
            <ul className="mt-3 divide-y divide-border">
              {(data?.recent_mentions as Array<Record<string, unknown>>).slice(0, 8).map((m, i) => (
                <li className="py-2 text-sm" key={String(m.id ?? i)}>
                  <p className="font-medium">{String(m.title ?? m.snippet ?? "Mención")}</p>
                  <p className="text-xs text-muted-foreground">
                    {String(m.platform ?? "web")} · {String(m.sentiment ?? "neutral")}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Crea una alerta de keyword para empezar a monitorizar tu marca.
            </p>
          )}
        </PanelCard>
      </div>
    </ProtectedLayout>
  );
}
