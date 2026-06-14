"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { getBrandAppName, getBrandMode } from "@/core/platform/brand";
import { isClientTicketCreateEnabled } from "@/core/platform/surfacePolicy";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { canPerformAction } from "@/core/routing/guards";
import { Button } from "@/core/ui/button";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import { HelpdeskSubNav } from "@/features/inbox_helpdesk/components/HelpdeskSubNav";
import { TicketList } from "@/features/inbox_helpdesk/components/TicketList";
import { useHelpdeskStats, useTickets } from "@/features/inbox_helpdesk/hooks";

export default function TicketsListPage() {
  const { user } = useAuth();
  const mode = getBrandMode();
  const isClientMode = mode === "client";
  const appName = getBrandAppName(mode);
  const query = useTickets();
  const statsQuery = useHelpdeskStats();

  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const canCreateByRole = user ? canPerformAction(user.role, "inbox", "create") : false;
  const canCreate = isClientMode ? isClientTicketCreateEnabled() : canCreateByRole;

  const filteredItems = useMemo(() => {
    const items = query.data?.items ?? [];
    return items.filter((t) => {
      const status = (t.status ?? "open").toLowerCase();
      if (statusFilter === "open" && status !== "open") return false;
      if (statusFilter === "active" && !["in_progress", "pending", "waiting"].includes(status)) return false;
      if (statusFilter === "closed" && !["closed", "resolved"].includes(status)) return false;
      if (priorityFilter !== "all" && (t.priority ?? "medium").toLowerCase() !== priorityFilter) return false;
      return true;
    });
  }, [query.data, statusFilter, priorityFilter]);

  const stats = statsQuery.data;

  return (
    <ProtectedLayout module="inbox">
      <div className="space-y-5">
        {!isClientMode ? <HelpdeskSubNav /> : null}

        {!isClientMode && stats ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Metric label="Abiertos" value={String(stats.open_count)} />
            <Metric label="En curso" value={String(stats.pending_count)} />
            <Metric label="Cerrados" value={String(stats.closed_count)} />
            <Metric label="SLA cumplido" value={`${stats.sla_compliance_rate}%`} accent="success" />
            <Metric label="En riesgo SLA" value={String(stats.at_risk_count)} accent={stats.at_risk_count > 0 ? "warning" : undefined} />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {!isClientMode ? (
              <>
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
              </>
            ) : null}
          </div>
          {canCreate ? (
            <Button asChild>
              <Link href="/inbox/tickets/new">{isClientMode ? "Nueva solicitud" : "Crear ticket"}</Link>
            </Button>
          ) : null}
        </div>

        {query.isLoading ? <SkeletonListRows aria-label="Cargando tickets" rows={7} /> : null}
        {query.error instanceof ApiError && query.error.status === 403 ? (
          <ForbiddenNotice>
            <p>
              {isClientMode
                ? "Las solicitudes no están disponibles para tu cuenta."
                : `${appName} no puede abrir tickets en este workspace con tu rol actual.`}
            </p>
          </ForbiddenNotice>
        ) : null}
        {query.error && !(query.error instanceof ApiError && query.error.status === 403) ? (
          <ErrorNotice>
            <p>No pudimos cargar los tickets. Comprueba tu conexión e inténtalo de nuevo.</p>
          </ErrorNotice>
        ) : null}
        {query.data ? (
          <TicketList items={filteredItems} showCreateCta={canCreate} />
        ) : null}
      </div>
    </ProtectedLayout>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "success" | "warning";
}) {
  const accentClass =
    accent === "warning"
      ? "border-warning/35 bg-warning/10"
      : accent === "success"
        ? "border-success/30 bg-success/10"
        : "border-border bg-card";
  return (
    <div className={`rounded-xl border p-3 shadow-card ${accentClass}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
