"use client";

import React from "react";
import Link from "next/link";

import { getBrandMode } from "@/core/platform/brand";
import { Button } from "@/core/ui/button";
import { EmptyState } from "@/core/ui/EmptyState";
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
            : "No hay tickets de soporte en este workspace. Cuando lleguen solicitudes, aparecerán aquí."
        }
        title={isClientMode ? "Sin solicitudes aún" : "Bandeja vacía"}
      />
    );
  }

  return (
    <ul className="divide-y rounded-lg border border-border bg-card shadow-card">
      {items.map((ticket) => (
        <li className="p-3" key={ticket.id}>
          <Link className="font-medium text-link transition-colors hover:text-link-hover hover:underline" href={`/inbox/tickets/${ticket.id}`}>
            {ticket.subject}
          </Link>
          <p className="text-xs text-muted-foreground">
            {ticket.status ?? "open"} · {ticket.priority ?? "normal"}
          </p>
        </li>
      ))}
    </ul>
  );
}
