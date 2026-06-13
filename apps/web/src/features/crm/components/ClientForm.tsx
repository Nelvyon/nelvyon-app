"use client";

import React, { FormEvent, useId, useState } from "react";

import { Button } from "@/core/ui/button";
import { clientFormSchema } from "@/features/crm/schema";
import { ClientCreateInput } from "@/features/crm/types";

interface ClientFormProps {
  canSubmit: boolean;
  isSubmitting?: boolean;
  initialValues?: Partial<ClientCreateInput>;
  submitLabel?: string;
  onSubmit: (values: ClientCreateInput) => Promise<void> | void;
}

export function ClientForm({
  canSubmit,
  isSubmitting = false,
  initialValues,
  submitLabel = "Guardar cliente",
  onSubmit,
}: ClientFormProps) {
  const id = useId();
  const [values, setValues] = useState<ClientCreateInput>({
    business_name: initialValues?.business_name ?? "",
    sector: initialValues?.sector ?? "",
    country: initialValues?.country ?? "",
    city: initialValues?.city ?? "",
    website_url: initialValues?.website_url ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const parsed = clientFormSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los campos del formulario.");
      return;
    }
    await onSubmit(parsed.data);
  };

  return (
    <form className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card" onSubmit={handleSubmit}>
      <div>
        <label className="mb-1 block text-sm" htmlFor={`${id}-business_name`}>
          Nombre comercial
        </label>
        <input
          className="w-full rounded border px-2 py-1"
          id={`${id}-business_name`}
          onChange={(e) => setValues((prev) => ({ ...prev, business_name: e.target.value }))}
          value={values.business_name}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm" htmlFor={`${id}-sector`}>
          Sector
        </label>
        <input
          className="w-full rounded border px-2 py-1"
          id={`${id}-sector`}
          onChange={(e) => setValues((prev) => ({ ...prev, sector: e.target.value }))}
          value={values.sector}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm" htmlFor={`${id}-country`}>
            País
          </label>
          <input
            className="w-full rounded border px-2 py-1"
            id={`${id}-country`}
            onChange={(e) => setValues((prev) => ({ ...prev, country: e.target.value }))}
            value={values.country}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm" htmlFor={`${id}-city`}>
            Ciudad
          </label>
          <input
            className="w-full rounded border px-2 py-1"
            id={`${id}-city`}
            onChange={(e) => setValues((prev) => ({ ...prev, city: e.target.value }))}
            value={values.city}
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!canSubmit && (
        <p className="text-sm text-warning-foreground">No tienes permiso para esta acción.</p>
      )}
      <Button disabled={!canSubmit || isSubmitting} type="submit">
        {isSubmitting ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );
}
