"use client";

import Link from "next/link";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { ErrorNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import { SocialMetricCard, SocialMockBadge } from "@/features/social/components/SocialPanels";
import { SocialSubNav } from "@/features/social/components/SocialSubNav";
import { useSocialSchedulerOverview } from "@/features/social/hooks";

export default function SocialSchedulerPage() {
  const query = useSocialSchedulerOverview();
  const legacy = query.data?.legacy_posts ?? {};
  const accounts = query.data?.accounts ?? [];

  return (
    <ProtectedLayout module="social">
      <div className="space-y-6">
        <SocialSubNav />

        <p className="text-sm text-muted-foreground">
          Calendario editorial y publicación multired desde un solo panel.
        </p>

        {query.error ? (
          <ErrorNotice>
            <p>No pudimos cargar la programación social.</p>
          </ErrorNotice>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SocialMetricCard
            label="Cuentas conectadas"
            loading={query.isLoading}
            value={String(query.data?.connected_accounts ?? 0)}
          />
          <SocialMetricCard
            label="Programados"
            loading={query.isLoading}
            value={String(legacy.scheduled ?? 0)}
          />
          <SocialMetricCard
            label="Publicados"
            loading={query.isLoading}
            value={String(legacy.published ?? 0)}
          />
          <SocialMetricCard
            label="Total posts"
            loading={query.isLoading}
            value={String(legacy.total ?? 0)}
          />
        </div>

        <PanelCard>
          <h2 className="text-base font-semibold">Cuentas vinculadas</h2>
          {query.isLoading ? (
            <SkeletonListRows rows={3} />
          ) : accounts.length ? (
            <ul className="mt-3 divide-y divide-border">
              {(accounts as Array<{ platform?: string; username?: string }>).map((acc, i) => (
                <li className="flex justify-between py-2 text-sm" key={acc.platform ?? i}>
                  <span className="font-medium capitalize">{acc.platform ?? "red social"}</span>
                  <span className="text-muted-foreground">{acc.username ?? "Conectada"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Conecta Instagram, LinkedIn o TikTok para programar contenido.
            </p>
          )}
        </PanelCard>

        <PanelCard className="border-dashed">
          <p className="text-sm text-muted-foreground">
            El editor completo de calendario sigue disponible en la vista legacy mientras migramos
            componentes. Usa el hub para métricas unificadas.
          </p>
          <Button asChild className="mt-3" variant="outline">
            <Link href="/social">Volver al resumen</Link>
          </Button>
        </PanelCard>
      </div>
    </ProtectedLayout>
  );
}
