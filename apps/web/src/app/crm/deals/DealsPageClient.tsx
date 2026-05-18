"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { canPerformAction } from "@/core/routing/guards";
import { Button } from "@/core/ui/button";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import { useClient } from "@/features/crm/hooks";
import { DealsAtRiskPanel } from "@/features/deals/components/DealsAtRiskPanel";
import { DealsList } from "@/features/deals/components/DealsList";
import { PipelineConversionPanel } from "@/features/deals/components/PipelineConversionPanel";
import { useDeals, usePipelineSummary } from "@/features/deals/hooks";

function parseClientId(raw: string | null): number | undefined {
  if (!raw || !/^\d+$/.test(raw)) return undefined;
  const n = Number(raw);
  return n > 0 ? n : undefined;
}

export function DealsPageClient() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const clientId = parseClientId(searchParams?.get("client_id") ?? null);
  const canEdit = user ? canPerformAction(user.role, "crm", "edit") : false;
  const [stageFilter, setStageFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");

  const dealsQuery = useDeals({ stage: stageFilter, owner: ownerFilter, clientId });
  const analyticsQuery = usePipelineSummary();
  const clientQuery = useClient(clientId ?? 0);

  const owners = useMemo(() => {
    const all = dealsQuery.data?.items ?? [];
    return [...new Set(all.map((row) => row.assigned_to).filter(Boolean))] as string[];
  }, [dealsQuery.data]);

  const listEmptyContext = useMemo(() => {
    if (clientId != null) return "client-filter" as const;
    if (stageFilter !== "all" || ownerFilter !== "all") return "filters" as const;
    return "default" as const;
  }, [clientId, stageFilter, ownerFilter]);

  return (
    <ProtectedLayout module="crm">
      <div className="space-y-5">
        {clientId != null ? (
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm shadow-card">
            <p className="font-medium text-foreground">Revenue · deals for one client</p>
            <p className="mt-1 text-muted-foreground">
              Filtered to client{" "}
              {clientQuery.data?.business_name ? (
                <strong>{clientQuery.data.business_name}</strong>
              ) : clientQuery.isLoading ? (
                <span>loading…</span>
              ) : (
                <strong>#{clientId}</strong>
              )}
              .{" "}
              <Link className="text-link underline-offset-2 hover:underline" href={`/crm/clients/${clientId}`}>
                Open client record
              </Link>
              {" · "}
              <Link className="text-link underline-offset-2 hover:underline" href="/crm/deals">
                Clear filter (all deals)
              </Link>
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter deals by stage"
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
              aria-label="Filter deals by owner"
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
          <Button asChild variant="outline">
            <Link href="/crm/clients">Revenue · clients</Link>
          </Button>
        </div>

        {!canEdit && (
          <p className="text-sm text-warning-foreground">
            Your role can review Revenue deals, risk, and conversion signals. Stage and owner updates require operator access.
          </p>
        )}

        {dealsQuery.isLoading && <SkeletonListRows aria-label="Loading deals" rows={7} />}
        {dealsQuery.isFetching && dealsQuery.data ? (
          <p className="text-xs text-muted-foreground">Refreshing deals for current filters…</p>
        ) : null}
        {dealsQuery.error instanceof ApiError && dealsQuery.error.status === 403 && (
          <ForbiddenNotice>
            <p>Cause: NELVYON cannot load deals for the workspace in your header with this role.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: switch to a workspace where you have CRM view, or ask an admin to grant CRM access. Revenue → Clients uses the same gate.
            </p>
          </ForbiddenNotice>
        )}
        {dealsQuery.error && !(dealsQuery.error instanceof ApiError && dealsQuery.error.status === 403) && (
          <ErrorNotice>
            <p>Cause: the deals list request failed (network, 5xx, or invalid session).</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: refresh, re-check the workspace selector, then sign in again if the error repeats.
            </p>
          </ErrorNotice>
        )}

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
