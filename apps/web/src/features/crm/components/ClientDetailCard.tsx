"use client";

import React from "react";

import { PanelCard } from "@/core/ui/PanelCard";
import { Client } from "@/features/crm/types";

export function ClientDetailCard({ client }: { client: Client }) {
  return (
    <PanelCard accent="from-primary/5 via-card to-card">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cuenta comercial</p>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{client.business_name}</h2>
        <p className="text-sm text-muted-foreground">{client.sector}</p>
      </div>
      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border/80 bg-background/60 px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">País</dt>
          <dd className="mt-1 text-sm font-medium text-foreground">{client.country ?? "—"}</dd>
        </div>
        <div className="rounded-lg border border-border/80 bg-background/60 px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ciudad</dt>
          <dd className="mt-1 text-sm font-medium text-foreground">{client.city ?? "—"}</dd>
        </div>
        <div className="rounded-lg border border-border/80 bg-background/60 px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Web</dt>
          <dd className="mt-1 truncate text-sm font-medium text-foreground">
            {client.website_url ? (
              <a className="text-link hover:underline" href={client.website_url} rel="noreferrer" target="_blank">
                {client.website_url}
              </a>
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>
    </PanelCard>
  );
}
