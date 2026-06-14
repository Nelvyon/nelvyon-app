"use client";

import React from "react";
import Link from "next/link";

import { Badge, toneFromMeterStatus } from "@/core/ui/Badge";
import { EmptyState } from "@/core/ui/EmptyState";
import { isDealAtRisk } from "@/features/deals/risk";
import { Deal } from "@/features/deals/types";

const STAGE_LABELS: Record<string, string> = {
  lead: "Lead",
  qualified: "Calificado",
  proposal: "Propuesta",
  negotiation: "Negociación",
  won: "Ganado",
  lost: "Perdido",
};

function riskLabel(deal: Deal) {
  return isDealAtRisk(deal) ? "En riesgo" : "Saludable";
}

export function DealsList({
  deals,
  emptyContext = "default",
}: {
  deals: Deal[];
  emptyContext?: "default" | "client-filter" | "filters";
}) {
  if (deals.length === 0) {
    const copy =
      emptyContext === "client-filter"
        ? {
            title: "Sin deals para este cliente",
            description:
              "No hay oportunidades vinculadas o los filtros las excluyen. Limpia filtros o crea un deal desde la ficha del cliente.",
          }
        : emptyContext === "filters"
          ? {
              title: "Ningún deal coincide con los filtros",
              description: "Prueba con etapa y responsable en “Todos” para ver el pipeline completo.",
            }
          : {
              title: "Pipeline vacío",
              description: "Crea tu primera oportunidad desde Nuevo deal o vincúlala a un cliente existente.",
            };
    return <EmptyState title={copy.title} description={copy.description} />;
  }

  return (
    <ul className="divide-y rounded-lg border border-border bg-card shadow-card">
      {deals.map((deal) => (
        <li className="space-y-1 p-3" key={deal.id}>
          <div className="flex items-center justify-between gap-2">
            <Link className="font-medium text-link hover:text-link-hover hover:underline" href={`/crm/deals/${deal.id}`}>
              {deal.title}
            </Link>
            <Badge tone={toneFromMeterStatus(isDealAtRisk(deal) ? "critical" : "normal")}>{riskLabel(deal)}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Etapa: {STAGE_LABELS[(deal.stage ?? "").toLowerCase()] ?? deal.stage ?? "—"} · Responsable:{" "}
            {deal.assigned_to ?? "sin asignar"}
            {deal.client_id != null && deal.client_id > 0 ? (
              <>
                {" "}
                · Cliente:{" "}
                <Link className="text-link hover:underline" href={`/crm/clients/${deal.client_id}`}>
                  #{deal.client_id}
                </Link>
              </>
            ) : null}{" "}
            · Valor: {deal.value != null ? `${deal.value} ${deal.currency ?? "EUR"}`.trim() : "—"}
          </p>
        </li>
      ))}
    </ul>
  );
}
