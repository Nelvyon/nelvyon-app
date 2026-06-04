"use client";

import { OS_PROJECT_STATUS_OPTIONS, OS_PROJECT_TYPE_OPTIONS } from "@/features/os-shell/constants";
import { OsField, OsInput, OsSelect, OsTextarea } from "@/features/os-shell/components/ui/OsUi";
import type { OsClient } from "@/features/os-shell/clients/types";

import type { OsProjectWriteInput } from "./types";

export function emptyOsProjectForm(clientId = 0): OsProjectWriteInput {
  return {
    client_id: clientId,
    name: "",
    project_type: "web",
    status: "draft",
    progress: 0,
    brief: "",
    priority: "normal",
  };
}

export function OsProjectForm({
  value,
  onChange,
  clients,
  disabled,
}: {
  value: OsProjectWriteInput;
  onChange: (next: OsProjectWriteInput) => void;
  clients: OsClient[];
  disabled?: boolean;
}) {
  const set = <K extends keyof OsProjectWriteInput>(key: K, v: OsProjectWriteInput[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <OsField label="Cliente *">
        <OsSelect
          required
          disabled={disabled || clients.length === 0}
          value={value.client_id || ""}
          onChange={(e) => set("client_id", Number(e.target.value))}
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
      <OsField label="Tipo *">
        <OsSelect
          disabled={disabled}
          value={value.project_type}
          onChange={(e) => set("project_type", e.target.value)}
        >
          {OS_PROJECT_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </OsSelect>
      </OsField>
      <OsField label="Estado">
        <OsSelect
          disabled={disabled}
          value={value.status ?? ""}
          onChange={(e) => set("status", e.target.value)}
        >
          {OS_PROJECT_STATUS_OPTIONS.filter((o) => o.value).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </OsSelect>
      </OsField>
      <OsField label="Progreso %">
        <OsInput
          type="number"
          min={0}
          max={100}
          disabled={disabled}
          value={value.progress ?? 0}
          onChange={(e) => set("progress", Number(e.target.value))}
        />
      </OsField>
      <OsField label="Prioridad">
        <OsInput
          disabled={disabled}
          value={value.priority ?? ""}
          onChange={(e) => set("priority", e.target.value)}
        />
      </OsField>
      <OsField label="Deadline">
        <OsInput
          disabled={disabled}
          value={value.deadline ?? ""}
          onChange={(e) => set("deadline", e.target.value)}
        />
      </OsField>
      <div className="md:col-span-2">
        <OsField label="Brief">
          <OsTextarea
            disabled={disabled}
            value={value.brief ?? ""}
            onChange={(e) => set("brief", e.target.value)}
          />
        </OsField>
      </div>
    </div>
  );
}
