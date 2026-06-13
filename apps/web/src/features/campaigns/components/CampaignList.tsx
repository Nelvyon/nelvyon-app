"use client";

import React from "react";
import Link from "next/link";

import { getBrandMode } from "@/core/platform/brand";
import { Button } from "@/core/ui/button";
import { DataTable, DataTableCell, DataTableHeader, DataTableRow } from "@/core/ui/DataTable";
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
            : "Lanza tu primera campaña para alinear creatividad, entrega y seguimiento en un solo lugar."
        }
        title={isClientMode ? "Sin proyectos aún" : "Aún no hay campañas"}
      />
    );
  }

  return (
    <DataTable>
      <DataTableHeader>
        <span>Nombre</span>
        <span>Canal</span>
        <span>Estado</span>
        <span className="text-right">Acciones</span>
      </DataTableHeader>
      {items.map((campaign) => (
        <DataTableRow key={campaign.id}>
          <DataTableCell>
            <Link
              className="font-medium text-foreground transition-colors hover:text-primary"
              href={`/campaigns/${campaign.id}`}
            >
              {campaign.name?.trim() || `${isClientMode ? "Proyecto" : "Campaña"} #${campaign.id}`}
            </Link>
          </DataTableCell>
          <DataTableCell className="capitalize text-muted-foreground">{campaign.platform}</DataTableCell>
          <DataTableCell className="text-muted-foreground">{campaign.status ?? "—"}</DataTableCell>
          <DataTableCell className="flex justify-end">
            <Button asChild size="sm" variant="outline">
              <Link href={`/campaigns/${campaign.id}`}>Ver detalle</Link>
            </Button>
          </DataTableCell>
        </DataTableRow>
      ))}
    </DataTable>
  );
}
