"use client";

import { useEffect, useState } from "react";

import { NelvyonDsButton, NelvyonDsCard } from "@/design-system/components";

import { CONTACT_STATUSES, PIPELINE_STAGES, contactStageLabel, contactStatusLabel } from "../labels";
import { useCreateSaasContact, useUpdateSaasContact } from "../hooks";
import type { SaasCrmContact } from "../types";

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";

type FormState = {
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  status: SaasCrmContact["status"];
  pipelineStage: SaasCrmContact["pipelineStage"];
  value: string;
  notes: string;
};

function emptyForm(): FormState {
  return {
    name: "",
    email: "",
    phone: "",
    company: "",
    position: "",
    status: "lead",
    pipelineStage: "new",
    value: "0",
    notes: "",
  };
}

function contactToForm(contact: SaasCrmContact): FormState {
  return {
    name: contact.name,
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    company: contact.company ?? "",
    position: contact.position ?? "",
    status: contact.status,
    pipelineStage: contact.pipelineStage,
    value: String(contact.value),
    notes: contact.notes ?? "",
  };
}

export function ContactFormModal({
  open,
  mode,
  contact,
  onClose,
  onSuccess,
}: {
  open: boolean;
  mode: "create" | "edit";
  contact?: SaasCrmContact | null;
  onClose: () => void;
  onSuccess?: (contact: SaasCrmContact) => void;
}) {
  const [form, setForm] = useState<FormState>(emptyForm());
  const [localError, setLocalError] = useState<string | null>(null);
  const createMutation = useCreateSaasContact();
  const updateMutation = useUpdateSaasContact();
  const saving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!open) return;
    setLocalError(null);
    setForm(mode === "edit" && contact ? contactToForm(contact) : emptyForm());
  }, [open, mode, contact]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setLocalError("El nombre es obligatorio.");
      return;
    }
    const value = Number(form.value);
    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      company: form.company.trim() || null,
      position: form.position.trim() || null,
      status: form.status,
      pipeline_stage: form.pipelineStage,
      value: Number.isFinite(value) ? value : 0,
      notes: form.notes.trim() || null,
    };
    try {
      if (mode === "edit" && contact) {
        const out = await updateMutation.mutateAsync({ contactId: contact.id, input: payload });
        onSuccess?.(out.contact);
      } else {
        const out = await createMutation.mutateAsync(payload);
        onSuccess?.(out.contact);
      }
      onClose();
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : "No se pudo guardar el contacto");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <NelvyonDsCard
        title={mode === "edit" ? "Editar contacto" : "Nuevo contacto"}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto"
      >
        <form className="space-y-3" onSubmit={(e) => void handleSubmit(e)}>
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Nombre *</span>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Email</span>
              <input
                className={inputClass}
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Teléfono</span>
              <input
                className={inputClass}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Empresa</span>
              <input
                className={inputClass}
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Cargo</span>
              <input
                className={inputClass}
                value={form.position}
                onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Estado</span>
              <select
                className={inputClass}
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value as SaasCrmContact["status"] }))
                }
              >
                {CONTACT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {contactStatusLabel(s)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Etapa</span>
              <select
                className={inputClass}
                value={form.pipelineStage}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    pipelineStage: e.target.value as SaasCrmContact["pipelineStage"],
                  }))
                }
              >
                {PIPELINE_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {contactStageLabel(s)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Valor (€)</span>
              <input
                className={inputClass}
                type="number"
                min={0}
                step="0.01"
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Notas</span>
            <textarea
              className={`${inputClass} min-h-[80px]`}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </label>
          {localError ? <p className="text-sm text-destructive">{localError}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <NelvyonDsButton type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving}>
              {saving ? "Guardando…" : mode === "edit" ? "Guardar" : "Crear contacto"}
            </NelvyonDsButton>
          </div>
        </form>
      </NelvyonDsCard>
    </div>
  );
}
