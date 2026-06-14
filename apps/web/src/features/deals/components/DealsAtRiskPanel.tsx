"use client";

import React from "react";
import Link from "next/link";

import { isDealAtRisk } from "@/features/deals/risk";
import { Deal } from "@/features/deals/types";

export function DealsAtRiskPanel({ deals }: { deals: Deal[] }) {
  const atRisk = deals.filter(isDealAtRisk).slice(0, 6);

  return (
    <section className="space-y-2 rounded-xl border border-warning/35 bg-warning/10 p-4 shadow-card">
      <h2 className="text-base font-semibold text-warning-foreground">Deals en riesgo</h2>
      <p className="text-xs text-warning-foreground">
        Se marcan cuando llevan más de 14 días en la misma etapa o la fecha de cierre prevista ya pasó.
      </p>
      {deals.length === 0 ? (
        <p className="text-sm text-warning-foreground">
          No hay deals en esta vista. Crea oportunidades o limpia los filtros.
        </p>
      ) : atRisk.length === 0 ? (
        <p className="text-sm text-warning-foreground">
          Ningún deal en riesgo en este momento. Buen trabajo manteniendo el pipeline al día.
        </p>
      ) : (
        <ul className="space-y-1 text-sm text-warning-foreground">
          {atRisk.map((deal) => (
            <li key={deal.id}>
              <Link className="font-medium underline" href={`/crm/deals/${deal.id}`}>
                {deal.title}
              </Link>{" "}
              · {deal.stage ?? "—"} · {deal.days_in_stage ?? 0} días en etapa
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
