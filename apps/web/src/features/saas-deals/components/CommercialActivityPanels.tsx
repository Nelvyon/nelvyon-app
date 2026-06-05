"use client";

import { useMemo } from "react";

import { NelvyonDsBadge, NelvyonDsCard } from "@/design-system/components";

import { takeOpenDeals, takeRecentWonDeals } from "../commercialDashboardUtils";
import { dealStageLabel, formatDealValue } from "../stages";
import type { SaasDeal } from "../types";

function formatUpdatedAt(iso: string): string {
  const dt = new Date(iso);
  return Number.isNaN(dt.getTime()) ? iso : dt.toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
}

function DealSummaryList({
  deals,
  emptyMessage,
}: {
  deals: SaasDeal[];
  emptyMessage: string;
}) {
  if (deals.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-3">
      {deals.map((deal) => (
        <li key={deal.id} className="rounded-md border border-border bg-muted/20 p-3 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-medium text-foreground">{deal.title}</p>
            <NelvyonDsBadge tone="neutral">{dealStageLabel(deal.stage)}</NelvyonDsBadge>
          </div>
          <p className="mt-1 text-muted-foreground">
            {formatDealValue(deal.value, deal.currency)} · {deal.probability}% · {formatUpdatedAt(deal.updatedAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function CommercialActivityPanels({
  deals,
  isLoading,
  error,
}: {
  deals?: SaasDeal[];
  isLoading?: boolean;
  error?: unknown;
}) {
  const openDeals = useMemo(() => takeOpenDeals(deals ?? [], 5), [deals]);
  const wonDeals = useMemo(() => takeRecentWonDeals(deals ?? [], 5), [deals]);

  if (isLoading) {
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        <NelvyonDsCard title="Oportunidades abiertas">
          <p className="text-sm text-muted-foreground">Cargando…</p>
        </NelvyonDsCard>
        <NelvyonDsCard title="Ganados recientemente">
          <p className="text-sm text-muted-foreground">Cargando…</p>
        </NelvyonDsCard>
      </div>
    );
  }

  if (error) {
    return (
      <NelvyonDsCard title="Actividad comercial">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "No se pudo cargar la actividad comercial."}
        </p>
      </NelvyonDsCard>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <NelvyonDsCard title="Oportunidades abiertas">
        <DealSummaryList
          deals={openDeals}
          emptyMessage="No hay oportunidades abiertas. Crea deals en el pipeline para empezar a vender."
        />
      </NelvyonDsCard>
      <NelvyonDsCard title="Ganados recientemente">
        <DealSummaryList
          deals={wonDeals}
          emptyMessage="Aún no hay deals ganados registrados en el pipeline oficial."
        />
      </NelvyonDsCard>
    </div>
  );
}
