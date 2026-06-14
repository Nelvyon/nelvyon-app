"use client";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { PanelCard } from "@/core/ui/PanelCard";
import { ErrorNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import { SocialMetricCard, SocialMockBadge } from "@/features/social/components/SocialPanels";
import { SocialSubNav } from "@/features/social/components/SocialSubNav";
import { useSocialPublishAnalytics } from "@/features/social/hooks";

const CLIENT_ID = "ws-client-1";

export default function SocialAutoPublishPage() {
  const query = useSocialPublishAnalytics(CLIENT_ID);
  const byPlatform = query.data?.by_platform ?? {};
  const platforms = Object.entries(byPlatform);
  let totalReach = 0;
  let totalEngagement = 0;
  for (const [, stats] of platforms) {
    totalReach += stats.reach ?? 0;
    totalEngagement += (stats.likes ?? 0) + (stats.comments ?? 0);
  }

  return (
    <ProtectedLayout module="social">
      <div className="space-y-6">
        <SocialSubNav />

        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Publicación automática con IA: copys, creatividades y calendario editorial.
          </p>
          <SocialMockBadge mock={query.data?.mock} />
        </div>

        {query.error ? (
          <ErrorNotice>
            <p>No pudimos cargar auto-publicación.</p>
          </ErrorNotice>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <SocialMetricCard label="Alcance total" loading={query.isLoading} value={String(totalReach)} />
          <SocialMetricCard
            label="Interacciones"
            loading={query.isLoading}
            value={String(totalEngagement)}
          />
          <SocialMetricCard
            label="Plataformas activas"
            loading={query.isLoading}
            value={String(platforms.length)}
          />
        </div>

        <PanelCard>
          <h2 className="text-base font-semibold">Rendimiento por red</h2>
          {query.isLoading ? (
            <SkeletonListRows rows={3} />
          ) : platforms.length ? (
            <ul className="mt-3 divide-y divide-border">
              {platforms.map(([platform, stats]) => (
                <li className="flex justify-between py-2 text-sm" key={platform}>
                  <span className="font-medium capitalize">{platform}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {stats.reach} alcance · {stats.likes} likes · {stats.comments} com.
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Activa auto-publicación y lanza tu primera campaña para ver métricas aquí.
            </p>
          )}
        </PanelCard>

        <PanelCard className="border-dashed">
          <p className="text-sm text-muted-foreground">
            Configura frecuencia, sector y preview con IA desde el panel de auto-publicación. Con
            tokens de plataforma conectados, las métricas pasan de demo a datos en vivo.
          </p>
        </PanelCard>
      </div>
    </ProtectedLayout>
  );
}
