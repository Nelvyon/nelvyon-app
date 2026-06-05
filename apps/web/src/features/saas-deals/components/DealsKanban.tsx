"use client";

import { useMemo } from "react";

import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard } from "@/design-system/components";

import type { DealStage, SaasDeal, SaasDealsMetrics } from "../types";
import { SAAS_DEAL_STAGES, dealStageLabel, formatDealValue, nextDealStage, prevDealStage } from "../stages";

type ContactLookup = Map<string, { name: string; company: string | null }>;

export function DealsKanban({
  deals,
  metrics,
  contactsById,
  isLoading,
  error,
  changingDealId,
  onMoveStage,
}: {
  deals: SaasDeal[];
  metrics?: SaasDealsMetrics;
  contactsById: ContactLookup;
  isLoading?: boolean;
  error?: unknown;
  changingDealId?: string | null;
  onMoveStage: (deal: SaasDeal, stage: DealStage) => void;
}) {
  const byStage = useMemo(() => {
    const map = new Map<DealStage, SaasDeal[]>();
    for (const s of SAAS_DEAL_STAGES) map.set(s, []);
    for (const d of deals) {
      const list = map.get(d.stage) ?? [];
      list.push(d);
      map.set(d.stage, list);
    }
    return map;
  }, [deals]);

  const stageStats = useMemo(() => {
    const map = new Map<DealStage, { count: number; totalValue: number }>();
    for (const s of SAAS_DEAL_STAGES) map.set(s, { count: 0, totalValue: 0 });
    for (const item of metrics?.byStage ?? []) {
      map.set(item.stage, { count: item.count, totalValue: item.totalValue });
    }
    return map;
  }, [metrics?.byStage]);

  if (isLoading) {
    return (
      <NelvyonDsCard title="Pipeline de deals">
        <p className="text-sm text-muted-foreground">Cargando oportunidades…</p>
      </NelvyonDsCard>
    );
  }

  if (error) {
    return (
      <NelvyonDsCard title="Pipeline de deals">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "No se pudo cargar el pipeline."}
        </p>
      </NelvyonDsCard>
    );
  }

  const currency = metrics?.currency ?? "EUR";

  return (
    <section className="grid gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {SAAS_DEAL_STAGES.map((stage) => {
        const stats = stageStats.get(stage) ?? { count: 0, totalValue: 0 };
        const cards = byStage.get(stage) ?? [];
        return (
          <NelvyonDsCard key={stage} title={dealStageLabel(stage)}>
            <p className="mb-2 text-xs text-muted-foreground">
              {stats.count} · {formatDealValue(stats.totalValue, currency)}
            </p>
            <div className="space-y-2">
              {cards.length === 0 ? <p className="text-xs text-muted-foreground">Sin deals</p> : null}
              {cards.map((deal) => {
                const contact = deal.contactId ? contactsById.get(deal.contactId) : null;
                const prev = prevDealStage(deal.stage);
                const next = nextDealStage(deal.stage);
                const busy = changingDealId === deal.id;
                return (
                  <div key={deal.id} className="rounded-md border border-border bg-card p-2 text-xs">
                    <p className="font-medium text-foreground">{deal.title}</p>
                    <p className="text-muted-foreground">{contact?.name ?? "Sin contacto"}</p>
                    <p className="text-muted-foreground">{contact?.company ?? "-"}</p>
                    <p className="text-muted-foreground">{formatDealValue(deal.value, deal.currency || currency)}</p>
                    <div className="mt-1 flex items-center gap-1">
                      <NelvyonDsBadge tone="neutral">{deal.probability}%</NelvyonDsBadge>
                    </div>
                    <div className="mt-2 flex gap-1">
                      <NelvyonDsButton
                        size="sm"
                        variant="secondary"
                        disabled={!prev || busy}
                        onClick={() => prev && onMoveStage(deal, prev)}
                      >
                        ◀
                      </NelvyonDsButton>
                      <NelvyonDsButton
                        size="sm"
                        variant="secondary"
                        disabled={!next || busy}
                        onClick={() => next && onMoveStage(deal, next)}
                      >
                        ▶
                      </NelvyonDsButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </NelvyonDsCard>
        );
      })}
    </section>
  );
}
