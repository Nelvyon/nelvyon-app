"use client";

import React from "react";
import Link from "next/link";

import { Button } from "@/core/ui/button";
import { DataTable, DataTableCell, DataTableHeader, DataTableRow } from "@/core/ui/DataTable";
import { EmptyState } from "@/core/ui/EmptyState";
import { Client } from "@/features/crm/types";

export function ClientList({ items, showCreateCta }: { items: Client[]; showCreateCta?: boolean }) {
  if (items.length === 0) {
    return (
      <EmptyState
        action={
          showCreateCta ? (
            <Button asChild>
              <Link href="/crm/clients/new">Añadir primer cliente</Link>
            </Button>
          ) : undefined
        }
        description="Añade tu primera cuenta para conectar deals, campañas y seguimiento comercial en un solo lugar."
        title="Aún no hay clientes en este workspace"
      />
    );
  }

  return (
    <DataTable>
      <DataTableHeader>
        <span>Cuenta</span>
        <span>Sector</span>
        <span>Ubicación</span>
        <span className="text-right">Acciones</span>
      </DataTableHeader>
      {items.map((client) => (
        <DataTableRow key={client.id}>
          <DataTableCell>
            <Link
              className="font-medium text-foreground transition-colors hover:text-primary"
              href={`/crm/clients/${client.id}`}
            >
              {client.business_name}
            </Link>
            <p className="mt-0.5 text-xs text-muted-foreground">ID {client.id}</p>
          </DataTableCell>
          <DataTableCell className="text-muted-foreground">{client.sector}</DataTableCell>
          <DataTableCell className="text-muted-foreground">
            {[client.city, client.country].filter(Boolean).join(", ") || "—"}
          </DataTableCell>
          <DataTableCell className="flex justify-end gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/crm/clients/${client.id}`}>Ver ficha</Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href={`/crm/deals?client_id=${client.id}`}>Deals</Link>
            </Button>
          </DataTableCell>
        </DataTableRow>
      ))}
    </DataTable>
  );
}
