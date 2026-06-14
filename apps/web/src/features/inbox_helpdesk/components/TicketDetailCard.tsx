"use client";

import React from "react";

import { getBrandMode } from "@/core/platform/brand";
import { PanelCard } from "@/core/ui/PanelCard";
import {
  computeTicketSla,
  priorityLabel,
  statusLabel,
  TicketSlaBadges,
} from "@/features/inbox_helpdesk/components/TicketSlaBadges";
import { SLA_TARGETS } from "@/lib/helpdeskSla";
import { Ticket } from "@/features/inbox_helpdesk/types";

export function TicketDetailCard({ ticket }: { ticket: Ticket }) {
  const isClientMode = getBrandMode() === "client";
  const sla = computeTicketSla(ticket);
  const targets = SLA_TARGETS[sla.priority];

  return (
    <PanelCard>
      <h2 className="text-lg font-semibold text-foreground">{ticket.subject}</h2>
      <p className="mt-2 text-sm text-foreground/90 whitespace-pre-wrap">{ticket.description ?? "—"}</p>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Estado</dt>
          <dd className="font-medium">{statusLabel(ticket.status)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Prioridad</dt>
          <dd className="font-medium">{priorityLabel(ticket.priority)}</dd>
        </div>
        {ticket.client_name ? (
          <div>
            <dt className="text-muted-foreground">Cliente</dt>
            <dd>{ticket.client_name}</dd>
          </div>
        ) : null}
        {ticket.channel ? (
          <div>
            <dt className="text-muted-foreground">Canal</dt>
            <dd>{ticket.channel}</dd>
          </div>
        ) : null}
      </dl>

      {!isClientMode ? (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <p className="text-sm font-medium text-foreground">SLA (objetivos por prioridad)</p>
          <TicketSlaBadges ticket={ticket} />
          <ul className="text-xs text-muted-foreground">
            <li>1ª respuesta: objetivo {targets.first_response} min · transcurrido {sla.first_response.elapsed_minutes} min</li>
            <li>Resolución: objetivo {targets.resolution} min · transcurrido {sla.resolution.elapsed_minutes} min</li>
            {ticket.first_response_minutes != null ? (
              <li>Tiempo real 1ª respuesta: {ticket.first_response_minutes} min</li>
            ) : null}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          Vista de cuenta: solo aparecen solicitudes compartidas con tu acceso al portal.
        </p>
      )}
    </PanelCard>
  );
}
