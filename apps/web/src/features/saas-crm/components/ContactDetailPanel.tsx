"use client";

import { useState } from "react";

import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard } from "@/design-system/components";
import { SaasCan } from "@/features/saas-shell/components/SaasCan";

import {
  useAddSaasContactActivity,
  useDeleteSaasContact,
  useSaasCrmActivities,
  useSaasCrmContact,
} from "../hooks";
import { contactStageLabel, contactStatusLabel } from "../labels";
import type { ActivityType, SaasCrmContact } from "../types";
import { formatDealValue } from "@/features/saas-deals/stages";

const ACTIVITY_TYPES: ActivityType[] = ["note", "call", "email", "meeting", "task"];

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";

function formatDateTime(iso: string): string {
  const dt = new Date(iso);
  return Number.isNaN(dt.getTime()) ? iso : dt.toLocaleString("es-ES");
}

export function ContactDetailPanel({
  contactId,
  onEdit,
  onDeleted,
  onClose,
}: {
  contactId: string | null;
  onEdit: (contact: SaasCrmContact) => void;
  onDeleted: () => void;
  onClose: () => void;
}) {
  const detailQuery = useSaasCrmContact(contactId);
  const activitiesQuery = useSaasCrmActivities(contactId);
  const addActivity = useAddSaasContactActivity();
  const deleteContact = useDeleteSaasContact();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activityType, setActivityType] = useState<ActivityType>("note");
  const [activityText, setActivityText] = useState("");

  if (!contactId) {
    return (
      <NelvyonDsCard title="Detalle del contacto">
        <p className="text-sm text-muted-foreground">Selecciona un contacto de la lista para ver su ficha.</p>
      </NelvyonDsCard>
    );
  }

  const contact = detailQuery.data?.contact;
  const dealsContext = detailQuery.data?.dealsContext;

  async function handleAddActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!contactId || !activityText.trim()) return;
    await addActivity.mutateAsync({
      contactId,
      input: { activityType, description: activityText.trim(), completed: true },
    });
    setActivityText("");
  }

  async function handleDelete() {
    if (!contact) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await deleteContact.mutateAsync(contact.id);
    onDeleted();
  }

  if (detailQuery.isLoading) {
    return (
      <NelvyonDsCard title="Detalle del contacto">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </NelvyonDsCard>
    );
  }

  if (detailQuery.error || !contact) {
    return (
      <NelvyonDsCard title="Detalle del contacto">
        <p className="text-sm text-destructive">
          {detailQuery.error instanceof Error ? detailQuery.error.message : "Contacto no encontrado"}
        </p>
      </NelvyonDsCard>
    );
  }

  const fullContact: SaasCrmContact = {
    id: contact.id,
    tenantId: "",
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    company: contact.company,
    position: contact.position,
    status: contact.status,
    pipelineStage: contact.pipelineStage,
    value: contact.value,
    notes: contact.notes,
    tags: contact.tags ?? [],
    createdAt: "",
    updatedAt: "",
  };

  return (
    <NelvyonDsCard title={contact.name}>
      <div className="mb-3 flex justify-end">
        <NelvyonDsButton type="button" variant="ghost" size="sm" onClick={onClose}>
          Cerrar
        </NelvyonDsButton>
      </div>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <NelvyonDsBadge tone="neutral">{contactStatusLabel(contact.status)}</NelvyonDsBadge>
          <NelvyonDsBadge tone="neutral">{contactStageLabel(contact.pipelineStage)}</NelvyonDsBadge>
          <NelvyonDsBadge tone="primary">{formatDealValue(contact.value, "EUR")}</NelvyonDsBadge>
        </div>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {contact.email ? (
            <>
              <dt className="text-muted-foreground">Email</dt>
              <dd>{contact.email}</dd>
            </>
          ) : null}
          {contact.phone ? (
            <>
              <dt className="text-muted-foreground">Teléfono</dt>
              <dd>{contact.phone}</dd>
            </>
          ) : null}
          {contact.company ? (
            <>
              <dt className="text-muted-foreground">Empresa</dt>
              <dd>{contact.company}</dd>
            </>
          ) : null}
          {contact.position ? (
            <>
              <dt className="text-muted-foreground">Cargo</dt>
              <dd>{contact.position}</dd>
            </>
          ) : null}
        </dl>
        {contact.notes ? (
          <p className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            {contact.notes}
          </p>
        ) : null}

        {dealsContext && dealsContext.dealCount > 0 ? (
          <div className="rounded-md border border-border p-3 text-sm">
            <p className="font-medium">Oportunidades vinculadas</p>
            <p className="mt-1 text-muted-foreground">
              {dealsContext.dealCount} deal(s) · {formatDealValue(dealsContext.totalValue, "EUR")}
            </p>
          </div>
        ) : null}

        <SaasCan action="contacts.write">
          <div className="flex flex-wrap gap-2">
            <NelvyonDsButton type="button" size="sm" onClick={() => onEdit(fullContact)}>
              Editar
            </NelvyonDsButton>
            <NelvyonDsButton type="button" size="sm" variant="secondary" onClick={() => void handleDelete()}
              disabled={deleteContact.isPending}
            >
              {confirmDelete ? "Confirmar eliminar" : "Eliminar"}
            </NelvyonDsButton>
          </div>
        </SaasCan>

        <div className="border-t border-border pt-4">
          <p className="mb-2 text-sm font-medium">Actividad</p>
          <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
            {(activitiesQuery.data?.activity ?? dealsContext?.recentActivities ?? []).map((a) => (
              <li key={a.id} className="rounded-md border border-border/60 px-3 py-2">
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{a.activityType}</span>
                  <span>{formatDateTime(a.createdAt)}</span>
                </div>
                <p className="mt-1">{a.description}</p>
              </li>
            ))}
            {!activitiesQuery.isLoading &&
            (activitiesQuery.data?.activity ?? []).length === 0 &&
            (dealsContext?.recentActivities ?? []).length === 0 ? (
              <li className="text-muted-foreground">Sin actividad registrada.</li>
            ) : null}
          </ul>
          <SaasCan action="contacts.write">
            <form className="mt-3 space-y-2" onSubmit={(e) => void handleAddActivity(e)}>
              <select
                className={inputClass}
                value={activityType}
                onChange={(e) => setActivityType(e.target.value as ActivityType)}
              >
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <textarea
                className={`${inputClass} min-h-[72px]`}
                placeholder="Nueva nota o actividad…"
                value={activityText}
                onChange={(e) => setActivityText(e.target.value)}
              />
              <NelvyonDsButton type="submit" size="sm" disabled={addActivity.isPending || !activityText.trim()}>
                Añadir actividad
              </NelvyonDsButton>
            </form>
          </SaasCan>
        </div>
      </div>
    </NelvyonDsCard>
  );
}
