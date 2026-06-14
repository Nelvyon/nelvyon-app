"use client";

import Link from "next/link";

import { ApiError } from "@/core/api/types";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import {
  SentimentBar,
  SocialMetricCard,
  SocialMiniChart,
  SocialMockBadge,
} from "@/features/social/components/SocialPanels";
import { SocialSubNav } from "@/features/social/components/SocialSubNav";
import { useSocialUnifiedReporting } from "@/features/social/hooks";

export default function SocialHubPage() {
  const query = useSocialUnifiedReporting();
  const unified = query.data?.unified;
  const monitoring = query.data?.monitoring;
  const autoPublish = query.data?.auto_publish;
  const keywords = monitoring?.top_keywords ?? [];
  const platforms = Object.entries(autoPublish?.by_platform ?? {});

  return (
    <ProtectedLayout module="social">
      <div className="space-y-6">
        <SocialSubNav />

        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Programación, auto-publicación con IA y monitoring de marca en un solo módulo Social.
          </p>
          <SocialMockBadge mock={unified?.mock} />
        </div>

        {query.error instanceof ApiError && query.error.status === 403 ? (
          <ForbiddenNotice>
            <p>No tienes acceso a Social en este workspace.</p>
          </ForbiddenNotice>
        ) : null}
        {query.error && !(query.error instanceof ApiError && query.error.status === 403) ? (
          <ErrorNotice>
            <p>No pudimos cargar el resumen de Social.</p>
          </ErrorNotice>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SocialMetricCard
            label="Cuentas conectadas"
            loading={query.isLoading}
            sub="Redes vinculadas"
            value={String(unified?.connected_accounts ?? 0)}
          />
          <SocialMetricCard
            label="Posts programados"
            loading={query.isLoading}
            sub={`${unified?.posts_published ?? 0} publicados`}
            value={String(unified?.posts_scheduled ?? 0)}
          />
          <SocialMetricCard
            label="Alcance total"
            loading={query.isLoading}
            sub={`${unified?.total_engagement ?? 0} interacciones`}
            value={String(unified?.total_reach ?? 0)}
          />
          <SocialMetricCard
            label="Menciones 24h"
            loading={query.isLoading}
            sub={`${unified?.active_alerts ?? 0} alertas activas`}
            value={String(unified?.mentions_24h ?? 0)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <PanelCard>
            <h2 className="text-base font-semibold">Sentimiento de marca</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Neto: {(unified?.sentiment_net ?? 0).toFixed(1)} pts · Positivo{" "}
              {(monitoring?.positive_percent ?? 0).toFixed(0)}% / Negativo{" "}
              {(monitoring?.negative_percent ?? 0).toFixed(0)}%
            </p>
            <div className="mt-4">
              <SentimentBar
                negative={monitoring?.negative_percent ?? 0}
                positive={monitoring?.positive_percent ?? 0}
              />
            </div>
          </PanelCard>

          <PanelCard>
            <h2 className="text-base font-semibold">Alcance por plataforma</h2>
            {query.isLoading ? (
              <SkeletonListRows rows={3} />
            ) : platforms.length ? (
              <ul className="mt-3 divide-y divide-border">
                {platforms.map(([platform, stats]) => (
                  <li className="flex justify-between py-2 text-sm" key={platform}>
                    <span className="font-medium capitalize">{platform}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {stats.reach} alcance · {stats.likes + stats.comments} eng.
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Sin datos de publicación aún.</p>
            )}
          </PanelCard>

          <PanelCard>
            <h2 className="text-base font-semibold">Evolución sentimiento (7d)</h2>
            <div className="mt-4">
              <SocialMiniChart values={(monitoring?.sentiment_by_day as number[]) ?? []} />
            </div>
          </PanelCard>
        </div>

        {keywords.length ? (
          <PanelCard>
            <h2 className="text-base font-semibold">Keywords trending</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {keywords.slice(0, 8).map((k) => (
                <span
                  className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium"
                  key={k.keyword}
                >
                  {k.keyword} ({k.count})
                </span>
              ))}
            </div>
          </PanelCard>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/social/scheduler">Programar contenido</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/social/monitoring">Ver monitoring</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/social/auto-publish">Auto-publicación IA</Link>
          </Button>
        </div>
      </div>
    </ProtectedLayout>
  );
}
