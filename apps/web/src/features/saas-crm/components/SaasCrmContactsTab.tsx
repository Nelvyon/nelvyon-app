"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasCan } from "@/features/saas-shell/components/SaasCan";
import { SaasEmptyState } from "@/features/saas-shell/components/SaasEmptyState";
import { formatDealValue } from "@/features/saas-deals/stages";

import { ContactDetailPanel } from "./ContactDetailPanel";
import { ContactFormModal } from "./ContactFormModal";
import { useSaasCrmContacts, useSaasCrmPipeline } from "../hooks";
import { CONTACT_STATUSES, PIPELINE_STAGES, contactStageLabel, contactStatusLabel } from "../labels";
import type { ContactListFilters, SaasCrmContact } from "../types";

const inputClass =
  "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";

export function SaasCrmContactsTab({ readOnly }: { readOnly: boolean }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContactListFilters["status"] | "">("");
  const [stageFilter, setStageFilter] = useState<ContactListFilters["stage"] | "">("");
  const filters = useMemo<ContactListFilters>(
    () => ({
      search: search.trim() || undefined,
      status: statusFilter || undefined,
      stage: stageFilter || undefined,
    }),
    [search, statusFilter, stageFilter],
  );

  const contactsQuery = useSaasCrmContacts(filters);
  const pipelineQuery = useSaasCrmPipeline();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingContact, setEditingContact] = useState<SaasCrmContact | null>(null);

  const contacts = contactsQuery.data?.contacts ?? [];
  const pipeline = pipelineQuery.data?.pipeline ?? [];
  const hasContacts = contacts.length > 0;
  const showEmpty = !contactsQuery.isLoading && !contactsQuery.error && !hasContacts;

  function openCreate() {
    setFormMode("create");
    setEditingContact(null);
    setFormOpen(true);
  }

  function openEdit(contact: SaasCrmContact) {
    setFormMode("edit");
    setEditingContact(contact);
    setFormOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <NelvyonDsSectionHeader
          eyebrow="Contactos"
          title="Base de datos del tenant"
          subtitle="Datos reales de saas_contacts — sin demo ni workspace legacy."
        />
        <SaasCan action="contacts.write">
          <NelvyonDsButton type="button" onClick={openCreate} disabled={readOnly}>
            Nuevo contacto
          </NelvyonDsButton>
        </SaasCan>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {pipeline.map((item) => (
          <NelvyonDsCard key={item.stage} className="p-3">
            <p className="text-xs text-muted-foreground">{contactStageLabel(item.stage)}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{item.count}</p>
            <p className="text-xs text-muted-foreground">{formatDealValue(item.totalValue, "EUR")}</p>
          </NelvyonDsCard>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          aria-label="Buscar contactos"
          className={`${inputClass} min-w-[200px] flex-1`}
          placeholder="Buscar por nombre o email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Filtrar por estado"
          className={inputClass}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ContactListFilters["status"] | "")}
        >
          <option value="">Todos los estados</option>
          {CONTACT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {contactStatusLabel(s)}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por etapa"
          className={inputClass}
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value as ContactListFilters["stage"] | "")}
        >
          <option value="">Todas las etapas</option>
          {PIPELINE_STAGES.map((s) => (
            <option key={s} value={s}>
              {contactStageLabel(s)}
            </option>
          ))}
        </select>
      </div>

      {contactsQuery.error ? (
        <p className="text-sm text-destructive">
          {contactsQuery.error instanceof Error ? contactsQuery.error.message : "Error al cargar contactos"}
        </p>
      ) : null}

      {showEmpty ? (
        <SaasEmptyState
          title="Sin contactos todavía"
          description="Crea el primer contacto para tu tenant. Los datos se guardan en Postgres vía /api/saas/crm."
          action={
            <SaasCan action="contacts.write">
              <NelvyonDsButton type="button" onClick={openCreate} disabled={readOnly}>
                Crear primer contacto
              </NelvyonDsButton>
            </SaasCan>
          }
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <NelvyonDsCard title="Listado" className="overflow-hidden p-0">
          {contactsQuery.isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Cargando contactos…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Empresa</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Etapa</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr
                      key={c.id}
                      className={`cursor-pointer border-b border-border/60 hover:bg-muted/30 ${
                        selectedId === c.id ? "bg-primary/5" : ""
                      }`}
                      onClick={() => setSelectedId(c.id)}
                    >
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.company ?? "—"}</td>
                      <td className="px-4 py-3">
                        <NelvyonDsBadge tone="neutral">{contactStatusLabel(c.status)}</NelvyonDsBadge>
                      </td>
                      <td className="px-4 py-3">{contactStageLabel(c.pipelineStage)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatDealValue(c.value, "EUR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </NelvyonDsCard>

        <ContactDetailPanel
          contactId={selectedId}
          onEdit={openEdit}
          onDeleted={() => setSelectedId(null)}
          onClose={() => setSelectedId(null)}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        ¿Buscas el módulo Revenue del workspace?{" "}
        <Link className="text-primary hover:underline" href="/crm">
          Abrir /crm legacy
        </Link>
      </p>

      <ContactFormModal
        open={formOpen}
        mode={formMode}
        contact={editingContact}
        onClose={() => setFormOpen(false)}
        onSuccess={(c) => setSelectedId(c.id)}
      />
    </div>
  );
}
