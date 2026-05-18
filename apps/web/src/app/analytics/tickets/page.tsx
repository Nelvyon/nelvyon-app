"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";

import { ApiError } from "@/core/api/types";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import { useTickets } from "@/features/inbox_helpdesk/hooks";
import { Ticket } from "@/features/inbox_helpdesk/types";

function ticketAgeHours(ticket: Ticket) {
  if (!ticket.created_at) return 0;
  const created = new Date(ticket.created_at);
  if (Number.isNaN(created.getTime())) return 0;
  return (Date.now() - created.getTime()) / (1000 * 60 * 60);
}

export default function TicketsAnalyticsPage() {
  const query = useTickets();
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [queueFilter, setQueueFilter] = useState("all");

  const rows = useMemo(() => query.data?.items ?? [], [query.data]);
  const queueValues = useMemo(() => [...new Set(rows.map((t) => t.category).filter(Boolean))] as string[], [rows]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (statusFilter !== "all") {
        const status = (row.status ?? "").toLowerCase();
        if (statusFilter === "open" && status !== "open") return false;
        if (statusFilter === "pending" && !["in_progress", "pending"].includes(status)) return false;
        if (statusFilter === "closed" && !["closed", "resolved"].includes(status)) return false;
      }
      if (priorityFilter !== "all" && (row.priority ?? "").toLowerCase() !== priorityFilter) return false;
      if (queueFilter !== "all" && (row.category ?? "") !== queueFilter) return false;
      return true;
    });
  }, [priorityFilter, queueFilter, rows, statusFilter]);

  const metrics = useMemo(() => {
    const open = rows.filter((r) => (r.status ?? "").toLowerCase() === "open").length;
    const pending = rows.filter((r) => ["in_progress", "pending"].includes((r.status ?? "").toLowerCase())).length;
    const closed = rows.filter((r) => ["closed", "resolved"].includes((r.status ?? "").toLowerCase())).length;
    const atRisk = rows.filter((r) => {
      const status = (r.status ?? "").toLowerCase();
      return ["open", "in_progress", "pending"].includes(status) && ticketAgeHours(r) >= 48;
    }).length;
    const oldestOpenHours = Math.max(
      0,
      ...rows
        .filter((r) => ["open", "in_progress", "pending"].includes((r.status ?? "").toLowerCase()))
        .map((r) => ticketAgeHours(r)),
    );
    return { open, pending, closed, atRisk, oldestOpenHours };
  }, [rows]);

  return (
    <ProtectedLayout module="inbox">
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Tickets analytics v2 is a read-only support snapshot from existing helpdesk rows. SLA/at-risk are heuristic
          signals based on ticket age and status, not routing AI or automated triage.
        </p>

        <div className="flex flex-wrap gap-3 text-sm">
          <Link className="text-link underline" href="/analytics">
            Back to reporting
          </Link>
          <Link className="text-link underline" href="/inbox/tickets">
            Open ticket operations list
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-border bg-card p-3 text-sm shadow-card">
            <p className="text-muted-foreground">Open</p>
            <p className="text-lg font-semibold text-foreground">{metrics.open}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-sm shadow-card">
            <p className="text-muted-foreground">Pending</p>
            <p className="text-lg font-semibold text-foreground">{metrics.pending}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-sm shadow-card">
            <p className="text-muted-foreground">Closed</p>
            <p className="text-lg font-semibold text-foreground">{metrics.closed}</p>
          </div>
          <div className="rounded-lg border border-warning/35 bg-warning/10 p-3 text-sm shadow-card">
            <p className="text-warning-foreground">At-risk (48h+ open/pending)</p>
            <p className="text-lg font-semibold text-warning-foreground">{metrics.atRisk}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-sm shadow-card">
            <p className="text-muted-foreground">Oldest open age</p>
            <p className="text-lg font-semibold text-foreground">{Math.round(metrics.oldestOpenHours)}h</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Filter tickets analytics by status"
            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
            onChange={(e) => setStatusFilter(e.target.value)}
            value={statusFilter}
          >
            <option value="all">All statuses</option>
            <option value="open">open</option>
            <option value="pending">pending</option>
            <option value="closed">closed</option>
          </select>
          <select
            aria-label="Filter tickets analytics by priority"
            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
            onChange={(e) => setPriorityFilter(e.target.value)}
            value={priorityFilter}
          >
            <option value="all">All priorities</option>
            <option value="low">low</option>
            <option value="normal">normal</option>
            <option value="high">high</option>
            <option value="urgent">urgent</option>
          </select>
          <select
            aria-label="Filter tickets analytics by queue"
            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
            onChange={(e) => setQueueFilter(e.target.value)}
            value={queueFilter}
          >
            <option value="all">All queues</option>
            {queueValues.map((queue) => (
              <option key={queue} value={queue}>
                {queue}
              </option>
            ))}
          </select>
        </div>

        {query.isLoading ? <SkeletonListRows aria-label="Loading tickets analytics" rows={7} /> : null}
        {query.isFetching && query.data ? (
          <p className="text-xs text-muted-foreground">Refreshing tickets analytics for current filters…</p>
        ) : null}

        {query.error instanceof ApiError && query.error.status === 403 ? (
          <ForbiddenNotice>
            <p>Cause: ticket analytics is limited to roles/workspaces with inbox visibility.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: switch workspace in header or ask an admin for inbox view access.
            </p>
          </ForbiddenNotice>
        ) : null}
        {query.error && !(query.error instanceof ApiError && query.error.status === 403) ? (
          <ErrorNotice>
            <p>Cause: support analytics request failed before rows could load.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: refresh once; if it persists, verify session/network and reopen from reporting.
            </p>
          </ErrorNotice>
        ) : null}

        {query.data ? (
          <section className="rounded-lg border border-border bg-card p-4 shadow-card">
            <h2 className="text-base font-medium text-foreground">Tickets in current analytics slice</h2>
            {filtered.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No tickets match this filter combination. Next: reset filters to “All” or open Inbox tickets list for
                raw queue operations.
              </p>
            ) : (
              <ul className="mt-3 space-y-1 text-sm">
                {filtered.map((ticket) => (
                  <li key={ticket.id}>
                    <Link className="text-link underline" href={`/inbox/tickets/${ticket.id}`}>
                      #{ticket.id} {ticket.subject}
                    </Link>{" "}
                    <span className="text-muted-foreground">
                      · {(ticket.status ?? "—").toLowerCase()} · {(ticket.priority ?? "—").toLowerCase()} ·{" "}
                      {ticket.category ?? "uncategorized"}
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
