"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";

import { ApiError } from "@/core/api/types";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import { DealsAtRiskPanel } from "@/features/deals/components/DealsAtRiskPanel";
import { DealsList } from "@/features/deals/components/DealsList";
import { PipelineConversionPanel } from "@/features/deals/components/PipelineConversionPanel";
import { useDeals, usePipelineSummary } from "@/features/deals/hooks";

export default function RevenueAnalyticsPage() {
  const [stageFilter, setStageFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");

  const dealsQuery = useDeals({ stage: stageFilter, owner: ownerFilter });
  const analyticsQuery = usePipelineSummary();

  const owners = useMemo(() => {
    const rows = dealsQuery.data?.items ?? [];
    return [...new Set(rows.map((row) => row.assigned_to).filter(Boolean))] as string[];
  }, [dealsQuery.data]);

  const listEmptyContext = useMemo(() => {
    if (stageFilter !== "all" || ownerFilter !== "all") return "filters" as const;
    return "default" as const;
  }, [stageFilter, ownerFilter]);

  const dealsHref = useMemo(() => {
    const params = new URLSearchParams();
    if (stageFilter !== "all") params.set("stage", stageFilter);
    if (ownerFilter !== "all") params.set("owner", ownerFilter);
    const query = params.toString();
    return query ? `/crm/deals?${query}` : "/crm/deals";
  }, [ownerFilter, stageFilter]);

  return (
    <ProtectedLayout module="crm">
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Revenue analytics v2 shows current pipeline signals from existing CRM endpoints. This view does not forecast
          future revenue; it summarizes stored deal states and risk flags.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter analytics by stage"
              className="rounded-md border border-input bg-background px-2 py-1 text-sm"
              onChange={(e) => setStageFilter(e.target.value)}
              value={stageFilter}
            >
              <option value="all">All stages</option>
              <option value="lead">lead</option>
              <option value="qualified">qualified</option>
              <option value="proposal">proposal</option>
              <option value="negotiation">negotiation</option>
              <option value="won">won</option>
              <option value="lost">lost</option>
            </select>
            <select
              aria-label="Filter analytics by owner"
              className="rounded-md border border-input bg-background px-2 py-1 text-sm"
              onChange={(e) => setOwnerFilter(e.target.value)}
              value={ownerFilter}
            >
              <option value="all">All owners</option>
              {owners.map((owner) => (
                <option key={owner} value={owner}>
                  {owner}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link className="text-link underline" href="/analytics/revenue/deals">
              Open deal drilldown
            </Link>
            <Link className="text-link underline" href={dealsHref}>
              Open deals with current filters
            </Link>
            <Link className="text-link underline" href="/crm/deals">
              Open full deals list
            </Link>
          </div>
        </div>

        {dealsQuery.isLoading ? <SkeletonListRows aria-label="Loading analytics deals list" rows={6} /> : null}
        {dealsQuery.isFetching && dealsQuery.data ? (
          <p className="text-xs text-muted-foreground">Refreshing analytics for current filters…</p>
        ) : null}

        {dealsQuery.error instanceof ApiError && dealsQuery.error.status === 403 ? (
          <ForbiddenNotice>
            <p>Cause: your role or workspace selection does not allow CRM analytics/deals visibility.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: switch workspace in header or ask an admin for CRM view permissions.
            </p>
          </ForbiddenNotice>
        ) : null}

        {dealsQuery.error && !(dealsQuery.error instanceof ApiError && dealsQuery.error.status === 403) ? (
          <ErrorNotice>
            <p>Cause: analytics deals request failed before this view could render list signals.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: refresh once; if it persists, confirm session/network and retry from this page.
            </p>
          </ErrorNotice>
        ) : null}

        <PipelineConversionPanel
          error={analyticsQuery.error ?? undefined}
          isLoading={analyticsQuery.isLoading}
          summary={analyticsQuery.data}
        />

        {dealsQuery.data ? <DealsAtRiskPanel deals={dealsQuery.data.items} /> : null}
        {dealsQuery.data ? <DealsList deals={dealsQuery.data.items} emptyContext={listEmptyContext} /> : null}
      </div>
    </ProtectedLayout>
  );
}
