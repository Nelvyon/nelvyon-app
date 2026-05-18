"use client";

import React from "react";
import Link from "next/link";

import { Badge, toneFromMeterStatus } from "@/core/ui/Badge";
import { EmptyState } from "@/core/ui/EmptyState";
import { isDealAtRisk } from "@/features/deals/risk";
import { Deal } from "@/features/deals/types";

function riskLabel(deal: Deal) {
  return isDealAtRisk(deal) ? "at risk" : "healthy";
}

export function DealsList({
  deals,
  emptyContext = "default",
}: {
  deals: Deal[];
  /** Why the list is empty — avoids a “broken” generic empty. */
  emptyContext?: "default" | "client-filter" | "filters";
}) {
  if (deals.length === 0) {
    const copy =
      emptyContext === "client-filter"
        ? {
            title: "No deals for this client in the current view",
            description:
              "Why: either this account has no linked opportunities yet, or stage/owner filters exclude them. Next: clear filters above, open Revenue → Clients to confirm the account, or add a deal tied to this client.",
          }
        : emptyContext === "filters"
          ? {
              title: "No deals match these filters",
              description:
                "Why: stage or owner filters returned zero rows; the workspace may still have other deals. Next: set stage and owner to “All”, then narrow again.",
            }
          : {
              title: "No deals in this workspace yet",
              description:
                "Why: no opportunities were returned for this tenant. Next: create deals from Revenue → Clients or your import flow, then revisit this pipeline view.",
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
            Stage: {deal.stage ?? "—"} · Owner: {deal.assigned_to ?? "unassigned"}
            {deal.client_id != null && deal.client_id > 0 ? (
              <>
                {" "}
                · Client:{" "}
                <Link className="text-link hover:text-link-hover hover:underline" href={`/crm/clients/${deal.client_id}`}>
                  #{deal.client_id}
                </Link>
              </>
            ) : null}{" "}
            · Value: {deal.value != null ? `${deal.value} ${deal.currency ?? ""}`.trim() : "—"}
          </p>
        </li>
      ))}
    </ul>
  );
}
