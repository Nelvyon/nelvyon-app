"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";

import { ApiError } from "@/core/api/types";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import { useCampaigns } from "@/features/campaigns/hooks";
import { Campaign } from "@/features/campaigns/types";

function isCampaignAtRisk(campaign: Campaign) {
  const status = (campaign.status ?? "").toLowerCase();
  const lowQa = campaign.qa_score != null && campaign.qa_score < 60;
  return ["draft", "paused"].includes(status) || lowQa;
}

export default function CampaignsAnalyticsPage() {
  const query = useCampaigns();
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");

  const rows = useMemo(() => query.data?.items ?? [], [query.data]);

  const owners = useMemo(() => [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[], [rows]);
  const platforms = useMemo(() => [...new Set(rows.map((r) => r.platform).filter(Boolean))] as string[], [rows]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (statusFilter !== "all" && (row.status ?? "").toLowerCase() !== statusFilter) return false;
      if (ownerFilter !== "all" && row.user_id !== ownerFilter) return false;
      if (platformFilter !== "all" && row.platform !== platformFilter) return false;
      return true;
    });
  }, [ownerFilter, platformFilter, rows, statusFilter]);

  const metrics = useMemo(() => {
    const total = rows.length;
    const byStatus = {
      draft: rows.filter((r) => (r.status ?? "").toLowerCase() === "draft").length,
      active: rows.filter((r) => (r.status ?? "").toLowerCase() === "active").length,
      paused: rows.filter((r) => (r.status ?? "").toLowerCase() === "paused").length,
      completed: rows.filter((r) => (r.status ?? "").toLowerCase() === "completed").length,
    };
    const atRisk = rows.filter(isCampaignAtRisk).length;
    return { total, byStatus, atRisk };
  }, [rows]);

  return (
    <ProtectedLayout module="campaigns">
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Campaigns analytics v2 is a read-only snapshot from existing campaign rows. It summarizes stored status, QA
          score, platform, and ownership only; there is no attribution model, optimization AI, or spend forecasting in
          this view.
        </p>

        <div className="flex flex-wrap gap-3 text-sm">
          <Link className="text-link underline" href="/analytics">
            Back to reporting
          </Link>
          <Link className="text-link underline" href="/campaigns">
            Open campaign operations list
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-lg border border-border bg-card p-3 text-sm shadow-card">
            <p className="text-muted-foreground">Total</p>
            <p className="text-lg font-semibold text-foreground">{metrics.total}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-sm shadow-card">
            <p className="text-muted-foreground">Draft</p>
            <p className="text-lg font-semibold text-foreground">{metrics.byStatus.draft}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-sm shadow-card">
            <p className="text-muted-foreground">Active</p>
            <p className="text-lg font-semibold text-foreground">{metrics.byStatus.active}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-sm shadow-card">
            <p className="text-muted-foreground">Paused</p>
            <p className="text-lg font-semibold text-foreground">{metrics.byStatus.paused}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-sm shadow-card">
            <p className="text-muted-foreground">Completed</p>
            <p className="text-lg font-semibold text-foreground">{metrics.byStatus.completed}</p>
          </div>
          <div className="rounded-lg border border-warning/35 bg-warning/10 p-3 text-sm shadow-card">
            <p className="text-warning-foreground">At-risk (draft/paused or QA&lt;60)</p>
            <p className="text-lg font-semibold text-warning-foreground">{metrics.atRisk}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Filter campaigns analytics by status"
            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
            onChange={(e) => setStatusFilter(e.target.value)}
            value={statusFilter}
          >
            <option value="all">All statuses</option>
            <option value="draft">draft</option>
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="completed">completed</option>
          </select>
          <select
            aria-label="Filter campaigns analytics by owner"
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
          <select
            aria-label="Filter campaigns analytics by platform"
            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
            onChange={(e) => setPlatformFilter(e.target.value)}
            value={platformFilter}
          >
            <option value="all">All platforms</option>
            {platforms.map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>
        </div>

        {query.isLoading ? <SkeletonListRows aria-label="Loading campaigns analytics" rows={7} /> : null}
        {query.isFetching && query.data ? (
          <p className="text-xs text-muted-foreground">Refreshing campaigns analytics for current filters…</p>
        ) : null}

        {query.error instanceof ApiError && query.error.status === 403 ? (
          <ForbiddenNotice>
            <p>Cause: campaigns analytics is limited to roles/workspaces with campaigns visibility.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: switch workspace in header or ask an admin for campaigns view access.
            </p>
          </ForbiddenNotice>
        ) : null}
        {query.error && !(query.error instanceof ApiError && query.error.status === 403) ? (
          <ErrorNotice>
            <p>Cause: campaigns analytics request failed before rows could load.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: refresh once; if it persists, verify session/network and reopen from reporting.
            </p>
          </ErrorNotice>
        ) : null}

        {query.data ? (
          <section className="rounded-lg border border-border bg-card p-4 shadow-card">
            <h2 className="text-base font-medium text-foreground">Campaigns in current analytics slice</h2>
            {filtered.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No campaigns match these filters. Next: set filters to “All” or open Campaigns list to inspect raw rows.
              </p>
            ) : (
              <ul className="mt-3 space-y-1 text-sm">
                {filtered.map((campaign) => (
                  <li key={campaign.id}>
                    <Link className="text-link underline" href={`/campaigns/${campaign.id}`}>
                      #{campaign.id} {campaign.name?.trim() || "Untitled campaign"}
                    </Link>{" "}
                    <span className="text-muted-foreground">
                      · {(campaign.status ?? "—").toLowerCase()} · {campaign.platform} · owner {campaign.user_id}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>
    </ProtectedLayout>
  );
}
