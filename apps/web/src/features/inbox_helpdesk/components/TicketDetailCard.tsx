"use client";

import React from "react";

import { getBrandMode } from "@/core/platform/brand";
import { Ticket } from "@/features/inbox_helpdesk/types";

export function TicketDetailCard({ ticket }: { ticket: Ticket }) {
  const isClientMode = getBrandMode() === "client";
  return (
    <section className="rounded border p-4">
      <h2 className="text-lg font-semibold">{ticket.subject}</h2>
      <p className="mt-1 text-sm text-foreground/95">{ticket.description ?? "-"}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Status: {ticket.status ?? "open"} · Priority: {ticket.priority ?? "normal"}
      </p>
      {isClientMode ? (
        <p className="mt-1 text-xs text-muted-foreground">Account-scoped view: only requests shared with your portal access appear here.</p>
      ) : null}
    </section>
  );
}
