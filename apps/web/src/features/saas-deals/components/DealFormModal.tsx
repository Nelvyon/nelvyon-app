"use client";

import { useEffect, useState } from "react";

import { NelvyonDsButton, NelvyonDsCard } from "@/design-system/components";

import {
  type DealFormState,
  dealToFormState,
  emptyDealForm,
  formStateToCreatePayload,
  formStateToUpdatePayload,
  validateDealForm,
} from "../dealFormUtils";
import { useCreateSaasDeal, useUpdateSaasDeal } from "../hooks";
import { SAAS_DEAL_STAGES, dealStageLabel } from "../stages";
import type { SaasDeal } from "../types";

type ContactOption = { id: string; name: string; company: string | null };

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";

export function DealFormModal({
  open,
  mode,
  deal,
  presetContactId,
  contacts,
  onClose,
  onSuccess,
}: {
  open: boolean;
  mode: "create" | "edit";
  deal?: SaasDeal | null;
  presetContactId?: string | null;
  contacts: ContactOption[];
  onClose: () => void;
  onSuccess?: (deal: SaasDeal) => void;
}) {
  const [form, setForm] = useState<DealFormState>(emptyDealForm(presetContactId));
  const [localError, setLocalError] = useState<string | null>(null);

  const createMutation = useCreateSaasDeal();
  const updateMutation = useUpdateSaasDeal();

  const saving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!open) return;
    setLocalError(null);
    if (mode === "edit" && deal) {
      setForm(dealToFormState(deal));
    } else {
      setForm(emptyDealForm(presetContactId));
    }
  }, [open, mode, deal, presetContactId]);

  if (!open) return null;

  function patch<K extends keyof DealFormState>(key: K, value: DealFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setLocalError(null);
  }

  async function handleSubmit() {
    const validation = validateDealForm(form);
    if (!validation.valid) {
      setLocalError(validation.error ?? "Datos inválidos.");
      return;
    }

    try {
      if (mode === "edit" && deal) {
        const payload = formStateToUpdatePayload(form);
        const res = await updateMutation.mutateAsync({ dealId: deal.id, input: payload });
        onSuccess?.(res.deal);
      } else {
        const payload = formStateToCreatePayload(form);
        const res = await createMutation.mutateAsync(payload);
        onSuccess?.(res.deal);
      }
      onClose();
    } catch (e: unknown) {
      setLocalError(e instanceof Error ? e.message : "No se pudo guardar el deal.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <NelvyonDsCard className="max-h-[90vh] w-full max-w-lg overflow-y-auto">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-foreground">
            {mode === "edit" ? "Editar deal" : "Nuevo deal"}
          </h3>
          <NelvyonDsButton variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cerrar
          </NelvyonDsButton>
        </div>

        <div className="grid gap-3">
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Título *</span>
            <input
              className={inputClass}
              value={form.title}
              onChange={(e) => patch("title", e.target.value)}
              placeholder="Nombre de la oportunidad"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Contacto vinculado</span>
            <select
              className={inputClass}
              value={form.contact_id}
              onChange={(e) => patch("contact_id", e.target.value)}
            >
              <option value="">Sin contacto</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.company ? ` · ${c.company}` : ""}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Valor</span>
              <input
                className={inputClass}
                type="number"
                min={0}
                step="0.01"
                value={form.value}
                onChange={(e) => patch("value", e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Moneda</span>
              <select className={inputClass} value={form.currency} onChange={(e) => patch("currency", e.target.value)}>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Etapa</span>
              <select className={inputClass} value={form.stage} onChange={(e) => patch("stage", e.target.value as DealFormState["stage"])}>
                {SAAS_DEAL_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {dealStageLabel(s)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Probabilidad (%)</span>
              <input
                className={inputClass}
                type="number"
                min={0}
                max={100}
                value={form.probability}
                onChange={(e) => patch("probability", e.target.value)}
              />
            </label>
          </div>

          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Fecha esperada de cierre</span>
            <input
              className={inputClass}
              type="date"
              value={form.expected_close_date}
              onChange={(e) => patch("expected_close_date", e.target.value)}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Origen</span>
            <input
              className={inputClass}
              value={form.source}
              onChange={(e) => patch("source", e.target.value)}
              placeholder="web, referido, outbound…"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Notas</span>
            <textarea
              className={`${inputClass} min-h-[80px] resize-y`}
              value={form.notes}
              onChange={(e) => patch("notes", e.target.value)}
              placeholder="Contexto, próximos pasos…"
            />
          </label>

          {localError ? <p className="text-sm text-destructive">{localError}</p> : null}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <NelvyonDsButton variant="secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </NelvyonDsButton>
            <NelvyonDsButton onClick={() => void handleSubmit()} disabled={saving}>
              {saving ? "Guardando…" : mode === "edit" ? "Guardar cambios" : "Crear deal"}
            </NelvyonDsButton>
          </div>
        </div>
      </NelvyonDsCard>
    </div>
  );
}
