"use client";

import { useState } from "react";

import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard } from "@/design-system/components";

import { useDeleteSaasDeal } from "../hooks";
import { dealStageLabel, formatDealValue } from "../stages";
import type { SaasDeal } from "../types";

type ContactLookup = Map<string, { name: string; company: string | null }>;

function formatDateTime(iso: string): string {
  const dt = new Date(iso);
  return Number.isNaN(dt.getTime()) ? iso : dt.toLocaleString("es-ES");
}

export function DealDetailPanel({
  deal,
  contactsById,
  onEdit,
  onDeleted,
  onClose,
}: {
  deal: SaasDeal | null;
  contactsById: ContactLookup;
  onEdit: (deal: SaasDeal) => void;
  onDeleted: () => void;
  onClose: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteMutation = useDeleteSaasDeal();

  if (!deal) {
    return (
      <NelvyonDsCard title="Detalle del deal">
        <p className="text-sm text-muted-foreground">
          Selecciona una tarjeta del kanban para ver el detalle de la oportunidad.
        </p>
      </NelvyonDsCard>
    );
  }

  const contact = deal.contactId ? contactsById.get(deal.contactId) : null;

  async function handleDelete() {
    if (!deal) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      await deleteMutation.mutateAsync(deal.id);
      setConfirmDelete(false);
      onDeleted();
    } catch {
      setConfirmDelete(false);
    }
  }

  return (
    <NelvyonDsCard title="Detalle del deal">
      <div className="space-y-3 text-sm">
        <div>
          <p className="text-lg font-semibold text-foreground">{deal.title}</p>
          <NelvyonDsBadge tone="primary" className="mt-1">
            {dealStageLabel(deal.stage)}
          </NelvyonDsBadge>
        </div>

        <dl className="grid gap-2">
          <div>
            <dt className="text-muted-foreground">Contacto</dt>
            <dd className="font-medium text-foreground">{contact?.name ?? "Sin contacto"}</dd>
            {contact?.company ? <dd className="text-muted-foreground">{contact.company}</dd> : null}
          </div>
          <div>
            <dt className="text-muted-foreground">Valor</dt>
            <dd className="font-medium text-foreground">{formatDealValue(deal.value, deal.currency)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Probabilidad</dt>
            <dd className="font-medium text-foreground">{deal.probability}%</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Cierre esperado</dt>
            <dd className="font-medium text-foreground">{deal.expectedCloseDate ?? "—"}</dd>
          </div>
          {deal.source ? (
            <div>
              <dt className="text-muted-foreground">Origen</dt>
              <dd className="font-medium text-foreground">{deal.source}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted-foreground">Notas</dt>
            <dd className="whitespace-pre-wrap text-foreground">{deal.notes?.trim() || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Actualizado</dt>
            <dd className="text-foreground">{formatDateTime(deal.updatedAt)}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          <NelvyonDsButton size="sm" onClick={() => onEdit(deal)}>
            Editar
          </NelvyonDsButton>
          <NelvyonDsButton
            size="sm"
            variant={confirmDelete ? "danger" : "secondary"}
            disabled={deleteMutation.isPending}
            onClick={() => void handleDelete()}
          >
            {deleteMutation.isPending
              ? "Eliminando…"
              : confirmDelete
                ? "Confirmar eliminar"
                : "Eliminar"}
          </NelvyonDsButton>
          {confirmDelete ? (
            <NelvyonDsButton size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </NelvyonDsButton>
          ) : null}
          <NelvyonDsButton size="sm" variant="ghost" onClick={onClose}>
            Cerrar
          </NelvyonDsButton>
        </div>

        {deleteMutation.isError ? (
          <p className="text-sm text-destructive">
            {deleteMutation.error instanceof Error ? deleteMutation.error.message : "No se pudo eliminar el deal."}
          </p>
        ) : null}
      </div>
    </NelvyonDsCard>
  );
}
