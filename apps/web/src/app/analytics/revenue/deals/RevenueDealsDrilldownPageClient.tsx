"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { useMemo } from "react";

import { ApiError } from "@/core/api/types";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonDetailCard, SkeletonListRows } from "@/core/ui/Skeleton";
import { isDealAtRisk } from "@/features/deals/risk";
import { useDeal, useDeals } from "@/features/deals/hooks";

function parseDealId(raw: string | null): number | undefined {
  if (!raw || !/^\d+$/.test(raw)) return undefined;
  const id = Number(raw);
  return id > 0 ? id : undefined;
}

export function RevenueDealsDrilldownPageClient() {
  const searchParams = useSearchParams();
  const rawDealId = searchParams?.get("deal_id") ?? null;
  const dealId = parseDealId(rawDealId);
  const invalidDealId = rawDealId != null && dealId == null;

  const dealsQuery = useDeals({});
  const detailQuery = useDeal(dealId ?? 0);

  const selectedTitle = useMemo(() => {
    if (!detailQuery.data) return "Selected deal";
    return detailQuery.data.title || `Deal #${detailQuery.data.id}`;
  }, [detailQuery.data]);

  return (
    <ProtectedLayout module="crm">
      <div className="space-y-5">
        <div className="flex flex-wrap gap-3 text-sm">
          <Link className="text-link underline" href="/analytics/revenue">
            Back to revenue analytics
          </Link>
          {dealId ? (
            <Link className="text-link underline" href={`/crm/deals/${dealId}`}>
              Open CRM deal detail
            </Link>
          ) : null}
        </div>

        <p className="text-sm text-muted-foreground">
          Drilldown reads existing CRM deal fields only (stage, owner, value, at-risk, next step). This view does not
          add forecasting, scoring, or write actions.
        </p>

        {invalidDealId ? (
          <ErrorNotice title="Invalid deal id">
            <p>Cause: query parameter `deal_id` is not a valid numeric identifier.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: select a deal from the list below or open this page with a valid `deal_id`.
            </p>
          </ErrorNotice>
        ) : null}

        {dealsQuery.isLoading ? <SkeletonListRows aria-label="Loading deals for drilldown selector" rows={6} /> : null}
        {dealsQuery.isFetching && dealsQuery.data ? (
          <p className="text-xs text-muted-foreground">Refreshing available deals for drilldown…</p>
        ) : null}

        {dealsQuery.error instanceof ApiError && dealsQuery.error.status === 403 ? (
          <ForbiddenNotice>
            <p>Cause: your role/workspace cannot read CRM deals for analytics drilldown.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: switch workspace or ask an admin for CRM view permissions.
            </p>
          </ForbiddenNotice>
        ) : null}

        {dealsQuery.error && !(dealsQuery.error instanceof ApiError && dealsQuery.error.status === 403) ? (
          <ErrorNotice>
            <p>Cause: deal selector request failed before list could render.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: refresh once; if it persists, verify session/network and retry.
            </p>
          </ErrorNotice>
        ) : null}

        {dealsQuery.data ? (
          <section className="rounded-lg border border-border bg-card p-4 shadow-card">
            <h2 className="text-base font-medium text-foreground">Pick a deal for analytics drilldown</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {dealsQuery.data.items.map((deal) => (
                <li key={deal.id}>
                  <Link className="text-link underline" href={`/analytics/revenue/deals?deal_id=${deal.id}`}>
                    {deal.title}
                  </Link>
                  <span className="text-muted-foreground">
                    {" "}
                    · {deal.stage ?? "—"} · {deal.assigned_to ?? "unassigned"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {dealId && detailQuery.isLoading ? (
          <>
            <p className="text-sm text-muted-foreground">Loading deal drilldown details…</p>
            <SkeletonDetailCard />
          </>
        ) : null}
        {dealId && detailQuery.isFetching && detailQuery.data ? (
          <p className="text-xs text-muted-foreground">Refreshing selected deal details…</p>
        ) : null}

        {dealId && detailQuery.error instanceof ApiError && detailQuery.error.status === 403 ? (
          <ForbiddenNotice>
            <p>Cause: selected deal is outside your CRM visibility scope.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: choose a deal from current workspace list or request CRM access for this tenant.
            </p>
          </ForbiddenNotice>
        ) : null}
        {dealId && detailQuery.error instanceof ApiError && detailQuery.error.status === 404 ? (
          <ErrorNotice title="Deal not found">
            <p>Cause: this deal id is not present in the active workspace scope.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: select another deal from list; avoid stale links from different workspace.
            </p>
          </ErrorNotice>
        ) : null}
        {dealId &&
        detailQuery.error &&
        !(detailQuery.error instanceof ApiError && (detailQuery.error.status === 403 || detailQuery.error.status === 404)) ? (
          <ErrorNotice>
            <p>Cause: deal detail request failed unexpectedly.</p>
            <p className="mt-2 text-sm text-muted-foreground">Next: retry refresh; if it persists, verify API/session health.</p>
          </ErrorNotice>
        ) : null}

        {dealId && !detailQuery.isLoading && !detailQuery.error && !detailQuery.data ? (
          <ErrorNotice title="Deal unavailable">
            <p>Cause: selected deal is not available in current drilldown data scope.</p>
            <p className="mt-2 text-sm text-muted-foreground">Next: pick a different deal from this workspace list.</p>
          </ErrorNotice>
        ) : null}

        {!dealId && !invalidDealId ? (
          <p className="text-sm text-muted-foreground">Select a deal above to open the drilldown summary.</p>
        ) : null}

        {detailQuery.data ? (
          <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
            <h2 className="text-base font-semibold text-foreground">{selectedTitle}</h2>
            <p className="text-sm text-muted-foreground">
              Stage: {detailQuery.data.stage ?? "—"} · Owner: {detailQuery.data.assigned_to ?? "unassigned"} · Value:{" "}
              {detailQuery.data.value != null ? `${detailQuery.data.value} ${detailQuery.data.currency ?? ""}`.trim() : "—"}
            </p>
            <p className="text-sm text-muted-foreground">
              At-risk: {isDealAtRisk(detailQuery.data) ? "yes (aging/overdue rule)" : "no"} · Next step:{" "}
              {detailQuery.data.notes?.trim() || "—"}
            </p>
          </section>
        ) : null}
      </div>
    </ProtectedLayout>
  );
}
