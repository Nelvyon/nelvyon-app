"use client";

import React from "react";
import Link from "next/link";

import { Button } from "@/core/ui/button";
import { EmptyState } from "@/core/ui/EmptyState";
import { Client } from "@/features/crm/types";

export function ClientList({ items, showCreateCta }: { items: Client[]; showCreateCta?: boolean }) {
  if (items.length === 0) {
    return (
      <EmptyState
        action={
          showCreateCta ? (
            <Button asChild>
              <Link href="/crm/clients/new">Add your first client</Link>
            </Button>
          ) : undefined
        }
        description="NELVYON keeps CRM ready—add accounts so your team can track outreach and delivery in one place."
        title="No clients in this workspace yet"
      />
    );
  }

  return (
    <ul aria-label="Clients in this workspace" className="divide-y rounded-lg border border-border bg-card shadow-card">
      {items.map((client) => (
        <li className="p-3" key={client.id}>
          <Link className="font-medium text-link transition-colors hover:text-link-hover hover:underline" href={`/crm/clients/${client.id}`}>
            {client.business_name}
          </Link>
          <p className="text-xs text-muted-foreground">{client.sector}</p>
          <p className="mt-1 text-xs">
            <Link className="text-link underline-offset-2 hover:underline" href={`/crm/deals?client_id=${client.id}`}>
              Deals and pipeline for this client →
            </Link>
          </p>
        </li>
      ))}
    </ul>
  );
}
