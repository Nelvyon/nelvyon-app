"use client";

import React from "react";
import Link from "next/link";

import { getBrandMode } from "@/core/platform/brand";
import { Button } from "@/core/ui/button";
import { EmptyState } from "@/core/ui/EmptyState";
import {
  priorityLabel,
  statusLabel,
  TicketSlaBadges,
} from "@/features/inbox_helpdesk/components/TicketSlaBadges";
import { Ticket } from "@/features/inbox_helpdesk/types";

export function TicketList({ items, showCreateCta }: { items: Ticket[]; showCreateCta?: boolean }) {
  const isClientMode = getBrandMode() === "client";
  if (items.length === 0) {
    return (
      <EmptyState
        action={
          showCreateCta ? (
            <Button asChild>
              <Link href="/inbox/tickets/new">{isClientMode ? "Crear solicitud" : "Crear ticket"}</Link>
            </Button>
          ) : undefined
        }
        description={
          isClientMode
            ? "No hay solicitudes abiertas para tu cuenta."
            : "No hay tickets que coincidan con los filtros. Crea uno nuevo o ajusta los filtros."
        }
        title={isClientMode ? "Sin solicitudes aún" : "Bandeja vacía"}
      />
    );
  }

  return (
    <ul className="divide-y rounded-xl border border-border bg-card shadow-card">
      {items.map((ticket) => (
        <li className="space-y-2 p-4" key={ticket.id}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <Link
              className="font-medium text-link transition-colors hover:text-link-hover hover:underline"
              href={`/inbox/tickets/${ticket.id}`}
            >
              {ticket.subject}
            </Link>
            <span className="text-xs text-muted-foreground">#{ticket.id}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {statusLabel(ticket.status)} · {priorityLabel(ticket.priority)}
            {ticket.category ? ` · ${ticket.category}` : ""}
            {ticket.assigned_to ? ` · ${ticket.assigned_to}` : ""}
          </p>
          {!isClientMode ? <TicketSlaBadges ticket={ticket} /> : null}
        </li>
      ))}
    </ul>
  );
}
