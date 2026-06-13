"use client";

import React from "react";
import Link from "next/link";

import { getBrandMode } from "@/core/platform/brand";
import { Button } from "@/core/ui/button";
import { EmptyState } from "@/core/ui/EmptyState";
import { Campaign } from "@/features/campaigns/types";

export function CampaignList({ items, showCreateCta }: { items: Campaign[]; showCreateCta?: boolean }) {
  const isClientMode = getBrandMode() === "client";
  if (items.length === 0) {
    return (
      <EmptyState
        action={
          showCreateCta ? (
            <Button asChild>
              <Link href="/campaigns/new">Crear campaña</Link>
            </Button>
          ) : undefined
        }
        description={
          isClientMode
            ? "Aún no hay proyectos publicados en tu portal."
            : showCreateCta
              ? "Lanza tu primera campaña para alinear creatividad, entrega y estado en un solo lugar."
              : "Aún no hay campañas visibles. Tu rol puede ver la lista pero no crearlas: pide a un admin que cree la primera."
        }
        title={isClientMode ? "Sin proyectos aún" : "Aún no hay campañas"}
      />
    );
  }

  return (
    <ul className="divide-y rounded-lg border border-border bg-card shadow-card">
      {items.map((campaign) => (
        <li className="p-3" key={campaign.id}>
          <Link className="font-medium text-link transition-colors hover:text-link-hover hover:underline" href={`/campaigns/${campaign.id}`}>
            {campaign.name?.trim() || `${isClientMode ? "Project" : "Campaign"} #${campaign.id}`}
          </Link>
          <p className="text-xs text-muted-foreground">
            {campaign.platform} · {campaign.campaign_type}
            {campaign.status ? ` · ${campaign.status}` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}
