"use client";

import React from "react";

import { computeTicketSla, type SlaLevel } from "@/lib/helpdeskSla";
import type { Ticket } from "@/features/inbox_helpdesk/types";

const STATUS_LABELS: Record<string, string> = {
  open: "Abierto",
  in_progress: "En curso",
  pending: "Pendiente",
  waiting: "En espera",
  resolved: "Resuelto",
  closed: "Cerrado",
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "Urgente",
  high: "Alta",
  medium: "Media",
  low: "Baja",
  normal: "Media",
};

function slaBadgeClass(level: SlaLevel): string {
  if (level === "breach") return "bg-destructive/15 text-destructive";
  if (level === "warning") return "bg-warning/20 text-warning-foreground";
  return "bg-success/15 text-success-foreground";
}

function slaLabel(level: SlaLevel): string {
  if (level === "breach") return "SLA incumplido";
  if (level === "warning") return "SLA en riesgo";
  return "SLA OK";
}

export function TicketSlaBadges({ ticket }: { ticket: Ticket }) {
  const sla = computeTicketSla(ticket);
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${slaBadgeClass(sla.first_response.status)}`}>
        1ª respuesta: {slaLabel(sla.first_response.status)}
      </span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${slaBadgeClass(sla.resolution.status)}`}>
        Resolución: {slaLabel(sla.resolution.status)}
      </span>
    </div>
  );
}

export function statusLabel(status?: string | null): string {
  return STATUS_LABELS[(status ?? "open").toLowerCase()] ?? String(status ?? "—");
}

export function priorityLabel(priority?: string | null): string {
  return PRIORITY_LABELS[(priority ?? "medium").toLowerCase()] ?? String(priority ?? "—");
}

export { computeTicketSla };
