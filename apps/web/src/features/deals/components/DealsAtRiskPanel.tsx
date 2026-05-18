"use client";

import React from "react";
import Link from "next/link";

import { isDealAtRisk } from "@/features/deals/risk";
import { Deal } from "@/features/deals/types";

export function DealsAtRiskPanel({ deals }: { deals: Deal[] }) {
  const atRisk = deals.filter(isDealAtRisk).slice(0, 6);

  return (
    <section className="space-y-2 rounded-lg border border-warning/35 bg-warning/10 p-4 shadow-card">
      <h2 className="text-base font-medium text-warning-foreground">Deals at risk</h2>
      <p className="text-xs text-warning-foreground">
        Rule used in this view: flagged when a deal is over 14 days in stage or has an overdue expected close date.
      </p>
      {deals.length === 0 ? (
        <div className="space-y-1 text-sm text-warning-foreground">
          <p>No deals in this list to score for risk.</p>
          <p>
            Why: the current Revenue → Deals view is empty (no rows for this workspace or filters hide everything). Next:
            clear stage/owner filters, open another client from Revenue → Clients, or create deals if your role allows.
          </p>
        </div>
      ) : atRisk.length === 0 ? (
        <div className="space-y-1 text-sm text-warning-foreground">
          <p>No deals in this slice look at risk right now.</p>
          <p>
            Why: nothing here exceeds 14 days in stage or has an overdue expected close. Next: keep follow-ups current;
            if you expected alerts, widen filters or check deal dates on each row.
          </p>
        </div>
      ) : (
        <ul className="space-y-1 text-sm text-warning-foreground">
          {atRisk.map((deal) => (
            <li key={deal.id}>
              <Link className="underline" href={`/crm/deals/${deal.id}`}>
                {deal.title}
              </Link>{" "}
              · stage {deal.stage ?? "—"} · {deal.days_in_stage ?? 0} day(s) in stage
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
