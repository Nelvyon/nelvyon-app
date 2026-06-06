"use client";

import type { OsClientCreateInput, OsClientUpdateInput } from "./types";
import { OS_CLIENT_STATUS_OPTIONS } from "./clientStatus";
import { OsField, OsInput, OsSelect, OsTextarea } from "@/features/os-shell/components/ui/OsUi";

export function emptyOsClientForm(): OsClientCreateInput {
  return {
    business_name: "",
    sector: "",
    country: "",
    city: "",
    status: "active",
    contact_name: "",
    contact_email: "",
    website_url: "",
    value_proposition: "",
    objectives: "",
    ideal_customer: "",
    differentiator: "",
    services: "",
    market: "",
    language: "es",
    brand_tone: "",
    budget: "",
  };
}

export function OsClientForm({
  value,
  onChange,
  disabled,
  showStatus,
}: {
  value: OsClientCreateInput | OsClientUpdateInput;
  onChange: (next: OsClientCreateInput | OsClientUpdateInput) => void;
  disabled?: boolean;
  showStatus?: boolean;
}) {
  const set = (key: keyof OsClientCreateInput, v: string) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <OsField label="Nombre del negocio *">
        <OsInput
          required
          disabled={disabled}
          value={value.business_name ?? ""}
          onChange={(e) => set("business_name", e.target.value)}
        />
      </OsField>
      <OsField label="Sector">
        <OsInput
          disabled={disabled}
          value={value.sector ?? ""}
          onChange={(e) => set("sector", e.target.value)}
        />
      </OsField>
      <OsField label="Contacto">
        <OsInput
          disabled={disabled}
          value={value.contact_name ?? ""}
          onChange={(e) => set("contact_name", e.target.value)}
        />
      </OsField>
      <OsField label="Email contacto">
        <OsInput
          disabled={disabled}
          type="email"
          value={value.contact_email ?? ""}
          onChange={(e) => set("contact_email", e.target.value)}
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
          placeholder="https://…"
          value={value.website_url ?? ""}
          onChange={(e) => set("website_url", e.target.value)}
        />
      </OsField>
      <OsField label="Mercado">
        <OsInput disabled={disabled} value={value.market ?? ""} onChange={(e) => set("market", e.target.value)} />
      </OsField>
      {showStatus ? (
        <OsField label="Estado">
          <OsSelect
            disabled={disabled}
            value={value.status ?? "active"}
            onChange={(e) => onChange({ ...value, status: e.target.value as "active" | "archived" })}
          >
            {OS_CLIENT_STATUS_OPTIONS.filter((o) => o.value).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </OsSelect>
        </OsField>
      ) : null}
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
        <OsField label="Servicios">
          <OsTextarea
            disabled={disabled}
            value={value.services ?? ""}
            onChange={(e) => set("services", e.target.value)}
          />
        </OsField>
      </div>
      <div className="md:col-span-2">
        <OsField label="Objetivos / notas internas">
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
