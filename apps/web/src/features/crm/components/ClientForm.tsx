"use client";

import React, { FormEvent, useId, useState } from "react";

import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { clientFormSchema } from "@/features/crm/schema";
import { ClientCreateInput } from "@/features/crm/types";

interface ClientFormProps {
  canSubmit: boolean;
  isSubmitting?: boolean;
  initialValues?: Partial<ClientCreateInput>;
  submitLabel?: string;
  onSubmit: (values: ClientCreateInput) => Promise<void> | void;
}

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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
    <PanelCard className="max-w-2xl">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor={`${id}-business_name`}>
            Nombre comercial
          </label>
          <input
            className={inputClass}
            id={`${id}-business_name`}
            onChange={(e) => setValues((prev) => ({ ...prev, business_name: e.target.value }))}
            placeholder="Ej. Acme Corp"
            required
            value={values.business_name}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor={`${id}-sector`}>
            Sector
          </label>
          <input
            className={inputClass}
            id={`${id}-sector`}
            onChange={(e) => setValues((prev) => ({ ...prev, sector: e.target.value }))}
            placeholder="Ej. SaaS, retail, servicios…"
            required
            value={values.sector}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor={`${id}-country`}>
              País
            </label>
            <input
              className={inputClass}
              id={`${id}-country`}
              onChange={(e) => setValues((prev) => ({ ...prev, country: e.target.value }))}
              placeholder="Opcional"
              value={values.country}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor={`${id}-city`}>
              Ciudad
            </label>
            <input
              className={inputClass}
              id={`${id}-city`}
              onChange={(e) => setValues((prev) => ({ ...prev, city: e.target.value }))}
              placeholder="Opcional"
              value={values.city}
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor={`${id}-website`}>
            Sitio web
          </label>
          <input
            className={inputClass}
            id={`${id}-website`}
            onChange={(e) => setValues((prev) => ({ ...prev, website_url: e.target.value }))}
            placeholder="https://"
            type="url"
            value={values.website_url}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {!canSubmit ? (
          <p className="text-sm text-warning-foreground">No tienes permiso para esta acción.</p>
        ) : null}
        <Button className="min-w-[10rem]" disabled={!canSubmit || isSubmitting} type="submit">
          {isSubmitting ? "Guardando…" : submitLabel}
        </Button>
      </form>
    </PanelCard>
  );
}
