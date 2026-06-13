"use client";

import React from "react";

import { getBrandMode } from "@/core/platform/brand";
import { PanelCard } from "@/core/ui/PanelCard";
import { Campaign } from "@/features/campaigns/types";

export function CampaignDetailCard({ campaign }: { campaign: Campaign }) {
  const isClientMode = getBrandMode() === "client";

  return (
    <PanelCard accent="from-primary/5 via-card to-card">
      <p className="text-2xl font-semibold tracking-tight text-foreground">
        {campaign.name?.trim() || `${isClientMode ? "Proyecto" : "Campaña"} #${campaign.id}`}
      </p>
      <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border/80 bg-background/60 px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Estado</dt>
          <dd className="mt-1 text-sm font-medium capitalize text-foreground">{campaign.status ?? "—"}</dd>
        </div>
        <div className="rounded-lg border border-border/80 bg-background/60 px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Canal</dt>
          <dd className="mt-1 text-sm font-medium capitalize text-foreground">{campaign.platform}</dd>
        </div>
        <div className="rounded-lg border border-border/80 bg-background/60 px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Objetivo</dt>
          <dd className="mt-1 text-sm font-medium capitalize text-foreground">{campaign.campaign_type}</dd>
        </div>
        <div className="rounded-lg border border-border/80 bg-background/60 px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cliente</dt>
          <dd className="mt-1 text-sm font-medium text-foreground">{campaign.client_id ?? "—"}</dd>
        </div>
      </dl>
      {campaign.target_audience ? (
        <div className="mt-4 rounded-lg border border-border/80 bg-background/60 px-4 py-3 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Audiencia</p>
          <p className="mt-1 text-foreground">{campaign.target_audience}</p>
        </div>
      ) : null}
      {campaign.content ? (
        <div className="mt-4 rounded-lg border border-border/80 bg-background/60 px-4 py-3 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contenido</p>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-foreground">
            {campaign.content}
          </pre>
        </div>
      ) : null}
    </PanelCard>
  );
}
