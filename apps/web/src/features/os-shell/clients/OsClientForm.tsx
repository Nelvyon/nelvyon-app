"use client";

import type { OsClientWriteInput } from "./types";
import { OsField, OsInput, OsTextarea } from "@/features/os-shell/components/ui/OsUi";

export const emptyOsClientForm = (): OsClientWriteInput => ({
  business_name: "",
  sector: "",
  country: "",
  city: "",
  website_url: "",
  value_proposition: "",
  objectives: "",
  market: "",
  language: "es",
});

export function OsClientForm({
  value,
  onChange,
  disabled,
}: {
  value: OsClientWriteInput;
  onChange: (next: OsClientWriteInput) => void;
  disabled?: boolean;
}) {
  const set = (key: keyof OsClientWriteInput, v: string) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <OsField label="Nombre del negocio *">
        <OsInput
          required
          disabled={disabled}
          value={value.business_name}
          onChange={(e) => set("business_name", e.target.value)}
        />
      </OsField>
      <OsField label="Sector *">
        <OsInput
          required
          disabled={disabled}
          value={value.sector}
          onChange={(e) => set("sector", e.target.value)}
        />
      </OsField>
      <OsField label="País">
        <OsInput disabled={disabled} value={value.country ?? ""} onChange={(e) => set("country", e.target.value)} />
      </OsField>
      <OsField label="Ciudad">
        <OsInput disabled={disabled} value={value.city ?? ""} onChange={(e) => set("city", e.target.value)} />
      </OsField>
      <OsField label="Web">
        <OsInput
          disabled={disabled}
          type="url"
          value={value.website_url ?? ""}
          onChange={(e) => set("website_url", e.target.value)}
        />
      </OsField>
      <OsField label="Mercado">
        <OsInput disabled={disabled} value={value.market ?? ""} onChange={(e) => set("market", e.target.value)} />
      </OsField>
      <div className="md:col-span-2">
        <OsField label="Propuesta de valor">
          <OsTextarea
            disabled={disabled}
            value={value.value_proposition ?? ""}
            onChange={(e) => set("value_proposition", e.target.value)}
          />
        </OsField>
      </div>
      <div className="md:col-span-2">
        <OsField
          label="Notas / objetivos internos"
          hint="Campo objectives en nelvyon_clients (no hay columna notes en el modelo actual)."
        >
          <OsTextarea
            disabled={disabled}
            value={value.objectives ?? ""}
            onChange={(e) => set("objectives", e.target.value)}
          />
        </OsField>
      </div>
    </div>
  );
}
