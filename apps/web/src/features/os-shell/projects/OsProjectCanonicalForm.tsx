"use client";

import {
  OS_CANONICAL_PROJECT_PRIORITY_FORM_OPTIONS,
  OS_CANONICAL_PROJECT_STATUS_FORM_OPTIONS,
} from "@/features/os-shell/projects/projectStatus";
import { OsField, OsInput, OsSelect, OsTextarea } from "@/features/os-shell/components/ui/OsUi";
import type { OsClient } from "@/features/os-shell/clients/types";
import type { OsProjectCreateInput } from "@/features/os-shell/projects/types";

export function emptyOsProjectCanonicalForm(clientId = ""): OsProjectCreateInput {
  return {
    client_id: clientId,
    name: "",
    description: "",
    status: "draft",
    priority: "medium",
    start_date: "",
    due_date: "",
    budget: "",
  };
}

export function OsProjectCanonicalForm({
  value,
  onChange,
  clients,
  disabled,
  showStatus = true,
}: {
  value: OsProjectCreateInput;
  onChange: (next: OsProjectCreateInput) => void;
  clients: OsClient[];
  disabled?: boolean;
  showStatus?: boolean;
}) {
  const set = <K extends keyof OsProjectCreateInput>(key: K, v: OsProjectCreateInput[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <OsField label="Cliente *">
        <OsSelect
          required
          disabled={disabled || clients.length === 0}
          value={value.client_id || ""}
          onChange={(e) => set("client_id", e.target.value)}
        >
          <option value="">Seleccionar…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.business_name}
            </option>
          ))}
        </OsSelect>
      </OsField>
      <OsField label="Nombre *">
        <OsInput
          required
          disabled={disabled}
          value={value.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </OsField>
      {showStatus ? (
        <OsField label="Estado">
          <OsSelect
            disabled={disabled}
            value={value.status ?? "draft"}
            onChange={(e) => set("status", e.target.value as OsProjectCreateInput["status"])}
          >
            {OS_CANONICAL_PROJECT_STATUS_FORM_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </OsSelect>
        </OsField>
      ) : null}
      <OsField label="Prioridad">
        <OsSelect
          disabled={disabled}
          value={value.priority ?? "medium"}
          onChange={(e) => set("priority", e.target.value as OsProjectCreateInput["priority"])}
        >
          {OS_CANONICAL_PROJECT_PRIORITY_FORM_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </OsSelect>
      </OsField>
      <OsField label="Fecha inicio">
        <OsInput
          type="date"
          disabled={disabled}
          value={value.start_date ?? ""}
          onChange={(e) => set("start_date", e.target.value)}
        />
      </OsField>
      <OsField label="Fecha límite">
        <OsInput
          type="date"
          disabled={disabled}
          value={value.due_date ?? ""}
          onChange={(e) => set("due_date", e.target.value)}
        />
      </OsField>
      <OsField label="Presupuesto">
        <OsInput
          type="number"
          min={0}
          step="0.01"
          disabled={disabled}
          value={value.budget ?? ""}
          onChange={(e) => set("budget", e.target.value === "" ? "" : e.target.value)}
        />
      </OsField>
      <div className="md:col-span-2">
        <OsField label="Descripción">
          <OsTextarea
            disabled={disabled}
            value={value.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
          />
        </OsField>
      </div>
    </div>
  );
}
