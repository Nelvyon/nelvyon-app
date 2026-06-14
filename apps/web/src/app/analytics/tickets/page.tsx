"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";

import { ApiError } from "@/core/api/types";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import { HelpdeskSubNav } from "@/features/inbox_helpdesk/components/HelpdeskSubNav";
import {
  priorityLabel,
  statusLabel,
  TicketSlaBadges,
} from "@/features/inbox_helpdesk/components/TicketSlaBadges";
import { useHelpdeskStats, useTickets } from "@/features/inbox_helpdesk/hooks";
import { SLA_TARGETS } from "@/lib/helpdeskSla";

export default function TicketsAnalyticsPage() {
  const query = useTickets();
  const statsQuery = useHelpdeskStats();
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const rows = useMemo(() => query.data?.items ?? [], [query.data]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const status = (row.status ?? "open").toLowerCase();
      if (statusFilter === "open" && status !== "open") return false;
      if (statusFilter === "active" && !["in_progress", "pending", "waiting"].includes(status)) return false;
      if (statusFilter === "closed" && !["closed", "resolved"].includes(status)) return false;
      if (priorityFilter !== "all" && (row.priority ?? "medium").toLowerCase() !== priorityFilter) return false;
      return true;
    });
  }, [priorityFilter, rows, statusFilter]);

  const stats = statsQuery.data;

  return (
    <ProtectedLayout module="inbox">
      <div className="space-y-5">
        <HelpdeskSubNav />

        <p className="text-sm text-muted-foreground">
          Analytics de soporte con SLA real por prioridad (urgente 15 min / alta 1 h / media 4 h / baja 8 h para
          primera respuesta). Datos del workspace activo.
        </p>

        {stats ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Tickets totales" value={String(stats.total_count)} />
              <Metric label="Cumplimiento SLA" value={`${stats.sla_compliance_rate}%`} highlight />
              <Metric
                label="Media 1ª respuesta"
                value={
                  stats.avg_first_response_minutes != null
                    ? `${stats.avg_first_response_minutes} min`
                    : "—"
                }
              />
              <Metric label="Ticket abierto más antiguo" value={`${stats.oldest_open_hours} h`} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-xl border border-border bg-card p-4 shadow-card">
                <h2 className="text-base font-semibold">Incumplimientos SLA</h2>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <p className="text-muted-foreground">1ª respuesta</p>
                    <p className="text-xl font-semibold text-destructive">{stats.sla_first_response_breaches}</p>
                  </div>
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <p className="text-muted-foreground">Resolución</p>
                    <p className="text-xl font-semibold text-destructive">{stats.sla_resolution_breaches}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-border bg-card p-4 shadow-card">
                <h2 className="text-base font-semibold">Objetivos SLA por prioridad</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {(Object.entries(SLA_TARGETS) as [string, { first_response: number; resolution: number }][]).map(
                    ([pri, t]) => (
                      <li className="flex justify-between gap-2" key={pri}>
                        <span className="font-medium">{priorityLabel(pri)}</span>
                        <span className="text-muted-foreground">
                          1ª resp. {t.first_response} min · resol. {Math.round(t.resolution / 60)} h
                        </span>
                      </li>
                    ),
                  )}
                </ul>
              </section>
            </div>

            {stats.by_status.length > 0 ? (
              <section className="rounded-xl border border-border bg-card p-4 shadow-card">
                <h2 className="text-base font-semibold">Distribución por estado</h2>
                <ul className="mt-4 space-y-3">
                  {stats.by_status.map((row) => {
                    const pct = stats.total_count > 0 ? (row.count / stats.total_count) * 100 : 0;
                    return (
                      <li key={row.status}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span>{statusLabel(row.status)}</span>
                          <span className="text-muted-foreground">
                            {row.count} ({pct.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
          </>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Filtrar por estado"
            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
            onChange={(e) => setStatusFilter(e.target.value)}
            value={statusFilter}
          >
            <option value="all">Todos los estados</option>
            <option value="open">Abiertos</option>
            <option value="active">En curso</option>
            <option value="closed">Cerrados</option>
          </select>
          <select
            aria-label="Filtrar por prioridad"
            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
            onChange={(e) => setPriorityFilter(e.target.value)}
            value={priorityFilter}
          >
            <option value="all">Todas las prioridades</option>
            <option value="urgent">Urgente</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
          <Link className="text-sm text-link hover:underline" href="/inbox/tickets">
            Ir a bandeja operativa →
          </Link>
        </div>

        {query.isLoading ? <SkeletonListRows rows={5} /> : null}
        {query.error instanceof ApiError && query.error.status === 403 ? (
          <ForbiddenNotice>
            <p>No tienes acceso a analytics de helpdesk en este workspace.</p>
          </ForbiddenNotice>
        ) : null}
        {query.error && !(query.error instanceof ApiError && query.error.status === 403) ? (
          <ErrorNotice>
            <p>No pudimos cargar los datos de tickets.</p>
          </ErrorNotice>
        ) : null}

        {query.data ? (
          <section className="rounded-xl border border-border bg-card p-4 shadow-card">
            <h2 className="text-base font-semibold">Tickets en esta vista ({filtered.length})</h2>
            {filtered.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Ningún ticket coincide con los filtros.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {filtered.map((ticket) => (
                  <li className="rounded-lg border border-border/80 p-3" key={ticket.id}>
                    <Link className="font-medium text-link hover:underline" href={`/inbox/tickets/${ticket.id}`}>
                      #{ticket.id} {ticket.subject}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {statusLabel(ticket.status)} · {priorityLabel(ticket.priority)}
                    </p>
                    <div className="mt-2">
                      <TicketSlaBadges ticket={ticket} />
                    </div>
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

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 shadow-card ${highlight ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
